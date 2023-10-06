///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController } from 'idea-aws';

import { User } from '../models/user.model';
import { Statistic, StatisticEntityTypes } from '../models/statistic.model';

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

  protected async getResources(): Promise<any> {
    return [];
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
  const statistic = new Statistic({
    PK: Statistic.getPK(entityType, entityId),
    SK: Statistic.getSK(user.userId),
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
