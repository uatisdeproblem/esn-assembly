///
/// IMPORTS
///

import { DynamoDB, GenericController, RCError } from 'idea-aws';

import { dateStringIsPast, FAVORITE_TIMEZONE } from '../models/favoriteTimezone.const';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const DDB_TABLES = { topics: process.env.DDB_TABLE_topics };
const ddb = new DynamoDB();

export const handler = async (ev: any, _: any, cb: any): Promise<void> =>
  await new ScheduledOps(ev, cb).handleRequest();

class ScheduledOps extends GenericController {
  async handleRequest(): Promise<void> {
    try {
      await this.closeTopicsWithPastDeadline();
      this.done(null);
    } catch (error) {
      this.logger.error('Failed scheduled ops', error);
      this.done(new RCError('ERROR IN SCHEDULED OPS'));
    }
  }
  private async closeTopicsWithPastDeadline(): Promise<void> {
    const topics = await ddb.scan({ TableName: DDB_TABLES.topics, IndexName: 'topicId-willCloseAt-index' });
    const topicsToClose = topics.filter(t => dateStringIsPast(t.willCloseAt, FAVORITE_TIMEZONE));

    for (const topic of topicsToClose) {
      try {
        await ddb.update({
          TableName: DDB_TABLES.topics,
          Key: { topicId: topic.topicId },
          UpdateExpression: 'SET closedAt = :deadline REMOVE willCloseAt',
          ExpressionAttributeValues: { ':deadline': topic.willCloseAt }
        });
      } catch (error) {
        this.logger.warn('Topic NOT closed', error, topic);
      }
    }
  }
}
