///
/// IMPORTS
///

import { DynamoDB, GetObjectTypes, RCError, ResourceController, S3, SES } from 'idea-aws';

import { Configurations, EmailTemplates } from '../models/configurations.model';
import { User } from '../models/user.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const PROJECT = process.env.PROJECT;
const STAGE = process.env.STAGE;
const DDB_TABLES = { configurations: process.env.DDB_TABLE_configurations };
const ddb = new DynamoDB();

const BASE_URL = STAGE === 'prod' ? 'https://ga.esn.org' : 'https://dev.esn-ga.link';
const SES_CONFIG = {
  sourceName: 'ESN General Assembly app',
  source: process.env.SES_SOURCE_ADDRESS,
  sourceArn: process.env.SES_IDENTITY_ARN,
  region: process.env.SES_REGION
};
const TEST_EMAIL_EXAMPLE_TOPIC = 'Amazing candidacy';
const TEST_EMAIL_EXAMPLE_QUESTION = 'An awesome question';
const TEST_EMAIL_EXAMPLE_OPPORTUNITY = 'An incredible opportunity';
const TEST_EMAIL_EXAMPLE_URL = BASE_URL;
const TEST_EMAIL_EXAMPLE_MESSAGE = 'A custom message';
const ses = new SES();

const s3 = new S3();
const S3_BUCKET_MEDIA = process.env.S3_BUCKET_MEDIA;
const S3_ASSETS_FOLDER = process.env.S3_ASSETS_FOLDER;

export const handler = (ev: any, _: any, cb: any): Promise<void> => new ConfigurationsRC(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class ConfigurationsRC extends ResourceController {
  galaxyUser: User;
  configurations: Configurations;

  constructor(event: any, callback: any) {
    super(event, callback);
    this.galaxyUser = new User(event.requestContext.authorizer.lambda.user);
  }

  protected async checkAuthBeforeRequest(): Promise<void> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    try {
      this.configurations = new Configurations(
        await ddb.get({ TableName: DDB_TABLES.configurations, Key: { PK: PROJECT } })
      );
    } catch (err) {
      throw new RCError('Configurations not found');
    }
  }

  protected async getResources(): Promise<Configurations> {
    return this.configurations;
  }

  protected async putResources(): Promise<Configurations> {
    this.configurations = new Configurations({ ...this.body, PK: PROJECT });

    const errors = this.configurations.validate();
    if (errors.length) throw new RCError(`Invalid fields: ${errors.join(', ')}`);

    await ddb.put({ TableName: DDB_TABLES.configurations, Item: this.configurations });

    return this.configurations;
  }

  protected async patchResources(): Promise<{ subject: string; content: string } | void> {
    switch (this.body.action) {
      case 'GET_EMAIL_TEMPLATE':
        return await this.getEmailTemplate(this.body.template);
      case 'SET_EMAIL_TEMPLATE':
        return await this.setEmailTemplate(this.body.template, this.body.subject, this.body.content);
      case 'RESET_EMAIL_TEMPLATE':
        return await this.resetEmailTemplate(this.body.template);
      case 'TEST_EMAIL_TEMPLATE':
        return await this.testEmailTemplate(this.body.template);
      default:
        throw new RCError('Unsupported action');
    }
  }
  private getSESTemplateName(emailTemplate: EmailTemplates): string {
    switch (emailTemplate) {
      case EmailTemplates.QUESTIONS:
        return 'notify-new-question';
      case EmailTemplates.ANSWERS:
        return 'notify-new-answer';
      case EmailTemplates.APPLICATION_APPROVED:
        return 'notify-application-approved';
      case EmailTemplates.APPLICATION_REJECTED:
        return 'notify-application-rejected';
      default:
        throw new RCError("Template doesn't exist");
    }
  }
  private async getEmailTemplate(emailTemplate: EmailTemplates): Promise<{ subject: string; content: string }> {
    const templateName = this.getSESTemplateName(emailTemplate);
    try {
      const template = await ses.getTemplate(`${templateName}-${STAGE}`);
      return { subject: template.Subject, content: template.Html };
    } catch (error) {
      await this.resetEmailTemplate(emailTemplate); // creation
      const template = await ses.getTemplate(`${templateName}-${STAGE}`);
      return { subject: template.Subject, content: template.Html };
    }
  }
  private async setEmailTemplate(emailTemplate: EmailTemplates, subject: string, content: string): Promise<void> {
    if (!subject) throw new RCError('Missing subject');
    if (!content) throw new RCError('Missing content');

    const templateName = this.getSESTemplateName(emailTemplate);
    await ses.setTemplate(`${templateName}-${STAGE}`, subject, content, true);
  }
  private async testEmailTemplate(emailTemplate: EmailTemplates): Promise<void> {
    const toAddresses = [this.galaxyUser.email];
    const templateName = this.getSESTemplateName(emailTemplate);
    const templateData = {
      user: `${this.galaxyUser.firstName} ${this.galaxyUser.lastName}`,
      topic: TEST_EMAIL_EXAMPLE_TOPIC,
      question: TEST_EMAIL_EXAMPLE_QUESTION,
      opportunity: TEST_EMAIL_EXAMPLE_OPPORTUNITY,
      url: TEST_EMAIL_EXAMPLE_URL,
      message: TEST_EMAIL_EXAMPLE_MESSAGE
    };

    try {
      await ses.testTemplate(`${templateName}-${STAGE}`, templateData);
    } catch (error) {
      this.logger.warn('Elaborating template', error, { template: `${templateName}-${STAGE}` });
      throw new RCError('Bad template');
    }

    try {
      await ses.sendTemplatedEmail({ toAddresses, template: `${templateName}-${STAGE}`, templateData }, SES_CONFIG);
    } catch (error) {
      this.logger.warn('Sending template', error, { template: `${templateName}-${STAGE}` });
      throw new RCError('Sending failed');
    }
  }
  private async resetEmailTemplate(emailTemplate: EmailTemplates): Promise<void> {
    const templateName = this.getSESTemplateName(emailTemplate);
    const content = (await s3.getObject({
      bucket: S3_BUCKET_MEDIA,
      key: S3_ASSETS_FOLDER.concat('/', templateName, '.hbs'),
      type: GetObjectTypes.TEXT
    })) as string;
    await ses.setTemplate(`${templateName}-${STAGE}`, templateName, content, true);
  }
}
