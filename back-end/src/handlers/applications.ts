///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController, S3 } from 'idea-aws';
import { SignedURL } from 'idea-toolbox';

import { Application, ApplicationStatuses } from '../models/application.model';
import { Opportunity } from '../models/opportunity.model';
import { User } from '../models/user.model';
import { Subject } from '../models/subject.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const PROJECT = process.env.PROJECT;
const DDB_TABLES = {
  applications: process.env.DDB_TABLE_applications,
  opportunities: process.env.DDB_TABLE_opportunities
};
const ddb = new DynamoDB();

const ATTACHMENTS_PREFIX = PROJECT.concat('-application-attachment');
const S3_BUCKET_MEDIA = process.env.S3_BUCKET_MEDIA;
const S3_ATTACHMENTS_FOLDER = process.env.S3_ATTACHMENTS_FOLDER;
const s3 = new S3();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new ApplicationsRC(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class ApplicationsRC extends ResourceController {
  galaxyUser: User;
  opportunity: Opportunity;
  application: Application;

  constructor(event: any, callback: any) {
    super(event, callback, { resourceId: 'applicationId' });
    this.galaxyUser = new User(event.requestContext.authorizer.lambda.user);
  }

  protected async checkAuthBeforeRequest(): Promise<void> {
    const { opportunityId } = this.pathParameters;

    try {
      this.opportunity = new Opportunity(
        await ddb.get({ TableName: DDB_TABLES.opportunities, Key: { opportunityId } })
      );
    } catch (err) {
      throw new RCError('Opportunity not found');
    }

    if (!this.resourceId) return;

    try {
      this.application = new Application(
        await ddb.get({ TableName: DDB_TABLES.applications, Key: { opportunityId, applicationId: this.resourceId } })
      );
    } catch (err) {
      throw new RCError('Application not found');
    }

    if (!this.galaxyUser.canManageOpportunities && this.application.userId !== this.galaxyUser.userId)
      throw new RCError('Unauthorized');
  }

  protected async getResources(): Promise<Application[]> {
    let applications: Application[] = await ddb.query({
      TableName: DDB_TABLES.applications,
      KeyConditionExpression: 'opportunityId = :opportunityId',
      ExpressionAttributeValues: { ':opportunityId': this.opportunity.opportunityId }
    });
    applications = applications.map(x => new Application(x));

    if (!this.galaxyUser.canManageOpportunities) applications.filter(x => x.userId === this.galaxyUser.userId);

    return applications.sort((a, b): number => b.createdAt.localeCompare(a.createdAt));
  }

  protected async patchResources(): Promise<SignedURL> {
    switch (this.body.action) {
      case 'GET_ATTACHMENT_UPLOAD_URL':
        return await this.getSignedURLToUploadAttachment();
      default:
        throw new RCError('Unsupported action');
    }
  }
  private async getSignedURLToUploadAttachment(): Promise<SignedURL> {
    const attachmentId = await ddb.IUNID(ATTACHMENTS_PREFIX);

    const key = `${S3_ATTACHMENTS_FOLDER}/${attachmentId}-${this.galaxyUser.userId}`;
    const signedURL = await s3.signedURLPut(S3_BUCKET_MEDIA, key);
    signedURL.id = attachmentId;

    return signedURL;
  }

  protected async postResources(): Promise<Application> {
    if (this.opportunity.isClosed()) throw new RCError('Opportunity is closed');

    const userApplications = (await this.getResources()).filter(x => x.userId === this.galaxyUser.userId);
    if (userApplications.length) throw new RCError('Can apply only once');

    const { motivation, attachments } = this.body;
    this.application = new Application({ motivation, attachments });
    this.application.opportunityId = this.opportunity.opportunityId;
    this.application.applicationId = await ddb.IUNID(PROJECT);
    this.application.userId = this.galaxyUser.userId;
    this.application.subject = Subject.fromUser(this.galaxyUser);
    this.application.createdAt = new Date().toISOString();

    const errors = this.application.validate(this.opportunity);
    if (errors.length) throw new RCError(`Invalid fields: ${errors.join(', ')}`);

    await ddb.put({
      TableName: DDB_TABLES.applications,
      Item: this.application,
      ConditionExpression: 'attribute_not_exists(opportunityId) AND attribute_not_exists(applicationId)'
    });

    await this.updateCountersOfOpportunity();

    return this.application;
  }

  protected async putResource(): Promise<Application> {
    if (this.opportunity.isArchived()) throw new RCError('Opportunity is archived');
    if (!this.galaxyUser.canManageOpportunities && this.opportunity.isClosed())
      throw new Error('Opportunity is closed');
    if (!this.galaxyUser.canManageOpportunities && this.application.getStatus() !== ApplicationStatuses.REJECTED)
      throw new Error('Only rejected applications can be fixed');

    const oldApplication = new Application(this.application);
    this.application.safeLoad(this.body, oldApplication);

    const errors = this.application.validate(this.opportunity);
    if (errors.length) throw new RCError(`Invalid fields: ${errors.join(', ')}`);

    delete this.application.rejectedAt;
    this.application.updatedAt = new Date().toISOString();

    await ddb.put({ TableName: DDB_TABLES.applications, Item: this.application });

    return this.application;
  }

  protected async patchResource(): Promise<SignedURL> {
    switch (this.body.action) {
      case 'GET_ATTACHMENT_DOWNLOAD_URL':
        return await this.getSignedURLToDownloadAttachmentByExpectedName(this.body.name);
      default:
        throw new RCError('Unsupported action');
    }
  }
  private async getSignedURLToDownloadAttachmentByExpectedName(expectedName: string): Promise<SignedURL> {
    const attachment = this.application.attachments[expectedName];
    if (!attachment || !attachment.attachmentId.startsWith(ATTACHMENTS_PREFIX)) throw new RCError('Not found');

    // further permissions check to access private attachment
    const userId = this.galaxyUser.canManageOpportunities ? this.application.userId : this.galaxyUser.userId;

    const key = `${S3_ATTACHMENTS_FOLDER}/${attachment.attachmentId}-${userId}`;
    return await s3.signedURLGet(S3_BUCKET_MEDIA, key);
  }

  protected async deleteResource(): Promise<void> {
    if (this.opportunity.isArchived()) throw new RCError('Opportunity is archived');
    if (!this.galaxyUser.canManageOpportunities && this.opportunity.isClosed())
      throw new Error('Opportunity is closed');

    await ddb.delete({
      TableName: DDB_TABLES.applications,
      Key: { opportunityId: this.opportunity.opportunityId, applicationId: this.application.applicationId }
    });

    await this.updateCountersOfOpportunity();
  }

  private async updateCountersOfOpportunity(): Promise<void> {
    try {
      const applicationsToOpportunity = await ddb.query({
        TableName: DDB_TABLES.applications,
        KeyConditionExpression: 'opportunityId = :opportunityId',
        ExpressionAttributeValues: { ':opportunityId': this.opportunity.opportunityId },
        ProjectionExpression: 'applicationId'
      });

      await ddb.update({
        TableName: DDB_TABLES.opportunities,
        Key: { opportunityId: this.opportunity.opportunityId },
        UpdateExpression: 'SET numOfApplications = :num',
        ExpressionAttributeValues: { ':num': applicationsToOpportunity.length }
      });
    } catch (error) {
      this.logger.warn('Counters not updated', error, { opportunityId: this.opportunity.opportunityId });
    }
  }
}
