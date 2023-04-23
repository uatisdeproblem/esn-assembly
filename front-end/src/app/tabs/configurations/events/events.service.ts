import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

import { TopicEvent } from '@models/event.model';

@Injectable({ providedIn: 'root' })
export class TopicEventsService {
  private events: TopicEvent[];

  /**
   * The number of events to consider for the pagination, when active.
   */
  MAX_PAGE_SIZE = 24;

  constructor(private api: IDEAApiService) {}

  /**
   * Load the events from the back-end.
   */
  private async loadList(): Promise<void> {
    const events: TopicEvent[] = await this.api.getResource('events');
    this.events = events.map(x => new TopicEvent(x));
  }
  /**
   * Get (and optionally filter) the list of events.
   * Note: it's a slice of the array.
   */
  async getList(
    options: {
      force?: boolean;
      search?: string;
      withPagination?: boolean;
      startPaginationAfterId?: string;
    } = {}
  ): Promise<TopicEvent[]> {
    if (!this.events || options.force) await this.loadList();
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
  async getById(eventId: string): Promise<TopicEvent> {
    return new TopicEvent(await this.api.getResource(['events', eventId]));
  }

  /**
   * Insert a event.
   */
  async insert(event: TopicEvent): Promise<TopicEvent> {
    return new TopicEvent(await this.api.postResource('events', { body: event }));
  }

  /**
   * Update a event.
   */
  async update(event: TopicEvent): Promise<TopicEvent> {
    return new TopicEvent(await this.api.putResource(['events', event.eventId], { body: event }));
  }

  /**
   * Archive an event.
   */
  async archive(event: TopicEvent): Promise<void> {
    await this.api.patchResource(['events', event.eventId], { body: { action: 'ARCHIVE' } });
  }
  /**
   * Unarchive an event.
   */
  async unarchive(event: TopicEvent): Promise<void> {
    await this.api.patchResource(['events', event.eventId], { body: { action: 'UNARCHIVE' } });
  }

  /**
   * Delete an event.
   */
  async delete(event: TopicEvent): Promise<void> {
    await this.api.deleteResource(['events', event.eventId]);
  }

  /**
   * Get the URL to a summary spreadsheet containing questions and answers to this event's topics.
   */
  async downloadSummarySpreadsheet(event: TopicEvent): Promise<string> {
    const { url } = await this.api.getResource(['events', event.eventId], { params: { summarySpreadsheet: true } });
    return url;
  }
}
