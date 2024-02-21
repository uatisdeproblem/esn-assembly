import { Component, OnInit, ViewChild } from '@angular/core';
import { IonInfiniteScroll, IonRefresher, IonSearchbar } from '@ionic/angular';
import { IDEAActionSheetController, IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { TopicsService, TopicsSortBy, TopicsFilterByStatus } from './topics.service';
import { TopicCategoryService } from '../configurations/categories/categories.service';
import { GAEventsService } from '../configurations/events/events.service';

import { TopicCategory } from '@models/category.model';
import { GAEvent } from '@models/event.model';
import { Topic, TopicTypes } from '@models/topic.model';
import { StatisticEntityTypes } from '@models/statistic.model';

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

  filterByStatus: TopicsFilterByStatus = null;
  Statuses = TopicsFilterByStatus;

  TopicTypes = TopicTypes;
  filterByType: TopicTypes = null;

  sortBy: TopicsSortBy = TopicsSortBy.CREATED_DATE_DESC;
  TopicsSortBy = TopicsSortBy;

  SET = StatisticEntityTypes;

  constructor(
    private actionsCtrl: IDEAActionSheetController,
    private t: IDEATranslationsService,
    private _topics: TopicsService,
    private _categories: TopicCategoryService,
    private _events: GAEventsService,
    public app: AppService
  ) {}
  async ngOnInit(): Promise<void> {
    await this.loadResources();
  }
  ionViewDidEnter(): void {
    this.filter(null, null, true);
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

  async filter(search = '', scrollToNextPage?: IonInfiniteScroll, force = false): Promise<void> {
    let startPaginationAfterId = null;
    if (scrollToNextPage && this.topics?.length) startPaginationAfterId = this.topics[this.topics.length - 1].topicId;

    this.topics = await this._topics.getActiveList({
      force,
      search,
      categoryId: this.filterByCategory,
      eventId: this.filterByEvent,
      status: this.filterByStatus,
      type: this.filterByType,
      withPagination: true,
      startPaginationAfterId,
      sortBy: this.sortBy
    });

    if (scrollToNextPage) setTimeout((): Promise<void> => scrollToNextPage.complete(), 100);
  }

  openTopic(topic: Topic): void {
    this.app.goToInTabs(['topics', topic.topicId, topic.type === TopicTypes.LIVE ? 'live' : 'standard']);
  }
  async addTopic(): Promise<void> {
    const header = this.t._('TOPICS.CHOOSE_TYPE');
    const buttons = [
      {
        text: this.t._('TOPICS.TYPES.STANDARD'),
        icon: 'chatbubbles',
        handler: (): void => this.app.goToInTabs(['topics', 'new-standard', 'manage'])
      },
      {
        text: this.t._('TOPICS.TYPES.LIVE'),
        icon: 'pulse',
        handler: (): void => this.app.goToInTabs(['topics', 'new-live', 'manage'])
      },
      { text: this.t._('COMMON.CANCEL'), role: 'cancel', icon: 'arrow-undo' }
    ];

    const actions = await this.actionsCtrl.create({ header, buttons });
    actions.present();
  }
}
