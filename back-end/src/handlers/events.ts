///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController } from 'idea-aws';

import { TopicEvent } from '../models/event.model';
import { Topic } from '../models/topic.model';
import { User } from '../models/user.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const PROJECT = process.env.PROJECT;
const DDB_TABLES = { events: process.env.DDB_TABLE_events, topics: process.env.DDB_TABLE_topics };
const ddb = new DynamoDB();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new TopicEvents(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class TopicEvents extends ResourceController {
  galaxyUser: User;
  topicEvent: TopicEvent;

  constructor(event: any, callback: any) {
    super(event, callback, { resourceId: 'eventId' });
    this.galaxyUser = new User(event.requestContext.authorizer.lambda.user);
  }

  protected async checkAuthBeforeRequest(): Promise<void> {
    if (!this.resourceId) return;

    try {
      this.topicEvent = new TopicEvent(
        await ddb.get({ TableName: DDB_TABLES.events, Key: { eventId: this.resourceId } })
      );
    } catch (err) {
      throw new RCError('Event not found');
    }
  }

  protected async getResources(): Promise<TopicEvent[]> {
    let events: TopicEvent[] = await ddb.scan({ TableName: DDB_TABLES.events });
    events = events.map(x => new TopicEvent(x));
    if (!this.queryParams.all) events = events.filter(x => !x.archivedAt);
    return events.sort((a, b): number => a.name.localeCompare(b.name));
  }

  private async putSafeResource(opts: { noOverwrite: boolean }): Promise<TopicEvent> {
    const errors = this.topicEvent.validate();
    if (errors.length) throw new RCError(`Invalid fields: ${errors.join(', ')}`);

    const putParams: any = { TableName: DDB_TABLES.events, Item: this.topicEvent };
    if (opts.noOverwrite) putParams.ConditionExpression = 'attribute_not_exists(eventId)';
    await ddb.put(putParams);

    return this.topicEvent;
  }

  protected async postResources(): Promise<TopicEvent> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    this.topicEvent = new TopicEvent(this.body);
    this.topicEvent.eventId = await ddb.IUNID(PROJECT);

    return await this.putSafeResource({ noOverwrite: true });
  }

  protected async getResource(): Promise<TopicEvent> {
    return this.topicEvent;
  }

  protected async putResource(): Promise<TopicEvent> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    const oldEvent = new TopicEvent(this.topicEvent);
    this.topicEvent.safeLoad(this.body, oldEvent);

    return await this.putSafeResource({ noOverwrite: false });
  }

  protected async patchResource(): Promise<TopicEvent> {
    switch (this.body.action) {
      case 'ARCHIVE':
        return await this.manageArchive(true);
      case 'UNARCHIVE':
        return await this.manageArchive(false);
      default:
        throw new RCError('Unsupported action');
    }
  }
  private async manageArchive(archive: boolean): Promise<TopicEvent> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    if (archive) this.topicEvent.archivedAt = new Date().toISOString();
    else delete this.topicEvent.archivedAt;

    await ddb.put({ TableName: DDB_TABLES.events, Item: this.topicEvent });
    return this.topicEvent;
  }

  protected async deleteResource(): Promise<void> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    const topics: Topic[] = await ddb.scan({ TableName: DDB_TABLES.topics, IndexName: 'topicId-meta-index' });
    const topicsWithEvent = topics.filter(x => x.event.eventId === this.topicEvent.eventId);
    if (topicsWithEvent.length > 0) throw new RCError('Event is used');

    await ddb.delete({ TableName: DDB_TABLES.events, Key: { eventId: this.topicEvent.eventId } });
  }
}
