import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

import { Communication } from '@models/communication.model';

@Injectable({ providedIn: 'root' })
export class CommunicationsService {
  private communications: Communication[];

  /**
   * The number of communications to consider for the pagination, when active.
   */
  MAX_PAGE_SIZE = 24;

  constructor(private api: IDEAApiService) {}

  /**
   * Load the communications from the back-end.
   */
  private async loadList(): Promise<void> {
    const communications: Communication[] = await this.api.getResource('communications');
    this.communications = communications.map(x => new Communication(x));
  }
  /**
   * Get (and optionally filter) the list of communications.
   * Note: it's a slice of the array.
   */
  async getList(
    options: {
      force?: boolean;
      search?: string;
      withPagination?: boolean;
      startPaginationAfterId?: string;
    } = {}
  ): Promise<Communication[]> {
    if (!this.communications || options.force) await this.loadList();
    if (!this.communications) return null;

    options.search = options.search ? String(options.search).toLowerCase() : '';

    let filteredList = this.communications.slice();

    if (options.search)
      filteredList = filteredList.filter(x =>
        options.search
          .split(' ')
          .every(searchTerm => [x.name].filter(f => f).some(f => f.toLowerCase().includes(searchTerm)))
      );

    filteredList = filteredList.sort((a, b): number => b.date.localeCompare(b.date));

    if (options.withPagination && filteredList.length > this.MAX_PAGE_SIZE) {
      let indexOfLastOfPreviousPage = 0;
      if (options.startPaginationAfterId)
        indexOfLastOfPreviousPage =
          filteredList.findIndex(x => x.communicationId === options.startPaginationAfterId) || 0;
      filteredList = filteredList.slice(0, indexOfLastOfPreviousPage + this.MAX_PAGE_SIZE);
    }

    return filteredList;
  }

  /**
   * Get a communication by its id.
   */
  async getById(communicationId: string): Promise<Communication> {
    return new Communication(await this.api.getResource(['communications', communicationId]));
  }

  /**
   * Insert a communication.
   */
  async insert(communication: Communication): Promise<Communication> {
    return new Communication(await this.api.postResource('communications', { body: communication }));
  }

  /**
   * Update a communication.
   */
  async update(communication: Communication): Promise<Communication> {
    return new Communication(
      await this.api.putResource(['communications', communication.communicationId], { body: communication })
    );
  }

  /**
   * Archive a communication.
   */
  async archive(communication: Communication): Promise<void> {
    await this.api.patchResource(['communications', communication.communicationId], { body: { action: 'ARCHIVE' } });
  }
  /**
   * Unarchive a communication.
   */
  async unarchive(communication: Communication): Promise<void> {
    await this.api.patchResource(['communications', communication.communicationId], { body: { action: 'UNARCHIVE' } });
  }

  /**
   * Delete an communication.
   */
  async delete(communication: Communication): Promise<void> {
    await this.api.deleteResource(['communications', communication.communicationId]);
  }
}
