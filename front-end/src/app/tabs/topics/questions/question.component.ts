import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { IDEALoadingService, IDEAMessageService, IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { QuestionsService } from './questions.service';
import { AnswersService } from './answers/answers.service';

import { Question } from '@models/question.model';
import { Answer } from '@models/answer.model';
import { Topic } from '@models/topic.model';
import { Subject } from '@models/subject.model';

@Component({
  selector: 'app-question',
  templateUrl: 'question.component.html',
  styleUrls: ['question.component.scss']
})
export class QuestionComponent implements OnInit {
  /**
   * The question's topic.
   */
  @Input() topic: Topic;
  /**
   * The question to show.
   */
  @Input() question: Question;

  /**
   * Trigger for deleting the question.
   */
  @Output() delete = new EventEmitter<void>();

  answers: Answer[];
  userUpvoted: boolean;

  newAnswer: Answer;
  errors = new Set<string>();

  constructor(
    private alertCtrl: AlertController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private _questions: QuestionsService,
    private _answers: AnswersService,
    public app: AppService
  ) {}
  async ngOnInit(): Promise<void> {
    [this.answers, this.userUpvoted] = await Promise.all([
      this._answers.getListOfQuestion(this.question),
      this._questions.userHasUpvoted(this.topic, this.question)
    ]);
  }

  async upvoteQuestion(upvote: boolean): Promise<void> {
    try {
      this.userUpvoted = upvote;
      if (upvote) await this._questions.upvote(this.topic, this.question);
      else await this._questions.upvoteCancel(this.topic, this.question);
    } catch (error) {
      this.userUpvoted = !upvote;
      this.message.error('COMMON.OPERATION_FAILED');
    }
  }

  async deleteQuestion(): Promise<void> {
    const doDelete = async (): Promise<void> => {
      try {
        await this.loading.show();
        await this._questions.delete(this.topic, this.question);
        this.message.success('COMMON.OPERATION_COMPLETED');
        this.delete.emit();
      } catch (error) {
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

  writeAnswer(): void {
    this.newAnswer = new Answer({ creator: Subject.fromUser(this.app.user) });
  }
  async cancelNewAnswer(): Promise<void> {
    if (!this.newAnswer.text) {
      this.newAnswer = null;
      return;
    }

    const header = this.t._('COMMON.ARE_YOU_SURE');
    const message = this.t._('QUESTIONS.YOU_WILL_LOSE_THE_CONTENT');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.CONFIRM'), role: 'destructive', handler: (): void => (this.newAnswer = null) }
    ];
    const alert = await this.alertCtrl.create({ header, message, buttons });
    alert.present();
  }
  async sendNewAnswer(): Promise<void> {
    this.errors = new Set(this.newAnswer.validate());
    if (this.errors.size) return this.message.error('COMMON.FORM_HAS_ERROR_TO_CHECK');

    const doSend = async (): Promise<void> => {
      try {
        await this.loading.show();
        const answer = await this._answers.insert(this.question, this.newAnswer);
        this.answers.push(answer);
        this.newAnswer = null;
        this.message.success('COMMON.OPERATION_COMPLETED');
      } catch (err) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };

    const header = this.t._('COMMON.ARE_YOU_SURE');
    const message = this.t._('QUESTIONS.IS_YOUR_ANSWER_READY');
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
