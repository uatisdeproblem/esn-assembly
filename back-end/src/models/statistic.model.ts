import { Resource } from 'idea-toolbox';

/**
 * An entry for statistics of interfactions in the app.
 */
export class Statistic extends Resource {
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
    return [Statistic.getTimestamp(), Statistic.getHashOfString(userId)].join('###');
  }
  private static getTimestamp(input?: string | number | Date): string {
    const d = input ? new Date(input) : new Date();
    return d.toISOString().slice(0, 13);
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
  USEFUL_LINKS = 'USEFUL_LINKS'
}
