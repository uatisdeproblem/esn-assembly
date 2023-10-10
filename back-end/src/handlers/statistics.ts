///
/// IMPORTS
///

import {
  addDays,
  addHours,
  addMonths,
  endOfDay,
  endOfHour,
  endOfMonth,
  isBefore,
  startOfDay,
  startOfHour,
  startOfMonth
} from 'date-fns';
import { DynamoDB, RCError, ResourceController } from 'idea-aws';

import { User } from '../models/user.model';
import { Statistic, StatisticEntityTypes, StatisticEntry, StatisticGranularities } from '../models/statistic.model';

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
    const since = StatisticEntry.generateTimestamp(this.queryParams.since, -1);
    const to = StatisticEntry.generateTimestamp(this.queryParams.to, 1);

    const statisticEntries: StatisticEntry[] = await ddb.query({
      TableName: DDB_TABLES.statistics,
      KeyConditionExpression: 'PK = :pk AND SK BETWEEN :since AND :to',
      ExpressionAttributeValues: { ':pk': pk, ':since': since, ':to': to }
    });
    const countries = Array.from(new Set(statisticEntries.map(x => x.country)));

    const granularity = Object.keys(StatisticGranularities).includes(this.queryParams.granularity)
      ? this.queryParams.granularity
      : StatisticGranularities.MONTHLY;
    const timePoints = this.buildTimePointsBasedOnGranularity(this.queryParams.since, this.queryParams.to, granularity);

    const statistic: Statistic = {
      entityType: this.queryParams.entityType,
      entityId: this.queryParams.entityId,
      timePoints,
      totals: { countries: 0, users: 0 },
      details: {}
    };

    const countriesDistinct = new Set<string>();
    const usersDistinct = new Set<string>();

    const usersPresenceInTimePoint = new Set<string>();
    const countryValueInTimePoint = new Map<string, number>();

    timePoints.forEach(timePoint => {
      const entriesInTimePoint = statisticEntries.filter(x => StatisticEntry.getTimestamp(x).startsWith(timePoint));
      entriesInTimePoint.forEach(entry => {
        const countryUser = [entry.country, StatisticEntry.getUserHash(entry)].join('###');
        usersPresenceInTimePoint.add(countryUser);
      });
      Array.from(usersPresenceInTimePoint).forEach(countryUser => {
        const [country, user] = countryUser.split('###');
        countriesDistinct.add(country);
        usersDistinct.add(user);
        const currentCountryValue = countryValueInTimePoint.get(country) ?? 0;
        countryValueInTimePoint.set(country, currentCountryValue + 1);
      });
      countries.forEach(country => {
        if (!statistic.details[country]) statistic.details[country] = [];
        statistic.details[country].push(countryValueInTimePoint.get(country) ?? 0);
      });

      usersPresenceInTimePoint.clear();
      countryValueInTimePoint.clear();
    });

    statistic.totals.countries = countriesDistinct.size;
    statistic.totals.users = usersDistinct.size;

    return statistic;
  }
  private buildTimePointsBasedOnGranularity(
    sinceDate: string,
    toDate: string,
    granularity: StatisticGranularities
  ): string[] {
    const timePoints = [];
    let currentTimePoint = new Date(sinceDate);
    const to = new Date(toDate);
    if (granularity === StatisticGranularities.HOURLY) {
      while (isBefore(startOfHour(currentTimePoint), endOfHour(to))) {
        timePoints.push(currentTimePoint.toISOString().slice(0, 13));
        currentTimePoint = addHours(currentTimePoint, 1);
      }
    } else if (granularity === StatisticGranularities.DAILY) {
      while (isBefore(startOfDay(currentTimePoint), endOfDay(to))) {
        timePoints.push(currentTimePoint.toISOString().slice(0, 10));
        currentTimePoint = addDays(currentTimePoint, 1);
      }
    } else {
      while (isBefore(startOfMonth(currentTimePoint), endOfMonth(to))) {
        timePoints.push(currentTimePoint.toISOString().slice(0, 7));
        currentTimePoint = addMonths(currentTimePoint, 1);
      }
    }
    return timePoints;
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
