///
/// IMPORTS
///

import { DynamoDB, GenericController, RCError } from 'idea-aws';

import { dateStringIsPast, FAVORITE_TIMEZONE } from '../models/favoriteTimezone.const';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const DDB_TABLES = { topics: process.env.DDB_TABLE_topics, opportunities: process.env.DDB_TABLE_opportunities };
const ddb = new DynamoDB();

export const handler = async (ev: any, _: any, cb: any): Promise<void> =>
  await new ScheduledOps(ev, cb).handleRequest();

class ScheduledOps extends GenericController {
  async handleRequest(): Promise<void> {
    try {
      await Promise.all([this.closeTopicsWithPastDeadline(), this.closeOpportunitiesWithPastDeadline()]);
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
  private async closeOpportunitiesWithPastDeadline(): Promise<void> {
    const opportunities = await ddb.scan({
      TableName: DDB_TABLES.opportunities,
      IndexName: 'opportunityId-willCloseAt-index'
    });
    const opportunitiesToClose = opportunities.filter(x => dateStringIsPast(x.willCloseAt, FAVORITE_TIMEZONE));

    for (const opportunity of opportunitiesToClose) {
      try {
        await ddb.update({
          TableName: DDB_TABLES.opportunities,
          Key: { opportunityId: opportunity.opportunityId },
          UpdateExpression: 'SET closedAt = :deadline REMOVE willCloseAt',
          ExpressionAttributeValues: { ':deadline': opportunity.willCloseAt }
        });
      } catch (error) {
        this.logger.warn('Opportunity NOT closed', error, opportunity);
      }
    }
  }
}
