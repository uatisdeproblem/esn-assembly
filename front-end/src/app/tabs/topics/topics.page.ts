import { Component, OnInit, ViewChild } from '@angular/core';
import { AlertController, IonInfiniteScroll, IonRefresher, IonSearchbar } from '@ionic/angular';
import {
  IDEAActionSheetController,
  IDEALoadingService,
  IDEAMessageService,
  IDEATranslationsService
} from '@idea-ionic/common';

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
  selectedTopicId: string = null;

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
  selectedList = new Set<string>();

  constructor(
    private actionsCtrl: IDEAActionSheetController,
    private t: IDEATranslationsService,
    private _topics: TopicsService,
    private _categories: TopicCategoryService,
    private _events: GAEventsService,
    public app: AppService,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private alertCtrl: AlertController
  ) {}
  async ngOnInit(): Promise<void> {
    await this.loadResources();
  }
  ionViewDidEnter(): void {
    this.filter(null, null, true);

  }
  private async loadResources(): Promise<void> {
    this.selectedList.clear();
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

  handleSelection(event, topic: Topic) {
    if (event) {
      this.selectedTopicId = topic.topicId;
      this.selectedList.add(topic.topicId);
    } else {
      this.selectedList.delete(topic.topicId);
      this.selectedTopicId = null;
    }
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

  async actionOnSelected(): Promise<void> {
    const header = this.t._('TOPICS.CHOOSE_ACTIONS');
    const buttons = [
      {
        text: this.t._('TOPICS.ACTIONS.ARCHIVE'),
        icon: 'archive',
        handler: async () => await this.archiveSelected()
      },
      {
        text: this.t._('TOPICS.ACTIONS.DUPLICATE'),
        icon: 'documents',
        handler: async () => await this.duplicateSelected()
      },
      {
        text: this.t._('TOPICS.ACTIONS.DELETE'),
        icon: 'trash',
        handler: async () => await this.deleteSelected()
      },
      { text: this.t._('COMMON.CANCEL'), role: 'cancel', icon: 'arrow-undo' }
    ];

    const actions = await this.actionsCtrl.create({ header, buttons });
    actions.present();
  }

  async archiveSelected() {
    const topicIds = Array.from(this.selectedList);
    const doArchive = async (): Promise<void> => {
      try {
        await this.loading.show();
        for (const topicId of topicIds) {
          await this._topics.archiveById(topicId);
          this.selectedList.delete(topicId);
        }
        this.message.success('COMMON.OPERATION_COMPLETED');
      } catch (error) {
        if (error.message === 'Unlink related topics first') this.message.error('TOPICS.CANT_DELETE_IF_LINKED_ERROR');
        else this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
        this.loadResources();
      }
    };
    this.selectedList.clear();
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.ARCHIVE'), role: 'destructive', handler: doArchive }
    ];
    const alert = await this.alertCtrl.create({ header, buttons });
    alert.present();
  }
  async deleteSelected() {
    const topicIds = Array.from(this.selectedList);
    const doDelete = async (): Promise<void> => {
      try {
        await this.loading.show();
        for (const topicId of topicIds) {
          await this._topics.deleteById(topicId);
          this.selectedList.delete(topicId);
        }
        this.message.success('COMMON.OPERATION_COMPLETED');
      } catch (error) {
        if (error.message === 'Unlink related topics first') this.message.error('TOPICS.CANT_DELETE_IF_LINKED_ERROR');
        else this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
        this.loadResources();
      }
    };
    this.selectedList.clear();
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const message = this.t._('COMMON.ACTION_IS_IRREVERSIBLE');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.DELETE'), role: 'destructive', handler: doDelete }
    ];
    const alert = await this.alertCtrl.create({ header, message, buttons });
    alert.present();
  }

  async duplicateSelected(): Promise<void> {
    const topicIds = Array.from(this.selectedList);
    const doDuplicate = async (): Promise<void> => {
      try {
        await this.loading.show();
        await this._topics.duplicateTopics(topicIds);
        this.message.success('COMMON.OPERATION_COMPLETED');
      } catch (error) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
        this.loadResources();
      }
    };
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.DUPLICATE'), handler: doDuplicate }
    ];
    const alert = await this.alertCtrl.create({ header, buttons });
    alert.present();
  }
}
