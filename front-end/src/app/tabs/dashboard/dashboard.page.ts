import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { addDays, isBefore } from 'date-fns';
import { IDEALoadingService, IDEAMessageService } from '@idea-ionic/common';

import { CommunicationDetailComponent } from './communications/communicationDetail.component';
import { ManageCommunicationComponent } from './communications/manageCommunication.component';
import { DeadlinesComponent } from './deadlines/deadlines.component';
import { ManageUsefulLinkComponent } from './usefulLinks/manageUsefulLink.component';
import { StatisticPeriods } from '@app/common/statistics.component';

import { AppService } from '@app/app.service';
import { CommunicationsService } from './communications/communications.service';
import { DeadlinesService } from './deadlines/deadlines.service';
import { UsefulLinksService } from './usefulLinks/usefulLinks.service';
import { StatisticsService } from '@app/common/statistics.service';

import { Communication } from '@models/communication.model';
import { Deadline } from '@models/deadline.model';
import { UsefulLink } from '@models/usefulLink.model';
import { FAVORITE_TIMEZONE } from '@models/favoriteTimezone.const';
import { Statistic, StatisticEntityTypes, StatisticGranularities } from '@models/statistic.model';

/**
 * The number of days to consider a deadline "upcoming"/next.
 */
const NEXT_DEADLINES_NUM_DAYS = 30;

@Component({
  selector: 'dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss']
})
export class DashboardPage implements OnInit {
  communications: Communication[];
  deadlines: Deadline[];
  nextDeadlines: Deadline[];
  usefulLinks: UsefulLink[];

  segment = MobileSegments.NEWS;
  MobileSegments = MobileSegments;

  FAVORITE_TIMEZONE = FAVORITE_TIMEZONE;
  NEXT_DEADLINES_NUM_DAYS = NEXT_DEADLINES_NUM_DAYS;

  editMode = false;

  SET = StatisticEntityTypes;
  Granularities = StatisticGranularities;
  Periods = StatisticPeriods;
  statistic: Statistic;

  constructor(
    private modalCtrl: ModalController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private _communications: CommunicationsService,
    private _deadlines: DeadlinesService,
    private _usefulLinks: UsefulLinksService,
    private _statistics: StatisticsService,
    public app: AppService
  ) {}
  async ngOnInit(): Promise<void> {
    [this.communications, this.deadlines, this.usefulLinks] = await Promise.all([
      this._communications.getList(),
      this._deadlines.getList(),
      this._usefulLinks.getList()
    ]);
    this.nextDeadlines = this.getNextDeadlines();
    if (this.app.user.isAdministrator)
      this.statistic = await this._statistics.recapOfLastNumDays(StatisticPeriods.ONE_MONTH);
  }

  //
  // COMMUNICATIONS
  //

  async openCommunication(communication: Communication): Promise<void> {
    if (this.editMode) return;
    const modal = await this.modalCtrl.create({
      component: CommunicationDetailComponent,
      componentProps: { communication }
    });
    modal.present();

    // request the communication so that it counts in the statistics (even if we don't need it)
    try {
      await this._communications.getById(communication.communicationId);
    } catch (error) {
      // no problem
    }
  }
  async manageCommunication(communication: Communication): Promise<void> {
    if (!this.editMode) return;
    const modal = await this.modalCtrl.create({
      component: ManageCommunicationComponent,
      componentProps: { communication },
      backdropDismiss: false
    });
    modal.onDidDismiss().then(async (): Promise<void> => {
      this.communications = await this._communications.getList({ force: true });
    });
    await modal.present();
  }
  async addCommunication(): Promise<void> {
    await this.manageCommunication(new Communication());
  }

  //
  // DEADLINES
  //

  async openAllDeadlines(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: DeadlinesComponent,
      componentProps: { deadlines: this.deadlines, editMode: this.editMode }
    });
    if (this.editMode)
      modal.onDidDismiss().then(async (): Promise<void> => {
        this.deadlines = await this._deadlines.getList({ force: true });
        this.nextDeadlines = this.getNextDeadlines();
      });
    await modal.present();
  }
  private getNextDeadlines(): Deadline[] {
    return this.deadlines.filter(x => isBefore(new Date(x.at), addDays(new Date(), NEXT_DEADLINES_NUM_DAYS)));
  }

  //
  // USEFUL LINKS
  //

  async openUsefulLink(usefulLink: UsefulLink): Promise<void> {
    if (this.editMode) return;

    this.app.openURL(usefulLink.url);

    // request the link so that it counts in the statistics (even if we don't need it)
    try {
      await this._usefulLinks.getById(usefulLink.linkId);
    } catch (error) {
      // no problem
    }
  }
  async swapSortUsefulLinks(usefulLinkA: UsefulLink, usefulLinkB: UsefulLink, event?: Event): Promise<void> {
    if (event) event.stopPropagation();
    try {
      await this.loading.show();
      await this._usefulLinks.swapSort(usefulLinkA, usefulLinkB);
      this.usefulLinks = await this._usefulLinks.getList();
    } catch (error) {
      this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      this.loading.hide();
    }
  }
  async editUsefulLink(usefulLink: UsefulLink): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ManageUsefulLinkComponent,
      componentProps: { link: usefulLink },
      backdropDismiss: false
    });
    modal.onDidDismiss().then(async (): Promise<void> => {
      this.usefulLinks = await this._usefulLinks.getList({ force: true });
    });
    await modal.present();
  }
  async addUsefulLink(): Promise<void> {
    await this.editUsefulLink(new UsefulLink());
  }
}

enum MobileSegments {
  NEWS = 'NEWS',
  DEADLINES = 'DEADLINES',
  LINKS = 'LINKS'
}
