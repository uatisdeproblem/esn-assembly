import { Component } from '@angular/core';
import { IonInfiniteScroll } from '@ionic/angular';
import { IDEALoadingService, IDEAMessageService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { OpportunitiesService, OpportunitiesSortBy } from '../opportunities.service';

import { Opportunity } from '@models/opportunity.model';

@Component({
  selector: 'archive',
  templateUrl: 'archive.page.html',
  styleUrls: ['archive.page.scss']
})
export class ArchivePage {
  opportunities: Opportunity[];

  sortBy: OpportunitiesSortBy = OpportunitiesSortBy.CREATED_DATE_DESC;
  OpportunitiesSortBy = OpportunitiesSortBy;

  constructor(
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private _opportunities: OpportunitiesService,
    public app: AppService
  ) {}

  async search(): Promise<void> {
    try {
      await this.loading.show();
      await this.filter(true);
    } catch (error) {
      this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      this.loading.hide();
    }
  }

  async filter(force = false, scrollToNextPage?: IonInfiniteScroll): Promise<void> {
    let startPaginationAfterId = null;
    if (scrollToNextPage && this.opportunities?.length)
      startPaginationAfterId = this.opportunities[this.opportunities.length - 1].opportunityId;

    this.opportunities = await this._opportunities.getArchivedList({
      force,
      withPagination: true,
      startPaginationAfterId,
      sortBy: this.sortBy
    });

    if (scrollToNextPage) setTimeout((): Promise<void> => scrollToNextPage.complete(), 100);
  }

  openOpportunity(opportunity: Opportunity): void {
    this.app.goToInTabs(['opportunities', opportunity.opportunityId]);
  }
}
