///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController } from 'idea-aws';

import { User } from '../models/user.model';
import { Statistic, StatisticEntityTypes, StatisticEntry } from '../models/statistic.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const DDB_TABLES = { statistics: process.env.DDB_TABLE_statistics };
const ddb = new DynamoDB();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new StatisticsRC(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class StatisticsRC extends ResourceController {
  galaxyUser: User;

  constructor(event: any, callback: any) {
    super(event, callback);
    this.galaxyUser = new User(event.requestContext.authorizer.lambda.user);
  }

  protected async checkAuthBeforeRequest(): Promise<void> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');
  }

  protected async getResources(): Promise<Statistic> {
    if (!this.queryParams.since || !this.queryParams.to) throw new RCError('Missing date interval');
    if (!this.queryParams.entityType) throw new RCError('Missing entity type');

    const pk = StatisticEntry.getPK(this.queryParams.entityType, this.queryParams.entityId);
    const since = StatisticEntry.generateTimestamp(this.queryParams.since);
    const to = StatisticEntry.generateTimestamp(this.queryParams.to);

    const rawStatisticsSortedByTimestamp: StatisticEntry[] = await ddb.query({
      TableName: DDB_TABLES.statistics,
      KeyConditionExpression: 'PK = :pk AND SK BETWEEN :since AND :to',
      ExpressionAttributeValues: { ':pk': pk, ':since': since, ':to': to }
    });

    const statistics: Statistic = {
      entityType: this.queryParams.entityType,
      entityId: this.queryParams.entityId,
      details: []
    };

    let prevTimestamp: string;
    const currentTimestampCountryCounterMap: Map<string, number> = new Map();
    rawStatisticsSortedByTimestamp.forEach((entry, index): void => {
      const timestamp = StatisticEntry.getTimestamp(entry);

      const currentCounterForCountry = currentTimestampCountryCounterMap.get(entry.country) ?? 0;
      currentTimestampCountryCounterMap.set(entry.country, currentCounterForCountry + 1);

      if (!prevTimestamp || prevTimestamp !== timestamp || rawStatisticsSortedByTimestamp.length === index + 1) {
        currentTimestampCountryCounterMap.forEach((counter, country): void => {
          statistics.details.push({ timestamp, country, counter });
        });
        currentTimestampCountryCounterMap.clear();
        prevTimestamp = timestamp;
      }
    });

    return statistics;
  }
}

/**
 * Add an entry to the statistics.
 */
export const addStatisticEntry = async (
  user: { userId: string; country: string },
  entityType: StatisticEntityTypes,
  entityId?: string
): Promise<void> => {
  const statistic = new StatisticEntry({
    PK: StatisticEntry.getPK(entityType, entityId),
    SK: StatisticEntry.getSK(user.userId),
    country: user.country,
    expiresAt: getExpiresAtAddingYearsAndMonths(3, 1)
  });
  await ddb.put({ TableName: DDB_TABLES.statistics, Item: statistic });
};
const getExpiresAtAddingYearsAndMonths = (addYears: number, addMonths: number): number => {
  const expiresAtDate = new Date();
  expiresAtDate.setFullYear(expiresAtDate.getFullYear() + addYears);
  expiresAtDate.setMonth(expiresAtDate.getMonth() + addMonths);
  return Math.floor(expiresAtDate.getTime() / 1000);
};
