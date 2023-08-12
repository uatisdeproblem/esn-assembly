///
/// IMPORTS
///

import { DynamoDB, GetObjectTypes, RCError, ResourceController, S3, SES } from 'idea-aws';

import { Configurations } from '../models/configurations.model';
import { User } from '../models/user.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const PROJECT = process.env.PROJECT;
const STAGE = process.env.STAGE;
const DDB_TABLES = { configurations: process.env.DDB_TABLE_configurations };
const ddb = new DynamoDB();

const BASE_URL = STAGE === 'prod' ? 'https://qa.esn.org' : 'https://dev.esn-ga.link';
const SES_CONFIG = {
  sourceName: 'ESN General Assembly app',
  source: process.env.SES_SOURCE_ADDRESS,
  sourceArn: process.env.SES_IDENTITY_ARN,
  region: process.env.SES_REGION
};
const TEST_EMAIL_EXAMPLE_TOPIC = 'Amazing candidacy';
const TEST_EMAIL_EXAMPLE_QUESTION = 'An awesome question';
const TEST_EMAIL_EXAMPLE_URL = BASE_URL;
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
      case 'GET_EMAIL_TEMPLATE_QUESTIONS':
        return await this.getEmailTemplate('notify-new-question');
      case 'SET_EMAIL_TEMPLATE_QUESTIONS':
        return await this.setEmailTemplate('notify-new-question', this.body.subject, this.body.content);
      case 'RESET_EMAIL_TEMPLATE_QUESTIONS':
        return await this.resetEmailTemplate('notify-new-question');
      case 'TEST_EMAIL_TEMPLATE_QUESTIONS':
        return await this.testEmailTemplate('notify-new-question');
      case 'GET_EMAIL_TEMPLATE_ANSWERS':
        return await this.getEmailTemplate('notify-new-answer');
      case 'SET_EMAIL_TEMPLATE_ANSWERS':
        return await this.setEmailTemplate('notify-new-answer', this.body.subject, this.body.content);
      case 'RESET_EMAIL_TEMPLATE_ANSWERS':
        return await this.resetEmailTemplate('notify-new-answer');
      case 'TEST_EMAIL_TEMPLATE_ANSWERS':
        return await this.testEmailTemplate('notify-new-answer');
      default:
        throw new RCError('Unsupported action');
    }
  }
  private async getEmailTemplate(emailTemplate: string): Promise<{ subject: string; content: string }> {
    try {
      const template = await ses.getTemplate(`${emailTemplate}-${STAGE}`);
      return { subject: template.Subject, content: template.Html };
    } catch (error) {
      throw new RCError('Template not found');
    }
  }
  private async setEmailTemplate(emailTemplate: string, subject: string, content: string): Promise<void> {
    if (!subject) throw new RCError('Missing subject');
    if (!content) throw new RCError('Missing content');

    await ses.setTemplate(`${emailTemplate}-${STAGE}`, subject, content, true);
  }
  private async testEmailTemplate(emailTemplate: string): Promise<void> {
    const toAddresses = [this.galaxyUser.email];
    const template = `${emailTemplate}-${STAGE}`;
    const templateData = {
      user: `${this.galaxyUser.firstName} ${this.galaxyUser.lastName}`,
      topic: TEST_EMAIL_EXAMPLE_TOPIC,
      question: TEST_EMAIL_EXAMPLE_QUESTION,
      url: TEST_EMAIL_EXAMPLE_URL
    };

    try {
      await ses.testTemplate(template, templateData);
    } catch (error) {
      this.logger.warn('Elaborating template', error, { template });
      throw new RCError('Bad template');
    }

    try {
      await ses.sendTemplatedEmail({ toAddresses, template, templateData }, SES_CONFIG);
    } catch (error) {
      this.logger.warn('Sending template', error, { template });
      throw new RCError('Sending failed');
    }
  }
  private async resetEmailTemplate(emailTemplate: string): Promise<void> {
    const subject = `${emailTemplate}-${STAGE}`;
    const content = (await s3.getObject({
      bucket: S3_BUCKET_MEDIA,
      key: S3_ASSETS_FOLDER.concat('/', emailTemplate, '.hbs'),
      type: GetObjectTypes.TEXT
    })) as string;
    await ses.setTemplate(`${emailTemplate}-${STAGE}`, subject, content, true);
  }
}
