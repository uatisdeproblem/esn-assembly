import { Component, Input, ViewChild } from '@angular/core';
import { IonContent, IonRefresher, IonSearchbar } from '@ionic/angular';
import { Attachment, epochISOString } from 'idea-toolbox';
import { IDEALoadingService, IDEAMessageService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { OpportunitiesService } from './opportunities.service';
import { AttachmentsService } from 'src/app/common/attachments.service';

import { Opportunity } from '@models/opportunity.model';
import { dateStringIsPast, FAVORITE_TIMEZONE } from '@models/favoriteTimezone.const';

@Component({
  selector: 'opportunity',
  templateUrl: 'opportunity.page.html',
  styleUrls: ['opportunity.page.scss']
})
export class OpportunityPage {
  @Input() opportunityId: string;
  opportunity: Opportunity;

  @ViewChild('searchbar') searchbar: IonSearchbar;
  @ViewChild(IonContent) content: IonContent;

  FAVORITE_TIMEZONE = FAVORITE_TIMEZONE;

  constructor(
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private _opportunities: OpportunitiesService,
    private _attachments: AttachmentsService,
    public app: AppService
  ) {}
  async ionViewWillEnter(): Promise<void> {
    try {
      await this.loading.show();
      await this.loadResources();
    } catch (error) {
      this.message.error('COMMON.NOT_FOUND');
    } finally {
      this.loading.hide();
    }
  }
  private async loadResources(): Promise<void> {
    this.opportunity = await this._opportunities.getById(this.opportunityId);
  }
  async handleRefresh(refresh: IonRefresher): Promise<void> {
    this.opportunity = null;
    await this.loadResources();
    refresh.complete();
  }

  manageOpportunity(): void {
    this.app.goToInTabs(['opportunities', this.opportunity.opportunityId, 'manage']);
  }

  async downloadAttachment(attachment: Attachment): Promise<void> {
    try {
      await this.loading.show();
      const url = await this._attachments.download(attachment);
      await this.app.openURL(url);
    } catch (error) {
      this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      this.loading.hide();
    }
  }

  dateStringIsPast(dateString: epochISOString): boolean {
    return dateStringIsPast(dateString, FAVORITE_TIMEZONE);
  }
}
