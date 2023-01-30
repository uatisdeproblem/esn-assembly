///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController } from 'idea-aws';

import { TopicEvent } from '../models/event.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const PROJECT = process.env.PROJECT;
const DDB_TABLES = { events: process.env.DDB_TABLE_events };
const ddb = new DynamoDB();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new TopicEvents(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class TopicEvents extends ResourceController {
  topicEvent: TopicEvent;

  constructor(event: any, callback: any) {
    super(event, callback, { resourceId: 'eventId' });
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
    const res: TopicEvent[] = await ddb.scan({ TableName: DDB_TABLES.events });
    return res.map(x => new TopicEvent(x));
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
    this.topicEvent = new TopicEvent(this.body);
    this.topicEvent.eventId = await ddb.IUNID(PROJECT);

    return await this.putSafeResource({ noOverwrite: true });
  }

  protected async getResource(): Promise<TopicEvent> {
    return this.topicEvent;
  }

  protected async putResource(): Promise<TopicEvent> {
    const oldEvent = new TopicEvent(this.topicEvent);
    this.topicEvent.safeLoad(this.body, oldEvent);

    return await this.putSafeResource({ noOverwrite: false });
  }

  protected async deleteResource(): Promise<void> {
    await ddb.delete({ TableName: DDB_TABLES.events, Key: { eventId: this.resourceId } });
  }
}
