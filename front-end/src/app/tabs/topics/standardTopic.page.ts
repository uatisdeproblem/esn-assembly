import { Component, Input, ViewChild } from '@angular/core';
import { AlertController, IonContent, IonInfiniteScroll, IonRefresher, IonSearchbar } from '@ionic/angular';
import { Attachment, epochISOString } from 'idea-toolbox';
import { IDEALoadingService, IDEAMessageService, IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { TopicsService } from './topics.service';
import { PublicAttachmentsService } from 'src/app/common/attachments.service';
import { QuestionsService } from './questions/questions.service';
import { UserDraftsService } from './drafts/drafts.service';

import { Topic, TopicTypes } from '@models/topic.model';
import { Question } from '@models/question.model';
import { Subject } from '@models/subject.model';
import { dateStringIsPast, FAVORITE_TIMEZONE } from '@models/favoriteTimezone.const';
import { UserDraft } from '@models/userDraft.model';

@Component({
  selector: 'standard-topic',
  templateUrl: 'standardTopic.page.html',
  styleUrls: ['standardTopic.page.scss']
})
export class StandardTopicPage {
  @Input() topicId: string;
  topic: Topic;
  questions: Question[];

  currentQuestion: Question;

  newQuestion: Question;
  errors = new Set<string>();

  @ViewChild('searchbar') searchbar: IonSearchbar;
  @ViewChild(IonContent) content: IonContent;

  FAVORITE_TIMEZONE = FAVORITE_TIMEZONE;

  relatedTopics: Topic[];

  drafts: UserDraft[];
  fromDraft: UserDraft;

  constructor(
    private alertCtrl: AlertController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private _topics: TopicsService,
    private _attachments: PublicAttachmentsService,
    private _questions: QuestionsService,
    private _drafts: UserDraftsService,
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
    this.topic = await this._topics.getById(this.topicId);
    [, this.relatedTopics, this.drafts] = await Promise.all([
      this.filterQuestions(this.searchbar?.value, null, true),
      this._topics.getRelated(this.topic),
      this._drafts.getQuestionsOfTopic(this.topic)
    ]);
  }
  async handleRefresh(refresh: IonRefresher): Promise<void> {
    this.questions = null;
    this.drafts = null;
    await this.loadResources();
    refresh.complete();
  }

  selectQuestion(question: Question): void {
    this.currentQuestion = question;
    if (this.currentQuestion) this.content.scrollToTop(500);
  }
  async removeCurrentQuestionFromList(): Promise<void> {
    this.currentQuestion = null;
    await this.filterQuestions(this.searchbar?.value, null, true);
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

  async filterQuestions(search = '', scrollToNextPage?: IonInfiniteScroll, force = false): Promise<void> {
    let startPaginationAfterId = null;
    if (scrollToNextPage && this.questions?.length)
      startPaginationAfterId = this.questions[this.questions.length - 1].topicId;

    this.questions = await this._questions.getListOfTopic(this.topic, {
      force,
      search,
      withPagination: true,
      startPaginationAfterId
    });

    if (scrollToNextPage) setTimeout((): Promise<void> => scrollToNextPage.complete(), 100);
  }

  startNewQuestion(draft?: UserDraft): void {
    this.selectQuestion(null);
    this.newQuestion = new Question({ creator: Subject.fromUser(this.app.user), topicId: this.topic.topicId });
    this.fromDraft = null;
    if (draft) {
      this.fromDraft = draft;
      this.newQuestion.summary = draft.summary;
      this.newQuestion.text = draft.text;
    }
    setTimeout((): void => {
      const newQuestionElement = document.getElementById('newQuestion');
      if (newQuestionElement) this.content.scrollToPoint(0, newQuestionElement.getBoundingClientRect().top - 100, 500);
    }, 100);
  }
  async cancelNewQuestion(): Promise<void> {
    const doCancel = (): void => {
      this.newQuestion = null;
      this.fromDraft = null;
    };

    if (!this.newQuestion.summary && !this.newQuestion.text) return doCancel();

    const header = this.t._('COMMON.ARE_YOU_SURE');
    const message = this.t._('QUESTIONS.YOU_WILL_LOSE_THE_CONTENT');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.CONFIRM'), role: 'destructive', handler: doCancel }
    ];
    const alert = await this.alertCtrl.create({ header, message, buttons });
    alert.present();
  }
  async sendNewQuestion(): Promise<void> {
    this.errors = new Set(this.newQuestion.validate());
    if (this.errors.size) return this.message.error('COMMON.FORM_HAS_ERROR_TO_CHECK');

    const doSend = async (): Promise<void> => {
      try {
        await this.loading.show();
        await this._questions.insert(this.topic, this.newQuestion);
        await this.filterQuestions(this.searchbar?.value, null, true);
        this.newQuestion = null;
        try {
          if (this.fromDraft) {
            await this._drafts.delete(this.fromDraft);
            this.drafts.splice(this.drafts.indexOf(this.fromDraft), 1);
            this.fromDraft = null;
          }
        } catch (error) {
          // no problem
        }
        this.message.success('COMMON.OPERATION_COMPLETED');
      } catch (err) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };

    const header = this.t._('COMMON.ARE_YOU_SURE');
    const message = this.t._('QUESTIONS.IS_YOUR_QUESTION_READY');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.SEND'), role: 'destructive', handler: doSend }
    ];
    const alert = await this.alertCtrl.create({ header, message, buttons });
    alert.present();
  }
  hasFieldAnError(field: string): boolean {
    return this.errors.has(field);
  }

  async saveNewQuestionAsDraft(): Promise<void> {
    this.errors = new Set(this.newQuestion.validate());
    if (this.errors.size) return this.message.error('COMMON.FORM_HAS_ERROR_TO_CHECK');

    try {
      await this.loading.show();
      this.fromDraft = UserDraft.fromQuestion(this.newQuestion, this.fromDraft);
      if (this.fromDraft.draftId) await this._drafts.update(this.fromDraft);
      else {
        const newDraft = await this._drafts.insert(this.fromDraft);
        this.drafts.push(newDraft);
      }
      this.newQuestion = null;
      this.fromDraft = null;
      this.message.success('COMMON.OPERATION_COMPLETED');
    } catch (err) {
      this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      this.loading.hide();
    }
  }
  async deleteDraft(draft: UserDraft): Promise<void> {
    const doDelete = async (): Promise<void> => {
      try {
        await this.loading.show();
        await this._drafts.delete(draft);
        this.drafts.splice(this.drafts.indexOf(draft), 1);
      } catch (err) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };

    const header = this.t._('COMMON.ARE_YOU_SURE');
    const message = this.t._('COMMON.ACTION_IS_IRREVERSIBLE');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.DELETE'), role: 'destructive', handler: doDelete }
    ];
    const alert = await this.alertCtrl.create({ header, message, buttons });
    alert.present();
  }

  openTopic(topic: Topic): void {
    this.app.goToInTabs(['topics', topic.topicId, topic.type === TopicTypes.LIVE ? 'live' : 'standard']);
  }

  dateStringIsPast(dateString: epochISOString): boolean {
    return dateStringIsPast(dateString, FAVORITE_TIMEZONE);
  }
}
