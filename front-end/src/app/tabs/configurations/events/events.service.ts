import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

import { GAEvent } from '@models/event.model';

@Injectable({ providedIn: 'root' })
export class GAEventsService {
  private events: GAEvent[];

  /**
   * Whether in the cache we loaded all the events or only the NOT archived ones.
   */
  all: boolean;

  /**
   * The number of events to consider for the pagination, when active.
   */
  MAX_PAGE_SIZE = 24;

  constructor(private api: IDEAApiService) {}

  /**
   * Load the events from the back-end.
   */
  private async loadList(all = false): Promise<void> {
    this.all = all;
    const params: any = {};
    if (all) params.all = true;
    const events: GAEvent[] = await this.api.getResource('events', { params });
    this.events = events.map(x => new GAEvent(x));
  }
  /**
   * Get (and optionally filter) the list of events.
   * Note: it's a slice of the array.
   */
  async getList(
    options: {
      force?: boolean;
      all?: boolean;
      search?: string;
      withPagination?: boolean;
      startPaginationAfterId?: string;
    } = {}
  ): Promise<GAEvent[]> {
    if (!this.events || options.force || options.all !== this.all) await this.loadList(options.all);
    if (!this.events) return null;

    options.search = options.search ? String(options.search).toLowerCase() : '';

    let filteredList = this.events.slice();

    if (options.search)
      filteredList = filteredList.filter(x =>
        options.search
          .split(' ')
          .every(searchTerm => [x.name].filter(f => f).some(f => f.toLowerCase().includes(searchTerm)))
      );

    if (options.withPagination && filteredList.length > this.MAX_PAGE_SIZE) {
      let indexOfLastOfPreviousPage = 0;
      if (options.startPaginationAfterId)
        indexOfLastOfPreviousPage = filteredList.findIndex(x => x.eventId === options.startPaginationAfterId) || 0;
      filteredList = filteredList.slice(0, indexOfLastOfPreviousPage + this.MAX_PAGE_SIZE);
    }

    return filteredList;
  }

  /**
   * Get a event by its id.
   */
  async getById(eventId: string): Promise<GAEvent> {
    return new GAEvent(await this.api.getResource(['events', eventId]));
  }

  /**
   * Insert a event.
   */
  async insert(event: GAEvent): Promise<GAEvent> {
    return new GAEvent(await this.api.postResource('events', { body: event }));
  }

  /**
   * Update a event.
   */
  async update(event: GAEvent): Promise<GAEvent> {
    return new GAEvent(await this.api.putResource(['events', event.eventId], { body: event }));
  }

  /**
   * Archive an event.
   */
  async archive(event: GAEvent): Promise<void> {
    await this.api.patchResource(['events', event.eventId], { body: { action: 'ARCHIVE' } });
  }
  /**
   * Unarchive an event.
   */
  async unarchive(event: GAEvent): Promise<void> {
    await this.api.patchResource(['events', event.eventId], { body: { action: 'UNARCHIVE' } });
  }

  /**
   * Delete an event.
   */
  async delete(event: GAEvent): Promise<void> {
    await this.api.deleteResource(['events', event.eventId]);
  }
}
