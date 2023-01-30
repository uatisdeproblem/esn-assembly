import { Component } from '@angular/core';
import { IonInfiniteScroll } from '@ionic/angular';

import { AppService } from '@app/app.service';
import { TopicEventsService } from './events.service';

import { TopicEvent } from '@models/event.model';

@Component({
  selector: 'events',
  templateUrl: 'events.page.html',
  styleUrls: ['events.page.scss']
})
export class EventsPage {
  events: TopicEvent[];

  constructor(private _events: TopicEventsService, public app: AppService) {}
  async ionViewDidEnter(): Promise<void> {
    this.events = await this._events.getList({ force: true, withPagination: true });
  }

  async paginate(scrollToNextPage?: IonInfiniteScroll): Promise<void> {
    let startPaginationAfterId = null;
    if (scrollToNextPage && this.events?.length) startPaginationAfterId = this.events[this.events.length - 1].eventId;

    this.events = await this._events.getList({ withPagination: true, startPaginationAfterId });

    if (scrollToNextPage) setTimeout((): Promise<void> => scrollToNextPage.complete(), 100);
  }

  addEvent(): void {
    this.app.goToInTabs(['configurations', 'events', 'new']);
  }
  openEvent(event: TopicEvent): void {
    this.app.goToInTabs(['configurations', 'events', event.eventId]);
  }
}
