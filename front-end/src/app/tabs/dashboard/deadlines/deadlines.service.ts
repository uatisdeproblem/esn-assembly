import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

import { Deadline } from '@models/deadline.model';

@Injectable({ providedIn: 'root' })
export class DeadlinesService {
  private deadlines: Deadline[];

  /**
   * The number of deadlines to consider for the pagination, when active.
   */
  MAX_PAGE_SIZE = 24;

  constructor(private api: IDEAApiService) {}

  /**
   * Load the deadlines from the back-end.
   */
  private async loadList(): Promise<void> {
    const deadlines: Deadline[] = await this.api.getResource('deadlines');
    this.deadlines = deadlines.map(x => new Deadline(x));
  }
  /**
   * Get (and optionally filter) the list of deadlines.
   * Note: it's a slice of the array.
   */
  async getList(
    options: {
      force?: boolean;
      search?: string;
      withPagination?: boolean;
      startPaginationAfterId?: string;
    } = {}
  ): Promise<Deadline[]> {
    if (!this.deadlines || options.force) await this.loadList();
    if (!this.deadlines) return null;

    options.search = options.search ? String(options.search).toLowerCase() : '';

    let filteredList = this.deadlines.slice();

    if (options.search)
      filteredList = filteredList.filter(x =>
        options.search
          .split(' ')
          .every(searchTerm => [x.name].filter(f => f).some(f => f.toLowerCase().includes(searchTerm)))
      );

    filteredList = filteredList.sort((a, b): number => a.at.localeCompare(b.at));

    if (options.withPagination && filteredList.length > this.MAX_PAGE_SIZE) {
      let indexOfLastOfPreviousPage = 0;
      if (options.startPaginationAfterId)
        indexOfLastOfPreviousPage = filteredList.findIndex(x => x.deadlineId === options.startPaginationAfterId) || 0;
      filteredList = filteredList.slice(0, indexOfLastOfPreviousPage + this.MAX_PAGE_SIZE);
    }

    return filteredList;
  }

  /**
   * Get a deadline by its id.
   */
  async getById(deadlineId: string): Promise<Deadline> {
    return new Deadline(await this.api.getResource(['deadlines', deadlineId]));
  }

  /**
   * Insert a deadline.
   */
  async insert(deadline: Deadline): Promise<Deadline> {
    return new Deadline(await this.api.postResource('deadlines', { body: deadline }));
  }

  /**
   * Update a deadline.
   */
  async update(deadline: Deadline): Promise<Deadline> {
    return new Deadline(await this.api.putResource(['deadlines', deadline.deadlineId], { body: deadline }));
  }

  /**
   * Delete an deadline.
   */
  async delete(deadline: Deadline): Promise<void> {
    await this.api.deleteResource(['deadlines', deadline.deadlineId]);
  }
}
