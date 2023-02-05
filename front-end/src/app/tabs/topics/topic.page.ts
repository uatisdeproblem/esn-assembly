import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, IonContent, IonInfiniteScroll, IonSearchbar } from '@ionic/angular';
import { Browser } from '@capacitor/browser';
import { Attachment } from 'idea-toolbox';
import { IDEALoadingService, IDEAMessageService, IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { TopicsService } from './topics.service';
import { AttachmentsService } from 'src/app/common/attachments.service';
import { QuestionsService } from './questions/questions.service';

import { Topic } from '@models/topic.model';
import { Question } from '@models/question.model';
import { Subject } from '@models/subject.model';
import { FAVORITE_TIMEZONE } from '@models/favoriteTimezone.const';

@Component({
  selector: 'topic',
  templateUrl: 'topic.page.html',
  styleUrls: ['topic.page.scss']
})
export class TopicPage {
  topic: Topic;
  questions: Question[];

  currentQuestion: Question;

  newQuestion: Question;
  errors = new Set<string>();

  @ViewChild('searchbar') searchbar: IonSearchbar;
  @ViewChild(IonContent) content: IonContent;

  FAVORITE_TIMEZONE = FAVORITE_TIMEZONE;

  constructor(
    private route: ActivatedRoute,
    private alertCtrl: AlertController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private _topics: TopicsService,
    private _attachments: AttachmentsService,
    private _questions: QuestionsService,
    public app: AppService
  ) {}
  async ionViewWillEnter(): Promise<void> {
    const topicId = this.route.snapshot.paramMap.get('topicId');
    try {
      await this.loading.show();
      this.topic = await this._topics.getById(topicId);
      await this.filterQuestions(this.searchbar?.value, null, true);
    } catch (error) {
      this.message.error('COMMON.NOT_FOUND');
    } finally {
      this.loading.hide();
    }
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
      await Browser.open({ url });
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

  startNewQuestion(): void {
    this.selectQuestion(null);
    this.newQuestion = new Question({ creator: Subject.fromUser(this.app.user) });
  }
  async cancelNewQuestion(): Promise<void> {
    if (!this.newQuestion.summary && !this.newQuestion.text) {
      this.newQuestion = null;
      return;
    }

    const header = this.t._('COMMON.ARE_YOU_SURE');
    const message = this.t._('QUESTIONS.YOU_WILL_LOSE_THE_CONTENT');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.CONFIRM'), role: 'destructive', handler: (): void => (this.newQuestion = null) }
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
}
