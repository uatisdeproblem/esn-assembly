///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController } from 'idea-aws';

import { GAEvent } from '../models/event.model';
import { Topic } from '../models/topic.model';
import { User } from '../models/user.model';
import { VotingSession } from '../models/votingSession.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const PROJECT = process.env.PROJECT;
const DDB_TABLES = {
  events: process.env.DDB_TABLE_events,
  topics: process.env.DDB_TABLE_topics,
  questions: process.env.DDB_TABLE_questions,
  answers: process.env.DDB_TABLE_answers,
  votingSessions: process.env.DDB_TABLE_votingSessions
};
const ddb = new DynamoDB();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new GAEvents(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class GAEvents extends ResourceController {
  galaxyUser: User;
  gaEvent: GAEvent;

  constructor(event: any, callback: any) {
    super(event, callback, { resourceId: 'eventId' });
    this.galaxyUser = new User(event.requestContext.authorizer.lambda.user);
  }

  protected async checkAuthBeforeRequest(): Promise<void> {
    if (!this.resourceId) return;

    try {
      this.gaEvent = new GAEvent(await ddb.get({ TableName: DDB_TABLES.events, Key: { eventId: this.resourceId } }));
    } catch (err) {
      throw new RCError('Event not found');
    }
  }

  protected async getResources(): Promise<GAEvent[]> {
    let events: GAEvent[] = await ddb.scan({ TableName: DDB_TABLES.events });
    events = events.map(x => new GAEvent(x));
    if (!this.queryParams.all) events = events.filter(x => !x.archivedAt);
    return events.sort((a, b): number => a.name.localeCompare(b.name));
  }

  private async putSafeResource(opts: { noOverwrite: boolean }): Promise<GAEvent> {
    const errors = this.gaEvent.validate();
    if (errors.length) throw new RCError(`Invalid fields: ${errors.join(', ')}`);

    const putParams: any = { TableName: DDB_TABLES.events, Item: this.gaEvent };
    if (opts.noOverwrite) putParams.ConditionExpression = 'attribute_not_exists(eventId)';
    await ddb.put(putParams);

    return this.gaEvent;
  }

  protected async postResources(): Promise<GAEvent> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    this.gaEvent = new GAEvent(this.body);
    this.gaEvent.eventId = await ddb.IUNID(PROJECT);

    return await this.putSafeResource({ noOverwrite: true });
  }

  protected async getResource(): Promise<GAEvent> {
    return this.gaEvent;
  }

  protected async putResource(): Promise<GAEvent> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    const oldEvent = new GAEvent(this.gaEvent);
    this.gaEvent.safeLoad(this.body, oldEvent);

    return await this.putSafeResource({ noOverwrite: false });
  }

  protected async patchResource(): Promise<GAEvent> {
    switch (this.body.action) {
      case 'ARCHIVE':
        return await this.manageArchive(true);
      case 'UNARCHIVE':
        return await this.manageArchive(false);
      default:
        throw new RCError('Unsupported action');
    }
  }
  private async manageArchive(archive: boolean): Promise<GAEvent> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    if (archive) this.gaEvent.archivedAt = new Date().toISOString();
    else delete this.gaEvent.archivedAt;

    await ddb.put({ TableName: DDB_TABLES.events, Item: this.gaEvent });
    return this.gaEvent;
  }

  protected async deleteResource(): Promise<void> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    const topics: Topic[] = await ddb.scan({ TableName: DDB_TABLES.topics, IndexName: 'topicId-meta-index' });
    const topicsWithEvent = topics.filter(x => x.event.eventId === this.gaEvent.eventId);
    if (topicsWithEvent.length > 0) throw new RCError('Event is used');

    const votingSessions: VotingSession[] = await ddb.scan({
      TableName: DDB_TABLES.votingSessions,
      IndexName: 'sessionId-meta-index'
    });
    const votingSessionsWithEvent = votingSessions.filter(x => x.event?.eventId === this.gaEvent.eventId);
    if (votingSessionsWithEvent.length > 0) throw new RCError('Event is used');

    await ddb.delete({ TableName: DDB_TABLES.events, Key: { eventId: this.gaEvent.eventId } });
  }
}
