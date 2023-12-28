import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertController, IonicModule, ModalController } from '@ionic/angular';
import {
  IDEALoadingService,
  IDEAMessageService,
  IDEATranslationsModule,
  IDEATranslationsService
} from '@idea-ionic/common';

import { ApplicationStandaloneComponent } from './application.component';
import { EventsPickerComponent } from '@app/common/eventsPicker.component';
import { CategoriesPickerComponent } from '@app/common/categoriesPicker.component';

import { AppService } from '@app/app.service';
import { ApplicationsService } from './applications.service';
import { TopicsService } from '../../topics/topics.service';

import { Application } from '@models/application.model';
import { Opportunity } from '@models/opportunity.model';
import { TopicCategoryAttached } from '@models/category.model';
import { GAEventAttached } from '@models/event.model';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IDEATranslationsModule,
    ApplicationStandaloneComponent,
    EventsPickerComponent,
    CategoriesPickerComponent
  ],
  selector: 'app-review-application',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="medium">
        <ion-buttons slot="start">
          <ion-button (click)="close()">
            <ion-icon slot="start" icon="close"></ion-icon> {{ 'COMMON.CLOSE' | translate }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <app-application [application]="application" [card]="true" />
      <ion-list class="ion-padding aList" *ngIf="!opportunity.isArchived()">
        <ion-list-header>
          <ion-label>
            <h2>{{ 'OPPORTUNITIES.YOUR_REVIEW' | translate }}</h2>
            <p>{{ 'OPPORTUNITIES.YOUR_REVIEW_I' | translate }}</p>
            <p>{{ 'OPPORTUNITIES.YOUR_REVIEW_II' | translate }}</p>
          </ion-label>
        </ion-list-header>
        <ion-item color="white">
          <ion-textarea placeholder="..." [(ngModel)]="reviewMessage" [rows]="4"></ion-textarea>
        </ion-item>
        <ion-row class="ion-margin">
          <ion-col [size]="6">
            <ion-button expand="block" color="danger" (click)="review(false)">
              <ion-icon icon="thumbs-down" slot="start" />
              {{ 'OPPORTUNITIES.REVIEW_REJECT' | translate }}
            </ion-button>
          </ion-col>
          <ion-col [size]="6">
            <ion-button expand="block" color="success" (click)="review(true)">
              {{ 'OPPORTUNITIES.REVIEW_APPROVE' | translate }}
              <ion-icon icon="thumbs-up" slot="end" />
            </ion-button>
          </ion-col>
        </ion-row>
      </ion-list>
      <ion-list class="ion-padding aList" *ngIf="opportunity.isClosed() && app.user.isAdministrator">
        <ion-list-header>
          <ion-label>
            <h2>{{ 'OPPORTUNITIES.PROMOTE_TO_QA' | translate }}</h2>
            <p>{{ 'OPPORTUNITIES.PROMOTE_TO_QA_I' | translate }}</p>
          </ion-label>
        </ion-list-header>
        <app-categories-picker
          [class.fieldHasError]="hasFieldAnError('category')"
          [editMode]="true"
          [obligatory]="true"
          [(category)]="promoteTopicCategory"
        ></app-categories-picker>
        <app-events-picker
          [class.fieldHasError]="hasFieldAnError('event')"
          [editMode]="true"
          [obligatory]="true"
          [(event)]="promoteTopicEvent"
        ></app-events-picker>
        <p class="ion-text-right">
          <ion-button (click)="promoteToTopic()">
            {{ 'OPPORTUNITIES.PROMOTE_TO_QA' | translate }} <ion-icon icon="chatbubbles" slot="end" />
          </ion-button>
        </p>
      </ion-list>
    </ion-content>
  `
})
export class ReviewApplicationStandaloneComponent implements OnInit {
  /**
   * The opportunity to which the application refer.
   */
  @Input() opportunity: Opportunity;
  /**
   * The application to to review.
   */
  @Input() application: Application;

  reviewMessage: string;

  promoteTopicCategory: TopicCategoryAttached;
  promoteTopicEvent: GAEventAttached;
  errors = new Set<string>();

  constructor(
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private _applications: ApplicationsService,
    private _topics: TopicsService,
    public app: AppService
  ) {}
  ngOnInit(): void {
    this.reviewMessage = this.application.reviewMessage;
  }

  close(): void {
    this.modalCtrl.dismiss();
  }

  async review(approved: boolean): Promise<void> {
    const doReview = async (): Promise<void> => {
      try {
        await this.loading.show();
        this.application.load(await this._applications.review(this.application, approved, this.reviewMessage));
        this.message.success('COMMON.OPERATION_COMPLETED');
        this.close();
      } catch (err) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const message = this.t._('OPPORTUNITIES.APPLICANT_WILL_RECEIVE_NOTIFICATION');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.CONFIRM'), handler: doReview }
    ];
    const alert = await this.alertCtrl.create({ header, message, buttons });
    alert.present();
  }

  hasFieldAnError(field: string): boolean {
    return this.errors.has(field);
  }

  async promoteToTopic(): Promise<void> {
    this.errors = new Set<string>();
    if (!this.promoteTopicCategory?.categoryId) this.errors.add('category');
    if (!this.promoteTopicEvent?.eventId) this.errors.add('event');
    if (this.errors.size) return this.message.error('COMMON.FORM_HAS_ERROR_TO_CHECK');

    try {
      await this.loading.show();
      const topic = await this._topics.insertFromApplicationToOpportunity(
        this.opportunity,
        this.application,
        this.promoteTopicCategory,
        this.promoteTopicEvent
      );
      this.message.success('COMMON.OPERATION_COMPLETED');
      this.close();
      this.app.goToInTabs(['topics', topic.topicId, 'standard'], { root: true });
    } catch (err) {
      this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      this.loading.hide();
    }
  }
}
