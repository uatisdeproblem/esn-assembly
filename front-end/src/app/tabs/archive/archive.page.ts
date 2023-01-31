import { Component, OnInit } from '@angular/core';
import { IonInfiniteScroll } from '@ionic/angular';
import { IDEALoadingService, IDEAMessageService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { TopicsService, TopicsSortBy } from '../topics/topics.service';
import { TopicCategoryService } from '../configurations/categories/categories.service';
import { TopicEventsService } from '../configurations/events/events.service';

import { TopicCategory } from '@models/category.model';
import { TopicEvent } from '@models/event.model';
import { Topic } from '@models/topic.model';

@Component({
  selector: 'archive',
  templateUrl: 'archive.page.html',
  styleUrls: ['archive.page.scss']
})
export class ArchivePage implements OnInit {
  topics: Topic[];

  categories: TopicCategory[];
  filterByCategory: string = null;

  events: TopicEvent[];
  filterByEvent: string = null;

  sortBy: TopicsSortBy = TopicsSortBy.CREATED_DATE_DESC;
  TopicsSortBy = TopicsSortBy;

  constructor(
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private _topics: TopicsService,
    private _categories: TopicCategoryService,
    private _events: TopicEventsService,
    public app: AppService
  ) {}
  async ngOnInit(): Promise<void> {
    [this.categories, this.events] = await Promise.all([this._categories.getList(), this._events.getList()]);
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
    if (scrollToNextPage && this.topics?.length) startPaginationAfterId = this.topics[this.topics.length - 1].topicId;

    this.topics = await this._topics.getArchivedList({
      force,
      categoryId: this.filterByCategory,
      eventId: this.filterByEvent,
      withPagination: true,
      startPaginationAfterId,
      sortBy: this.sortBy
    });

    if (scrollToNextPage) setTimeout((): Promise<void> => scrollToNextPage.complete(), 100);
  }

  openTopic(topic: Topic): void {
    this.app.goToInTabs(['topics', topic.topicId]);
  }
}
