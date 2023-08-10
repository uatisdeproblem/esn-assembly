import { Component, OnInit, ViewChild } from '@angular/core';
import { IonInfiniteScroll, IonRefresher, IonSearchbar } from '@ionic/angular';

import { AppService } from '@app/app.service';
import { TopicsService, TopicsSortBy } from './topics.service';
import { TopicCategoryService } from '../configurations/categories/categories.service';
import { GAEventsService } from '../configurations/events/events.service';

import { TopicCategory } from '@models/category.model';
import { GAEvent } from '@models/event.model';
import { Topic } from '@models/topic.model';

@Component({
  selector: 'topics',
  templateUrl: 'topics.page.html',
  styleUrls: ['topics.page.scss']
})
export class TopicsPage implements OnInit {
  topics: Topic[];

  @ViewChild('searchbar') searchbar: IonSearchbar;

  categories: TopicCategory[];
  filterByCategory: string = null;

  events: GAEvent[];
  filterByEvent: string = null;

  filterByStatus: boolean = null;

  sortBy: TopicsSortBy = TopicsSortBy.CREATED_DATE_DESC;
  TopicsSortBy = TopicsSortBy;

  constructor(
    private _topics: TopicsService,
    private _categories: TopicCategoryService,
    private _events: GAEventsService,
    public app: AppService
  ) {}
  async ngOnInit(): Promise<void> {
    await this.loadResources();
  }
  private async loadResources(): Promise<void> {
    this.topics = await this._topics.getActiveList({ force: true, withPagination: true });
    [this.categories, this.events] = await Promise.all([this._categories.getList(), this._events.getList()]);
  }
  async handleRefresh(refresh: IonRefresher): Promise<void> {
    this.topics = null;
    await this.loadResources();
    refresh.complete();
  }

  async filter(search = '', scrollToNextPage?: IonInfiniteScroll): Promise<void> {
    let startPaginationAfterId = null;
    if (scrollToNextPage && this.topics?.length) startPaginationAfterId = this.topics[this.topics.length - 1].topicId;

    this.topics = await this._topics.getActiveList({
      search,
      categoryId: this.filterByCategory,
      eventId: this.filterByEvent,
      status: this.filterByStatus,
      withPagination: true,
      startPaginationAfterId,
      sortBy: this.sortBy
    });

    if (scrollToNextPage) setTimeout((): Promise<void> => scrollToNextPage.complete(), 100);
  }

  openTopic(topic: Topic): void {
    this.app.goToInTabs(['topics', topic.topicId]);
  }
  addTopic(): void {
    this.app.goToInTabs(['topics', 'new', 'manage']);
  }
}
