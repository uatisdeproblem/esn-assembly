import { Injectable } from '@angular/core';
import { addDays } from 'date-fns/esm';
import { epochISOString } from 'idea-toolbox';
import { IDEAApiService } from '@idea-ionic/common';

import { Statistic, StatisticEntityTypes, StatisticGranularities } from '@models/statistic.model';

@Injectable({ providedIn: 'root' })
export class StatisticsService {
  constructor(private api: IDEAApiService) {}

  /**
   * Get the statistics for a time window of an entity (type or ID).
   */
  async getInTimeWindowOfEntity(options: {
    since: epochISOString;
    to: epochISOString;
    granularity: StatisticGranularities;
    entityType: StatisticEntityTypes;
    entityId?: string;
  }): Promise<Statistic> {
    const params: Record<string, string> = {};
    for (const attr in options) if (options[attr]) params[attr] = options[attr];
    return await this.api.getResource('statistics', { params });
  }

  /**
   * Get some general access statistics to the app from the last N days.
   * Note: it uses one of the entities loaded in the homepage, to make sure to capture all the users.
   */
  async recapOfLastNumDays(numDays: number): Promise<Statistic> {
    const to = new Date().toISOString();
    const since = addDays(new Date(), -numDays).toISOString();
    const params: Record<string, string> = { since, to, entityType: StatisticEntityTypes.COMMUNICATIONS };
    return await this.api.getResource('statistics', { params });
  }
}
