import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, Input } from '@angular/core';
import { AlertController, IonicModule, ModalController } from '@ionic/angular';
import {
  IDEADateTimeModule,
  IDEALoadingService,
  IDEAMessageService,
  IDEATranslationsModule,
  IDEATranslationsService
} from '@idea-ionic/common';

import { EventsPickerComponent } from 'src/app/common/eventsPicker.component';

import { DeadlinesService } from './deadlines.service';

import { Deadline } from '@models/deadline.model';
import { FAVORITE_TIMEZONE } from '@models/favoriteTimezone.const';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslationsModule, IDEADateTimeModule, EventsPickerComponent],
  selector: 'app-manage-deadline',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="medium">
        <ion-buttons slot="start">
          <ion-button [title]="'COMMON.CANCEL' | translate" (click)="close()">
            <ion-icon slot="icon-only" icon="close-circle"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ 'DEADLINES.MANAGE_DEADLINE' | translate }}</ion-title>
        <ion-buttons slot="end">
          <ion-button [title]="'COMMON.SAVE' | translate" (click)="save()">
            <ion-icon slot="icon-only" icon="checkmark-circle"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list class="aList" lines="full">
        <ion-item [class.fieldHasError]="hasFieldAnError('name')">
          <ion-label position="stacked">
            {{ 'DEADLINES.NAME' | translate }} <ion-text class="obligatoryDot"></ion-text>
          </ion-label>
          <ion-input [(ngModel)]="deadline.name"></ion-input>
        </ion-item>
        <ion-item [class.fieldHasError]="hasFieldAnError('action')">
          <ion-label position="stacked">
            {{ 'DEADLINES.ACTION' | translate }}
          </ion-label>
          <ion-input [(ngModel)]="deadline.action"></ion-input>
        </ion-item>
        <ion-item *ngIf="deadline.action" [class.fieldHasError]="hasFieldAnError('actionColor')">
          <ion-label position="stacked">
            {{ 'DEADLINES.ACTION_COLOR' | translate }}
          </ion-label>
          <ion-select interface="popover" [(ngModel)]="deadline.actionColor">
            <ion-select-option [value]="null"></ion-select-option>
            <ion-select-option *ngFor="let color of COLORS" [value]="color">{{ color }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item [class.fieldHasError]="hasFieldAnError('target')">
          <ion-label position="stacked">
            {{ 'DEADLINES.TARGET' | translate }}
          </ion-label>
          <ion-input [(ngModel)]="deadline.target"></ion-input>
        </ion-item>
        <app-events-picker
          [class.fieldHasError]="hasFieldAnError('event')"
          [editMode]="true"
          [(event)]="deadline.event"
        ></app-events-picker>
        <idea-date-time
          [(date)]="deadline.at"
          [useISOFormat]="true"
          [manualTimePicker]="true"
          [label]="'DEADLINES.DATE' | translate"
          [obligatory]="true"
          [hideClearButton]="true"
          [class.fieldHasError]="hasFieldAnError('at')"
        ></idea-date-time>
        <ion-item-divider>
          <ion-label class="ion-text-wrap ion-padding-start">
            <p>
              <i>{{ 'DEADLINES.DATES_I' | translate : { timezone: FAVORITE_TIMEZONE } }}</i>
            </p>
          </ion-label>
        </ion-item-divider>
        <ion-row class="ion-padding-top" *ngIf="deadline.deadlineId">
          <ion-col class="ion-text-right ion-padding-end">
            <ion-button color="danger" (click)="askAndDelete()">{{ 'COMMON.DELETE' | translate }}</ion-button>
          </ion-col>
        </ion-row>
      </ion-list>
    </ion-content>
  `
})
export class ManageDeadlineComponent {
  /**
   * The deadline to manage.
   */
  @Input() deadline: Deadline;

  errors = new Set<string>();

  FAVORITE_TIMEZONE = FAVORITE_TIMEZONE;
  COLORS = [
    'primary',
    'secondary',
    'tertiary',
    'white',
    'dark',
    'light',
    'medium',
    'success',
    'danger',
    'ESNgreen',
    'ESNcyan',
    'ESNpink',
    'ESNdarkBlue',
    'ESNorange'
  ];

  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private t: IDEATranslationsService,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private _deadlines: DeadlinesService
  ) {}

  hasFieldAnError(field: string): boolean {
    return this.errors.has(field);
  }

  async save(): Promise<void> {
    this.errors = new Set(this.deadline.validate());
    if (this.errors.size) return this.message.error('COMMON.FORM_HAS_ERROR_TO_CHECK');

    try {
      await this.loading.show();
      let result: Deadline;
      if (!this.deadline.deadlineId) result = await this._deadlines.insert(this.deadline);
      else result = await this._deadlines.update(this.deadline);
      this.deadline.load(result);
      this.message.success('COMMON.OPERATION_COMPLETED');
      this.close();
    } catch (err) {
      this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      this.loading.hide();
    }
  }
  close(): void {
    this.modalCtrl.dismiss();
  }

  async askAndDelete(): Promise<void> {
    const doDelete = async (): Promise<void> => {
      try {
        await this.loading.show();
        await this._deadlines.delete(this.deadline);
        this.message.success('COMMON.OPERATION_COMPLETED');
        this.close();
      } catch (error) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const subHeader = this.t._('COMMON.ACTION_IS_IRREVERSIBLE');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.DELETE'), role: 'destructive', handler: doDelete }
    ];
    const alert = await this.alertCtrl.create({ header, subHeader, buttons });
    alert.present();
  }
}
