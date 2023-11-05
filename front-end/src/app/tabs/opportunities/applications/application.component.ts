import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Attachment } from 'idea-toolbox';
import {
  IDEALoadingService,
  IDEAMessageService,
  IDEATranslationsModule,
  IDEATranslationsService
} from '@idea-ionic/common';

import { SubjectModule } from '@common/subject.module';
import { HTMLEditorModule } from '@common/htmlEditor.module';

import { AppService } from '@app/app.service';
import { ApplicationsService } from './applications.service';

import { Application, ApplicationStatuses } from '@models/application.model';
import { FAVORITE_TIMEZONE } from '@models/favoriteTimezone.const';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslationsModule, SubjectModule, HTMLEditorModule],
  selector: 'app-application',
  template: `
    <ion-card *ngIf="card" [color]="color">
      <ion-card-header class="ion-text-center" *ngIf="application.userId === app.user.userId">
        <ion-card-title class="ion-margin-top">
          {{ 'OPPORTUNITIES.YOUR_APPLICATION' | translate }}
        </ion-card-title>
        <ion-card-subtitle *ngIf="app.user.isAdministrator">
          <ion-badge [color]="getApplicationColorByStatus(application)">
            {{ getApplicationLabelByStatus(application) }}
          </ion-badge>
        </ion-card-subtitle>
      </ion-card-header>
      <ion-card-content>
        <app-subject color="light" lines="none" [subject]="application.subject"></app-subject>
        <app-html-editor
          [content]="application.motivation"
          [editMode]="false"
          style="--app-html-editor-background-color: var(--ion-color-white)"
        ></app-html-editor>
        <ion-item
          color="transparent"
          *ngFor="let att of application.attachments | keyvalue"
          button
          (click)="downloadApplicationAttachment(att.key)"
        >
          <ion-icon name="attach" slot="start"></ion-icon>
          <ion-label class="ion-text-wrap">{{ att.key }}</ion-label>
        </ion-item>
      </ion-card-content>
    </ion-card>
    <!---->
    <ion-item *ngIf="!card" button detail (click)="select.emit()">
      <ion-note slot="start">#{{ index + 1 }}</ion-note>
      <ion-label>
        {{ application.subject.name }}
        <p>{{ application.subject.getSectionCountry() }}</p>
      </ion-label>
      <ion-badge slot="end" [color]="getApplicationColorByStatus(application)">
        {{ getApplicationLabelByStatus(application) }}
      </ion-badge>
      <ion-note slot="end" class="ion-hide-sm-down">
        {{ application.createdAt | date : 'MMM d, y - H:mm' : FAVORITE_TIMEZONE }}
      </ion-note>
    </ion-item>
  `,
  styles: [
    `
      ion-item ion-note {
        padding-top: 24px;
      }
    `,
    `
      app-html-editor {
        --app-html-editor-margin: 16px 2px;
        --app-html-editor-padding: 20px 16px;
        --app-html-editor-background-color: var(--ion-color-white-tint);
        --app-html-editor-box-shadow: rgba(9, 30, 66, 0.15) 0px 1px 1px, rgba(9, 30, 66, 0.1) 0px 0px 1px 1px;
        --app-html-editor-border-radius: 8px;
        --app-html-editor-color: var(--ion-color-step-800);
      }
    `
  ]
})
export class ApplicationStandaloneComponent {
  /**
   * The application to show.
   */
  @Input() application: Application;
  /**
   * Whether to display the full application as a card.
   */
  @Input() card = false;
  /**
   * The index to display if the element is shown as an item.
   */
  @Input() index: number;
  /**
   * The color of the item.
   */
  @Input() color: string;
  /**
   * The lines attribute of the item.
   */
  @Input() lines: string;
  /**
   * Whether the component is editable.
   */
  @Input() editMode = false;
  /**
   * Trigger when the open button is clicked.
   */
  @Output() select = new EventEmitter<void>();

  ApplicationStatuses = ApplicationStatuses;
  FAVORITE_TIMEZONE = FAVORITE_TIMEZONE;

  constructor(
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private _applications: ApplicationsService,
    public app: AppService
  ) {}

  getApplicationColorByStatus(application: Application): string {
    const status = application.getStatus();
    if (status === ApplicationStatuses.APPROVED) return 'ESNgreen';
    else if (status === ApplicationStatuses.REJECTED) return 'danger';
    else return 'medium';
  }
  getApplicationLabelByStatus(application: Application): string {
    const status = application.getStatus();
    if (status === ApplicationStatuses.APPROVED) return this.t._('OPPORTUNITIES.APPLICATION_STATUSES.APPROVED');
    else if (status === ApplicationStatuses.REJECTED) return this.t._('OPPORTUNITIES.APPLICATION_STATUSES.REJECTED');
    else return this.t._('OPPORTUNITIES.APPLICATION_STATUSES.PENDING');
  }

  async downloadApplicationAttachment(expectedName: string): Promise<void> {
    try {
      await this.loading.show();
      const url = await this._applications.downloadAttachment(this.application, expectedName);
      await this.app.openURL(url);
    } catch (error) {
      this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      this.loading.hide();
    }
  }
}
