///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController } from 'idea-aws';

import { Topic } from '../models/topic.model';
import { User } from '../models/user.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const PROJECT = process.env.PROJECT;
const DDB_TABLES = {
  topics: process.env.DDB_TABLE_topics,
  categories: process.env.DDB_TABLE_categories,
  events: process.env.DDB_TABLE_events
};
const ddb = new DynamoDB();

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
    const res: Topic[] = await ddb.scan({ TableName: DDB_TABLES.topics });
    return res
      .map(x => new Topic(x))
      .filter(x => !x.archivedAt)
      .sort((a, b): number => a.name.localeCompare(b.name));
  }

  private async putSafeResource(opts: { noOverwrite: boolean }): Promise<Topic> {
    const errors = this.topic.validate();
    if (errors.length) throw new RCError(`Invalid fields: ${errors.join(', ')}`);

    const putParams: any = { TableName: DDB_TABLES.topics, Item: this.topic };
    if (opts.noOverwrite) putParams.ConditionExpression = 'attribute_not_exists(topicId)';
    await ddb.put(putParams);

    return this.topic;
  }

  protected async postResources(): Promise<Topic> {
    if (!this.galaxyUser.isAdministrator()) throw new RCError('Unauthorized');

    this.topic = new Topic(this.body);
    this.topic.topicId = await ddb.IUNID(PROJECT);

    return await this.putSafeResource({ noOverwrite: true });
  }

  protected async getResource(): Promise<Topic> {
    return this.topic;
  }

  protected async putResource(): Promise<Topic> {
    if (!this.galaxyUser.isAdministrator()) throw new RCError('Unauthorized');

    const oldTopic = new Topic(this.topic);
    this.topic.safeLoad(this.body, oldTopic);

    return await this.putSafeResource({ noOverwrite: false });
  }

  protected async deleteResource(): Promise<void> {
    if (!this.galaxyUser.isAdministrator()) throw new RCError('Unauthorized');

    this.topic.archivedAt = new Date().toISOString();
    await this.putSafeResource({ noOverwrite: false });
  }
}
