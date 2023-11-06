import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

import { Opportunity } from '@models/opportunity.model';
import { Application } from '@models/application.model';

@Injectable({ providedIn: 'root' })
export class ApplicationsService {
  private applications: Application[];

  /**
   * The number of applications to consider for the pagination, when active.
   */
  MAX_PAGE_SIZE = 24;

  constructor(private api: IDEAApiService) {}

  /**
   * Load the applications to an opportunity from the back-end.
   */
  private async loadListOfOpportunity(opportunity: Opportunity): Promise<void> {
    const path = ['opportunities', opportunity.opportunityId, 'applications'];
    const applications: Application[] = await this.api.getResource(path);
    this.applications = applications.map(x => new Application(x));
  }
  /**
   * Get (and optionally filter) the list of applications to an opportunity.
   * Note: it's a slice of the array.
   */
  async getListOfopportunity(
    opportunity: Opportunity,
    options: {
      force?: boolean;
      search?: string;
      showCompleted?: boolean;
      withPagination?: boolean;
      startPaginationAfterId?: string;
    } = {}
  ): Promise<Application[]> {
    if (!this.applications || options.force) await this.loadListOfOpportunity(opportunity);
    if (!this.applications) return null;

    options.search = options.search ? String(options.search).toLowerCase() : '';

    let filteredList = this.applications.slice();

    if (options.search)
      filteredList = filteredList.filter(x =>
        options.search
          .split(' ')
          .every(searchTerm =>
            [x.subject.name, x.subject.country, x.subject.section, x.motivation]
              .filter(f => f)
              .some(f => f.toLowerCase().includes(searchTerm))
          )
      );

    if (options.withPagination && filteredList.length > this.MAX_PAGE_SIZE) {
      let indexOfLastOfPreviousPage = 0;
      if (options.startPaginationAfterId)
        indexOfLastOfPreviousPage =
          filteredList.findIndex(x => x.applicationId === options.startPaginationAfterId) || 0;
      filteredList = filteredList.slice(0, indexOfLastOfPreviousPage + this.MAX_PAGE_SIZE);
    }

    return filteredList;
  }

  /**
   * Apply to an opportunity.
   */
  async insert(opportunity: Opportunity, application: Application): Promise<Application> {
    const path = ['opportunities', opportunity.opportunityId, 'applications'];
    return new Application(await this.api.postResource(path, { body: application }));
  }

  /**
   * Update an application.
   */
  async update(opportunity: Opportunity, application: Application): Promise<Application> {
    const path = ['opportunities', opportunity.opportunityId, 'applications', application.applicationId];
    return new Application(await this.api.putResource(path, { body: application }));
  }

  /**
   * Widhdraw an application.
   */
  async delete(opportunity: Opportunity, application: Application): Promise<void> {
    const path = ['opportunities', opportunity.opportunityId, 'applications', application.applicationId];
    await this.api.deleteResource(path);
  }

  /**
   * Upload a new private attachment related to the application.
   */
  async uploadAttachment(opportunity: Opportunity, file: File): Promise<string> {
    const path = ['opportunities', opportunity.opportunityId, 'applications'];
    const body = { action: 'GET_ATTACHMENT_UPLOAD_URL' };
    const { url, id } = await this.api.patchResource(path, { body });
    await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
    return id;
  }

  /**
   * Download a private attachment related to the application.
   */
  async downloadAttachment(application: Application, expectedName: string): Promise<string> {
    const path = ['opportunities', application.opportunityId, 'applications', application.applicationId];
    const body = { action: 'GET_ATTACHMENT_DOWNLOAD_URL', name: expectedName };
    const { url } = await this.api.patchResource(path, { body });
    return url;
  }

  /**
   * Review the application.
   */
  async review(application: Application, approve: boolean, message: string): Promise<Application> {
    const path = ['opportunities', application.opportunityId, 'applications', application.applicationId];
    const body = { action: approve ? 'REVIEW_APPROVE' : 'REVIEW_REJECT', message };
    return new Application(await this.api.patchResource(path, { body }));
  }
}
