import { Component, Input } from '@angular/core';
import { AlertController, IonInfiniteScroll, IonRefresher } from '@ionic/angular';
import { toCanvas } from 'qrcode';
import { Attachment } from 'idea-toolbox';
import {
  IDEAActionSheetController,
  IDEALoadingService,
  IDEAMessageService,
  IDEATranslationsService
} from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { TopicsService } from './topics.service';
import { AttachmentsService } from 'src/app/common/attachments.service';
import { MessagesService, MessagesSortBy } from './messages/messages.service';

import { environment as env } from '@env';
import { Topic, TopicTypes } from '@models/topic.model';
import { Message, MessageTypes } from '@models/message.model';
import { Subject } from '@models/subject.model';
import { FAVORITE_TIMEZONE } from '@models/favoriteTimezone.const';

@Component({
  selector: 'live-topic',
  templateUrl: 'liveTopic.page.html',
  styleUrls: ['liveTopic.page.scss']
})
export class LiveTopicPage {
  @Input() topicId: string;
  topic: Topic;

  questions: Message[];
  showCompletedQuestions = false;
  sortQuestionsBy = MessagesSortBy.CREATION_ASC;

  appreciations: Message[];
  showCompletedAppreciations = false;
  sortAppreciationsBy = MessagesSortBy.CREATION_ASC;

  MessageTypes = MessageTypes;
  MessagesSortBy = MessagesSortBy;
  newMessage: Message;
  errors = new Set<string>();

  FAVORITE_TIMEZONE = FAVORITE_TIMEZONE;

  relatedTopics: Topic[];

  showTopicDetails: boolean;
  segment = MessageTypes.QUESTION;
  fullScreen = false;

  hideQuestions = false;
  hideAppreciations = false;

  constructor(
    private alertCtrl: AlertController,
    private actionsCtrl: IDEAActionSheetController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private _topics: TopicsService,
    private _attachments: AttachmentsService,
    private _messages: MessagesService,
    public app: AppService
  ) {}
  async ionViewWillEnter(): Promise<void> {
    try {
      await this.loading.show();
      await this.loadResources();
      this.showTopicDetails = !this.app.isInMobileMode();
    } catch (error) {
      this.message.error('COMMON.NOT_FOUND');
    } finally {
      this.loading.hide();
    }
  }
  private async loadResources(): Promise<void> {
    this.topic = await this._topics.getById(this.topicId);
    [, this.relatedTopics] = await Promise.all([
      this._messages.getListOfTopic(this.topic),
      this._topics.getRelated(this.topic)
    ]);
    await this.filterQuestions();
    await this.filterAppreciations();
  }
  async handleRefresh(refresh: IonRefresher): Promise<void> {
    this.questions = null;
    this.appreciations = null;
    await this.loadResources();
    refresh.complete();
  }

  manageTopic(): void {
    this.app.goToInTabs(['topics', this.topic.topicId, 'manage']);
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

  async filterQuestions(scrollToNextPage?: IonInfiniteScroll): Promise<void> {
    let startPaginationAfterId = null;
    if (scrollToNextPage && this.questions?.length)
      startPaginationAfterId = this.questions[this.questions.length - 1].messageId;

    this.questions = await this._messages.getListOfTopic(this.topic, {
      filterByType: MessageTypes.QUESTION,
      showCompleted: this.topic.isClosed() ? true : this.showCompletedQuestions,
      sortBy: this.sortQuestionsBy,
      withPagination: true,
      startPaginationAfterId
    });

    if (scrollToNextPage) setTimeout((): Promise<void> => scrollToNextPage.complete(), 100);
  }
  async filterAppreciations(scrollToNextPage?: IonInfiniteScroll): Promise<void> {
    let startPaginationAfterId = null;
    if (scrollToNextPage && this.appreciations?.length)
      startPaginationAfterId = this.appreciations[this.appreciations.length - 1].messageId;

    this.appreciations = await this._messages.getListOfTopic(this.topic, {
      filterByType: MessageTypes.APPRECIATION,
      showCompleted: this.topic.isClosed() ? true : this.showCompletedAppreciations,
      sortBy: this.sortAppreciationsBy,
      withPagination: true,
      startPaginationAfterId
    });

    if (scrollToNextPage) setTimeout((): Promise<void> => scrollToNextPage.complete(), 100);
  }

  startNewMessage(appreciation = false): void {
    this.newMessage = new Message({
      topicId: this.topic.topicId,
      creator: Subject.fromUser(this.app.user),
      type: appreciation ? MessageTypes.APPRECIATION : MessageTypes.QUESTION
    });
  }

  handleMessageMarkedAnonymous(anonymous: boolean): void {
    if (anonymous) delete this.newMessage.creator;
    else this.newMessage.creator = Subject.fromUser(this.app.user);
  }

  async cancelNewMessage(): Promise<void> {
    const doCancel = (): void => {
      this.errors = new Set();
      this.newMessage = null;
    };

    if (!this.newMessage.summary && !this.newMessage.text) return doCancel();

    const header = this.t._('COMMON.ARE_YOU_SURE');
    const message = this.t._('MESSAGES.YOU_WILL_LOSE_THE_CONTENT');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.CONFIRM'), role: 'destructive', handler: doCancel }
    ];
    const alert = await this.alertCtrl.create({ header, message, buttons });
    alert.present();
  }
  async sendNewMessage(): Promise<void> {
    this.errors = new Set(this.newMessage.validate(this.topic));
    if (this.errors.size) return this.message.error('COMMON.FORM_HAS_ERROR_TO_CHECK');

    const doSend = async (): Promise<void> => {
      try {
        await this.loading.show();
        const message = await this._messages.insert(this.topic, this.newMessage);
        // @todo to check
        if (message.type === MessageTypes.QUESTION) this.questions.push(message);
        if (message.type === MessageTypes.APPRECIATION) this.appreciations.push(message);
        this.newMessage = null;
        this.message.success('COMMON.OPERATION_COMPLETED');
      } catch (err) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };

    const header = this.t._('MESSAGES.IS_YOUR_MESSAGE_READY');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.SEND'), role: 'destructive', handler: doSend }
    ];
    const alert = await this.alertCtrl.create({ header, buttons });
    alert.present();
  }
  hasFieldAnError(field: string): boolean {
    return this.errors.has(field);
  }

  async upvoteMessage(message: Message): Promise<void> {
    // @todo
  }
  hasUserUpvotedMessage(message: Message): boolean {
    // @todo
    return false;
  }
  async seeMessageUpvoters(message: Message): Promise<void> {
    // @todo
  }
  private async markMessageComplete(message: Message): Promise<void> {
    // @todo
  }
  private async deleteMessage(message: Message): Promise<void> {
    // @todo
  }
  private async deleteMessageAndBanUser(message: Message): Promise<void> {
    // @todo
  }
  async actionsOnMessage(message: Message): Promise<void> {
    if (!message) return;

    const header = this.t._('MESSAGES.ACTIONS');
    const buttons = [];

    buttons.push({
      text: this.t._('MESSAGES.MARK_COMPLETE'),
      icon: 'checkmark-done',
      handler: (): Promise<void> => this.markMessageComplete(message)
    });

    if (this.app.user.isAdministrator) {
      buttons.push({
        text: this.t._('MESSAGES.SEE_UPVOTERS'),
        icon: 'eye',
        handler: (): Promise<void> => this.seeMessageUpvoters(message)
      });
    }

    buttons.push({
      text: this.t._('MESSAGES.DELETE'),
      icon: 'trash',
      role: 'destructive',
      handler: (): Promise<void> => this.deleteMessage(message)
    });
    if (this.app.user.isAdministrator && message.creator) {
      buttons.push({
        text: this.t._('MESSAGES.DELETE_AND_BAN_USER'),
        icon: 'ban',
        role: 'destructive',
        handler: (): Promise<void> => this.deleteMessageAndBanUser(message)
      });
    }

    buttons.push({ text: this.t._('COMMON.CANCEL'), role: 'cancel', icon: 'arrow-undo' });

    const actions = await this.actionsCtrl.create({ header, buttons });
    actions.present();
  }

  openTopic(topic: Topic): void {
    this.app.goToInTabs(['topics', topic.topicId, topic.type === TopicTypes.LIVE ? 'live' : 'standard']);
  }

  async enterFullScreen(): Promise<void> {
    this.fullScreen = true;
    setTimeout((): void => {
      this.generateQRCodeCanvasByURL(env.idea.app.url.concat(`t/topics/${this.topic.topicId}/live`));
    });
  }
  exitFullScreen(): void {
    this.hideQuestions = false;
    this.hideAppreciations = false;
    this.fullScreen = false;
  }

  private generateQRCodeCanvasByURL(url: string): Promise<void> {
    return new Promise((resolve, reject): void => {
      const container = document.getElementById('qrCodeContainer');
      container.innerHTML = '';
      toCanvas(url, { errorCorrectionLevel: 'L' }, (err: Error, canvas: HTMLCanvasElement): void => {
        if (err) return reject(err);
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.borderRadius = '4px';
        container.appendChild(canvas);
        resolve();
      });
    });
  }
}
