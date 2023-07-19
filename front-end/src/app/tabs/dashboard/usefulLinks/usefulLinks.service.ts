import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

import { UsefulLink } from '@models/usefulLink.model';

@Injectable({ providedIn: 'root' })
export class UsefulLinksService {
  private usefulLinks: UsefulLink[];

  /**
   * The number of useful links to consider for the pagination, when active.
   */
  MAX_PAGE_SIZE = 24;

  constructor(private api: IDEAApiService) {}

  /**
   * Load the useful links from the back-end.
   */
  private async loadList(): Promise<void> {
    const usefulLinks: UsefulLink[] = await this.api.getResource('usefulLinks');
    this.usefulLinks = usefulLinks.map(x => new UsefulLink(x));
  }
  /**
   * Get (and optionally filter) the list of useful links.
   * Note: it's a slice of the array.
   */
  async getList(
    options: {
      force?: boolean;
      search?: string;
      withPagination?: boolean;
      startPaginationAfterId?: string;
    } = {}
  ): Promise<UsefulLink[]> {
    if (!this.usefulLinks || options.force) await this.loadList();
    if (!this.usefulLinks) return null;

    options.search = options.search ? String(options.search).toLowerCase() : '';

    let filteredList = this.usefulLinks.slice();

    if (options.search)
      filteredList = filteredList.filter(x =>
        options.search
          .split(' ')
          .every(searchTerm => [x.name, x.url].filter(f => f).some(f => f.toLowerCase().includes(searchTerm)))
      );

    filteredList = filteredList.sort((a, b): number => a.sort - b.sort);

    if (options.withPagination && filteredList.length > this.MAX_PAGE_SIZE) {
      let indexOfLastOfPreviousPage = 0;
      if (options.startPaginationAfterId)
        indexOfLastOfPreviousPage = filteredList.findIndex(x => x.linkId === options.startPaginationAfterId) || 0;
      filteredList = filteredList.slice(0, indexOfLastOfPreviousPage + this.MAX_PAGE_SIZE);
    }

    return filteredList;
  }

  /**
   * Get a useful link by its id.
   */
  async getById(linkId: string): Promise<UsefulLink> {
    return new UsefulLink(await this.api.getResource(['usefulLinks', linkId]));
  }

  /**
   * Insert a useful link.
   */
  async insert(usefulLink: UsefulLink): Promise<UsefulLink> {
    return new UsefulLink(await this.api.postResource('usefulLinks', { body: usefulLink }));
  }

  /**
   * Update a useful link.
   */
  async update(usefulLink: UsefulLink): Promise<UsefulLink> {
    return new UsefulLink(await this.api.putResource(['usefulLinks', usefulLink.linkId], { body: usefulLink }));
  }

  /**
   * Swap the sort index with another link.
   */
  async swapSort(usefulLinkA: UsefulLink, usefulLinkB: UsefulLink): Promise<void> {
    const body = { action: 'SWAP_SORT', otherLinkId: usefulLinkB.linkId };
    await this.api.patchResource(['usefulLinks', usefulLinkA.linkId], { body });
    const swapSort = usefulLinkA.sort;
    usefulLinkA.sort = usefulLinkB.sort;
    usefulLinkB.sort = swapSort;
  }

  /**
   * Delete an useful link.
   */
  async delete(usefulLink: UsefulLink): Promise<void> {
    await this.api.deleteResource(['usefulLinks', usefulLink.linkId]);
  }
}
