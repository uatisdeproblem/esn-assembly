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

import { ApplicationsService } from './applications.service';

import { Application } from '@models/application.model';
import { Opportunity } from '@models/opportunity.model';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslationsModule, ApplicationStandaloneComponent],
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

  constructor(
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private _applications: ApplicationsService
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
}
