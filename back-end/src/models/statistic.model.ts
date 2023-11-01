import { Resource } from 'idea-toolbox';

/**
 * An entry for statistics of interfactions in the app.
 */
export class StatisticEntry extends Resource {
  /**
   * The concatenation of `entityType` and `entityId` (if any).
   */
  PK: string;
  /**
   * The concatenation of `timestamp` and `userHash`.
   */
  SK: string;
  /**
   * The ESN country of the user who generated the statistic entry.
   */
  country: string;
  /**
   * The timestamp (in seconds) of when the statistic entry will expire.
   */
  expiresAt: number;

  static getPK(entityType: StatisticEntityTypes, entityId?: string): string {
    return [entityType, entityId].filter(x => x).join('###');
  }
  static getSK(userId: string): string {
    return [StatisticEntry.generateTimestamp(), StatisticEntry.getHashOfString(userId)].join('###');
  }
  static generateTimestamp(input?: string | number | Date, addHours = 0): string {
    const d = input ? new Date(input) : new Date();
    d.setHours(d.getHours() + addHours);
    return d.toISOString().slice(0, 13);
  }
  static getTimestamp(entry: StatisticEntry): string {
    return entry.SK.split('###')[0];
  }
  static getUserHash(entry: StatisticEntry): string {
    return entry.SK.split('###')[1];
  }
  private static getHashOfString(s: string): string {
    return s
      .split('')
      .reduce((a, b): number => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
      .toString();
  }

  load(x: any): void {
    super.load(x);
    this.PK = this.clean(x.PK, String);
    this.SK = this.clean(x.SK, String);
    this.country = this.clean(x.country, String);
    this.expiresAt = this.clean(x.expiresAt, Number);
  }
}

/**
 * The type of entities monitored for statistics.
 */
export enum StatisticEntityTypes {
  TOPICS = 'TOPICS',
  COMMUNICATIONS = 'COMMUNICATIONS',
  DEADLINES = 'DEADLINES',
  USEFUL_LINKS = 'USEFUL_LINKS',
  OPPORTUNITIES = 'OPPORTUNITIES'
}

/**
 * A statistic to display regarding an entity or entity type, elaborated by one or more raw statistic entries.
 */
export interface Statistic {
  entityType: StatisticEntityTypes;
  entityId?: string;
  timePoints: string[];
  totals: { countries: number; users: number };
  details: { [country: string]: number[] };
}

/**
 * The granularities for the statistics.
 */
export enum StatisticGranularities {
  MONTHLY = 'MONTHLY',
  DAILY = 'DAILY',
  HOURLY = 'HOURLY'
}
