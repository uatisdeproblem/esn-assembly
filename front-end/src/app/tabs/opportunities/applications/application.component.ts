import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
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
      <ion-card-header class="ion-text-center">
        <ion-card-title class="ion-margin-top">{{ 'OPPORTUNITIES.APPLICATION' | translate }}</ion-card-title>
        <ion-card-subtitle>
          <ion-badge [color]="getApplicationColorByStatus(application)">
            {{ getApplicationLabelByStatus(application) }}
          </ion-badge>
        </ion-card-subtitle>
      </ion-card-header>
      <ion-card-content>
        <app-subject lines="none" [color]="color" [subject]="application.subject"></app-subject>
        <app-html-editor [content]="application.motivation" [editMode]="false"></app-html-editor>
        <ion-item
          *ngFor="let att of application.attachments | keyvalue"
          button
          [color]="color"
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
      <ion-label class="ion-text-wrap">
        {{ application.subject.name }}
        <p>{{ application.subject.getOrigin() }}</p>
      </ion-label>
      <ion-badge slot="end" [color]="getApplicationColorByStatus(application)">
        {{ getApplicationLabelByStatus(application, true) }}
      </ion-badge>
      <ion-note slot="end" class="ion-hide-xl-down">
        {{ application.createdAt | date : 'MMM d, y - H:mm' : FAVORITE_TIMEZONE }}
      </ion-note>
    </ion-item>
  `,
  styles: [
    `
      ion-item ion-note {
        padding-top: 24px;
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
   * Trigger when the component is selected.
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
  getApplicationLabelByStatus(application: Application, short = false): string {
    const status = application.getStatus();
    let str: string;
    if (status === ApplicationStatuses.APPROVED) str = this.t._('OPPORTUNITIES.APPLICATION_STATUSES.APPROVED');
    else if (status === ApplicationStatuses.REJECTED) str = this.t._('OPPORTUNITIES.APPLICATION_STATUSES.REJECTED');
    else str = this.t._('OPPORTUNITIES.APPLICATION_STATUSES.PENDING');
    return short ? str.slice(0, 1) : str;
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
