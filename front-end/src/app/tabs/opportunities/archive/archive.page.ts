import { Component, OnInit } from '@angular/core';
import { IonInfiniteScroll } from '@ionic/angular';
import { IDEALoadingService, IDEAMessageService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { OpportunitiesService, OpportunitiesSortBy } from '../opportunities.service';

import { Opportunity } from '@models/opportunity.model';

const FIRST_YEAR_FOR_ARCHIVE = 2023;

@Component({
  selector: 'archive',
  templateUrl: 'archive.page.html',
  styleUrls: ['archive.page.scss']
})
export class ArchivePage implements OnInit {
  opportunities: Opportunity[];

  years: number[];
  archivedFromYear = new Date().getFullYear();

  sortBy: OpportunitiesSortBy = OpportunitiesSortBy.CREATED_DATE_DESC;
  OpportunitiesSortBy = OpportunitiesSortBy;

  constructor(
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private _opportunities: OpportunitiesService,
    public app: AppService
  ) {}
  ngOnInit(): void {
    this.years = this.getYearsSince(FIRST_YEAR_FOR_ARCHIVE);
  }

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

    this.opportunities = await this._opportunities.getArchivedListFromYear(this.archivedFromYear, {
      force,
      withPagination: true,
      startPaginationAfterId,
      sortBy: this.sortBy
    });

    if (scrollToNextPage) setTimeout((): Promise<void> => scrollToNextPage.complete(), 100);
  }

  private getYearsSince(firstYear: number): number[] {
    const years: number[] = [];
    const currentYear = new Date().getFullYear();
    for (let year = firstYear; year <= currentYear; year++) years.push(year);
    return years;
  }

  openOpportunity(opportunity: Opportunity): void {
    this.app.goToInTabs(['opportunities', opportunity.opportunityId]);
  }
}
