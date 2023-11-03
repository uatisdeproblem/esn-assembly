import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

import { Opportunity } from '@models/opportunity.model';

@Injectable({ providedIn: 'root' })
export class OpportunitiesService {
  private opportunities: Opportunity[];
  private archivedOpportunities: Opportunity[];
  private archivedFromYearPreviouslySelected: number = null;

  /**
   * The number of opportunities to consider for the pagination, when active.
   */
  MAX_PAGE_SIZE = 24;

  constructor(private api: IDEAApiService) {}

  /**
   * Load the active opportunities from the back-end.
   */
  private async loadActiveList(): Promise<void> {
    const opportunities: Opportunity[] = await this.api.getResource('opportunities', { params: { archived: false } });
    this.opportunities = opportunities.map(x => new Opportunity(x));
  }
  /**
   * Get (and optionally filter) the list of active opportunities.
   * Note: it's a slice of the array.
   */
  async getActiveList(
    options: {
      force?: boolean;
      search?: string;
      status?: boolean;
      withPagination?: boolean;
      startPaginationAfterId?: string;
      sortBy?: OpportunitiesSortBy;
    } = { sortBy: OpportunitiesSortBy.CREATED_DATE_DESC }
  ): Promise<Opportunity[]> {
    if (!this.opportunities || options.force) await this.loadActiveList();
    if (!this.opportunities) return null;

    options.search = options.search ? String(options.search).toLowerCase() : '';

    let filteredList = this.opportunities.slice();

    if (options.search)
      filteredList = filteredList.filter(x =>
        options.search
          .split(' ')
          .every(searchTerm => [x.name, x.content].filter(f => f).some(f => f.toLowerCase().includes(searchTerm)))
      );

    if (options.status === true || options.status === false)
      filteredList = filteredList.filter(x => (options.status ? !x.closedAt : x.closedAt));

    switch (options.sortBy) {
      case OpportunitiesSortBy.CREATED_DATE_ASC:
        filteredList = filteredList.sort((a, b): number => a.createdAt.localeCompare(b.createdAt));
        break;
      case OpportunitiesSortBy.CREATED_DATE_DESC:
        filteredList = filteredList.sort((a, b): number => b.createdAt.localeCompare(a.createdAt));
        break;
      case OpportunitiesSortBy.CLOSING_DATE_ASC:
        filteredList = filteredList.sort(
          (a, b): number => a.closedAt?.localeCompare(b.closedAt) || a.willCloseAt?.localeCompare(b.willCloseAt)
        );
        break;
      case OpportunitiesSortBy.CLOSING_DATE_DESC:
        filteredList = filteredList.sort(
          (a, b): number => b.closedAt?.localeCompare(a.closedAt) || b.willCloseAt?.localeCompare(a.willCloseAt)
        );
        break;
    }

    if (options.withPagination && filteredList.length > this.MAX_PAGE_SIZE) {
      let indexOfLastOfPreviousPage = 0;
      if (options.startPaginationAfterId)
        indexOfLastOfPreviousPage =
          filteredList.findIndex(x => x.opportunityId === options.startPaginationAfterId) || 0;
      filteredList = filteredList.slice(0, indexOfLastOfPreviousPage + this.MAX_PAGE_SIZE);
    }

    return filteredList;
  }

  /**
   * Load the archived opportunities from the back-end.
   */
  private async loadArchivedList(year: number): Promise<void> {
    this.archivedFromYearPreviouslySelected = year;
    const params = { archivedFromYear: year };
    const opportunities: Opportunity[] = await this.api.getResource('opportunities', { params });
    this.archivedOpportunities = opportunities.map(x => new Opportunity(x));
  }
  /**
   * Get (and optionally filter) the list of archived opportunities.
   * Note: it's a slice of the array.
   */
  async getArchivedListFromYear(
    year: number,
    options: {
      force?: boolean;
      withPagination?: boolean;
      startPaginationAfterId?: string;
      sortBy?: OpportunitiesSortBy;
    } = { sortBy: OpportunitiesSortBy.CREATED_DATE_DESC }
  ): Promise<Opportunity[]> {
    if (!this.archivedOpportunities || options.force || year !== this.archivedFromYearPreviouslySelected)
      await this.loadArchivedList(year);
    if (!this.archivedOpportunities) return null;

    let filteredList = this.archivedOpportunities.slice();

    switch (options.sortBy) {
      case OpportunitiesSortBy.CREATED_DATE_ASC:
        filteredList = filteredList.sort((a, b): number => a.createdAt.localeCompare(b.createdAt));
        break;
      case OpportunitiesSortBy.CREATED_DATE_DESC:
        filteredList = filteredList.sort((a, b): number => b.createdAt.localeCompare(a.createdAt));
        break;
      case OpportunitiesSortBy.CLOSING_DATE_ASC:
        filteredList = filteredList.sort(
          (a, b): number => a.closedAt?.localeCompare(b.closedAt) || a.willCloseAt?.localeCompare(b.willCloseAt)
        );
        break;
      case OpportunitiesSortBy.CLOSING_DATE_DESC:
        filteredList = filteredList.sort(
          (a, b): number => b.closedAt?.localeCompare(a.closedAt) || b.willCloseAt?.localeCompare(a.willCloseAt)
        );
        break;
    }

    if (options.withPagination && filteredList.length > this.MAX_PAGE_SIZE) {
      let indexOfLastOfPreviousPage = 0;
      if (options.startPaginationAfterId)
        indexOfLastOfPreviousPage =
          filteredList.findIndex(x => x.opportunityId === options.startPaginationAfterId) || 0;
      filteredList = filteredList.slice(0, indexOfLastOfPreviousPage + this.MAX_PAGE_SIZE);
    }

    return filteredList;
  }

  /**
   * Get an opportunity by its id.
   */
  async getById(opportunityId: string): Promise<Opportunity> {
    return new Opportunity(await this.api.getResource(['opportunities', opportunityId]));
  }

  /**
   * Insert an opportunity.
   */
  async insert(opportunity: Opportunity): Promise<Opportunity> {
    return new Opportunity(await this.api.postResource('opportunities', { body: opportunity }));
  }

  /**
   * Update an opportunity.
   */
  async update(opportunity: Opportunity): Promise<Opportunity> {
    return new Opportunity(
      await this.api.putResource(['opportunities', opportunity.opportunityId], { body: opportunity })
    );
  }

  /**
   * Open an opportunity.
   */
  async open(opportunity: Opportunity): Promise<void> {
    await this.api.patchResource(['opportunities', opportunity.opportunityId], { body: { action: 'OPEN' } });
  }
  /**
   * Close a Opportunity.
   */
  async close(opportunity: Opportunity): Promise<void> {
    await this.api.patchResource(['opportunities', opportunity.opportunityId], { body: { action: 'CLOSE' } });
  }

  /**
   * Archive a Opportunity.
   */
  async archive(opportunity: Opportunity): Promise<void> {
    await this.api.patchResource(['opportunities', opportunity.opportunityId], { body: { action: 'ARCHIVE' } });
  }
  /**
   * Unarchive an opportunity.
   */
  async unarchive(opportunity: Opportunity): Promise<void> {
    await this.api.patchResource(['opportunities', opportunity.opportunityId], { body: { action: 'UNARCHIVE' } });
  }

  /**
   * Delete an opportunity.
   */
  async delete(opportunity: Opportunity): Promise<void> {
    await this.api.deleteResource(['opportunities', opportunity.opportunityId]);
  }
}

/**
 * The possible sorting mechanisms for the opportunities.
 */
export enum OpportunitiesSortBy {
  CREATED_DATE_ASC = 'CREATED_DATE_ASC',
  CREATED_DATE_DESC = 'CREATED_DATE_DESC',
  CLOSING_DATE_ASC = 'CLOSING_DATE_ASC',
  CLOSING_DATE_DESC = 'CLOSING_DATE_DESC'
}
