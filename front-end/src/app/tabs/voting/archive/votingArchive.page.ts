import { Component, OnInit } from '@angular/core';
import { IonInfiniteScroll } from '@ionic/angular';
import { IDEALoadingService, IDEAMessageService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { VotingService, VotingSessionsSortBy } from '../voting.service';
import { GAEventsService } from '../../configurations/events/events.service';

import { VotingSession } from '@models/votingSession.model';
import { GAEvent } from '@models/event.model';

@Component({
  selector: 'voting-archive',
  templateUrl: 'votingArchive.page.html',
  styleUrls: ['votingArchive.page.scss']
})
export class VotingArchivePage implements OnInit {
  votingSessions: VotingSession[];

  events: GAEvent[];
  filterByEvent: string = null;

  sortBy: VotingSessionsSortBy = VotingSessionsSortBy.CREATED_DATE_DESC;
  SortBy = VotingSessionsSortBy;

  constructor(
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private _voting: VotingService,
    private _events: GAEventsService,
    public app: AppService
  ) {}
  async ngOnInit(): Promise<void> {
    this.events = await this._events.getList({ all: true });
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
    if (scrollToNextPage && this.votingSessions?.length)
      startPaginationAfterId = this.votingSessions[this.votingSessions.length - 1].sessionId;

    this.votingSessions = await this._voting.getArchivedList({
      force,
      eventId: this.filterByEvent,
      withPagination: true,
      startPaginationAfterId,
      sortBy: this.sortBy
    });

    if (scrollToNextPage) setTimeout((): Promise<void> => scrollToNextPage.complete(), 100);
  }

  goToVotingSession(votingSession: VotingSession): void {
    this.app.goToInTabs(['voting', votingSession.sessionId]);
  }
}
