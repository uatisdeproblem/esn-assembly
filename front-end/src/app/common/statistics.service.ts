import { Injectable } from '@angular/core';
import { addDays } from 'date-fns/esm';
import { epochISOString } from 'idea-toolbox';
import { IDEAApiService } from '@idea-ionic/common';

import { Statistic, StatisticEntityTypes } from '@models/statistic.model';

@Injectable({ providedIn: 'root' })
export class StatisticsService {
  constructor(private api: IDEAApiService) {}

  /**
   * Get the statistics for a time window of an entity (type or ID).
   */
  async getInTimeWindowOfEntity(
    since: epochISOString,
    to: epochISOString,
    entityType: StatisticEntityTypes,
    entityId?: string
  ): Promise<Statistic> {
    const params: Record<string, string> = { since, to, entityType };
    if (entityId) params.entityId = entityId;
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
