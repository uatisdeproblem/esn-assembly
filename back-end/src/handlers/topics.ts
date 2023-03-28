///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController, S3 } from 'idea-aws';
import { SignedURL } from 'idea-toolbox';
import { TopicCategoryAttached } from '../models/category.model';
import { TopicEventAttached } from '../models/event.model';

import { RelatedTopic, Topic } from '../models/topic.model';
import { User } from '../models/user.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const PROJECT = process.env.PROJECT;
const DDB_TABLES = {
  topics: process.env.DDB_TABLE_topics,
  relatedTopics: process.env.DDB_TABLE_relatedTopics,
  categories: process.env.DDB_TABLE_categories,
  events: process.env.DDB_TABLE_events
};
const ddb = new DynamoDB();

const S3_BUCKET_MEDIA = process.env.S3_BUCKET_MEDIA;
const S3_ATTACHMENTS_FOLDER = process.env.S3_ATTACHMENTS_FOLDER;
const s3 = new S3();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new Topics(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class Topics extends ResourceController {
  galaxyUser: User;
  topic: Topic;

  constructor(event: any, callback: any) {
    super(event, callback, { resourceId: 'topicId' });
    this.galaxyUser = new User(event.requestContext.authorizer.lambda.user);
  }

  protected async checkAuthBeforeRequest(): Promise<void> {
    if (!this.resourceId) return;

    try {
      this.topic = new Topic(await ddb.get({ TableName: DDB_TABLES.topics, Key: { topicId: this.resourceId } }));
    } catch (err) {
      throw new RCError('Topic not found');
    }
  }

  protected async getResources(): Promise<Topic[]> {
    let topics: Topic[] = await ddb.scan({ TableName: DDB_TABLES.topics });
    topics = topics.map(x => new Topic(x));

    if (!this.galaxyUser.isAdministrator) topics = topics.filter(x => !x.isDraft);

    if (this.queryParams.archived !== undefined) {
      const archived = this.queryParams.archived !== 'false';
      topics = topics.filter(x => (archived ? x.isArchived() : !x.isArchived()));
    }
    if (this.queryParams.categoryId) topics = topics.filter(x => x.category.categoryId === this.queryParams.categoryId);
    if (this.queryParams.eventId) topics = topics.filter(x => x.event.eventId === this.queryParams.eventId);

    return topics.sort((a, b): number => b.createdAt.localeCompare(a.createdAt));
  }

  private async putSafeResource(opts: { noOverwrite: boolean }): Promise<Topic> {
    const errors = this.topic.validate();
    if (errors.length) throw new RCError(`Invalid fields: ${errors.join(', ')}`);

    try {
      this.topic.category = new TopicCategoryAttached(
        await ddb.get({ TableName: DDB_TABLES.categories, Key: { categoryId: this.topic.category.categoryId } })
      );
    } catch (error) {
      throw new RCError('Category not found');
    }

    try {
      this.topic.event = new TopicEventAttached(
        await ddb.get({ TableName: DDB_TABLES.events, Key: { eventId: this.topic.event.eventId } })
      );
    } catch (error) {
      throw new RCError('Event not found');
    }

    const putParams: any = { TableName: DDB_TABLES.topics, Item: this.topic };
    if (opts.noOverwrite) putParams.ConditionExpression = 'attribute_not_exists(topicId)';
    else this.topic.updatedAt = new Date().toISOString();

    await ddb.put(putParams);

    return this.topic;
  }

  protected async postResources(): Promise<Topic> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    this.topic = new Topic(this.body);
    this.topic.topicId = await ddb.IUNID(PROJECT);

    return await this.putSafeResource({ noOverwrite: true });
  }

  protected async patchResources(): Promise<SignedURL> {
    switch (this.body.action) {
      case 'GET_ATTACHMENT_UPLOAD_URL':
        return await this.getSignedURLToUploadAttachment();
      case 'GET_ATTACHMENT_DOWNLOAD_URL':
        return await this.getSignedURLToDownloadAttachment();
      default:
        throw new RCError('Unsupported action');
    }
  }
  private async getSignedURLToUploadAttachment(): Promise<SignedURL> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    const attachmentId = await ddb.IUNID(PROJECT.concat('-attachment'));

    const key = `${S3_ATTACHMENTS_FOLDER}/${attachmentId}.png`;
    const signedURL = s3.signedURLPut(S3_BUCKET_MEDIA, key);
    signedURL.id = attachmentId;

    return signedURL;
  }
  private async getSignedURLToDownloadAttachment(): Promise<SignedURL> {
    const { attachmentId } = this.body;
    if (!attachmentId) throw new RCError('Missing attachment ID');

    const key = `${S3_ATTACHMENTS_FOLDER}/${attachmentId}.png`;
    const signedURL = s3.signedURLGet(S3_BUCKET_MEDIA, key);

    return signedURL;
  }

  protected async getResource(): Promise<Topic> {
    if (this.topic.isDraft && !this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');
    return this.topic;
  }

  protected async putResource(): Promise<Topic> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    const oldTopic = new Topic(this.topic);
    this.topic.safeLoad(this.body, oldTopic);

    return await this.putSafeResource({ noOverwrite: false });
  }

  protected async patchResource(): Promise<Topic> {
    switch (this.body.action) {
      case 'OPEN':
        return await this.manageStatus(true);
      case 'CLOSE':
        return await this.manageStatus(false);
      case 'ARCHIVE':
        return await this.manageArchive(true);
      case 'UNARCHIVE':
        return await this.manageArchive(false);
      default:
        throw new RCError('Unsupported action');
    }
  }
  private async manageStatus(open: boolean): Promise<Topic> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    if (open) delete this.topic.closedAt;
    else this.topic.closedAt = new Date().toISOString();

    await ddb.put({ TableName: DDB_TABLES.topics, Item: this.topic });
    return this.topic;
  }
  private async manageArchive(archive: boolean): Promise<Topic> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    if (archive) {
      this.topic.archivedAt = new Date().toISOString();
      if (!this.topic.closedAt) this.topic.closedAt = this.topic.archivedAt;
    } else delete this.topic.archivedAt;

    await ddb.put({ TableName: DDB_TABLES.topics, Item: this.topic });
    return this.topic;
  }

  protected async deleteResource(): Promise<void> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    const topics: RelatedTopic[] = await ddb.query({
      TableName: DDB_TABLES.relatedTopics,
      KeyConditionExpression: 'topicA = :topicId',
      ExpressionAttributeValues: { ':topicId': this.topic.topicId }
    });
    if (topics.length > 0) throw new RCError('Unlink related topics first');

    await ddb.delete({ TableName: DDB_TABLES.topics, Key: { topicId: this.topic.topicId } });
  }
}
