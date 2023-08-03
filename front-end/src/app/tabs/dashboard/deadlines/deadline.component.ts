import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { isToday, isTomorrow } from 'date-fns';
import { IDEATranslationsModule, IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';

import { Deadline } from '@models/deadline.model';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, IDEATranslationsModule],
  selector: 'app-deadline',
  template: `
    <ion-item [color]="color" *ngIf="!deadline">
      <ion-label><ion-skeleton-text animated></ion-skeleton-text></ion-label>
    </ion-item>
    <ion-item [color]="color" *ngIf="deadline">
      <ion-badge slot="start" class="deadlineDate" *ngIf="!app.isInMobileMode()" [color]="getDeadlineColor()">
        {{ getDeadlineLabel() }}
      </ion-badge>
      <ion-label class="ion-text-wrap">
        <p *ngIf="app.isInMobileMode()">
          <ion-badge class="deadlineDate mobile" [color]="getDeadlineColor()">{{ getDeadlineLabel() }}</ion-badge>
        </p>
        {{ deadline.name }}
        <p>
          <ion-text color="medium" style="font-weight: 600">{{ deadline.event?.name }}</ion-text>
          <span *ngIf="deadline.target && deadline.event"> - </span>
          {{ deadline.target }}
        </p>
      </ion-label>
      <ion-badge slot="end" mode="ios" *ngIf="deadline.action" [color]="deadline.actionColor">
        {{ deadline.action }}
      </ion-badge>
      <ion-badge class="deadlineTime" slot="end">{{ deadline.at | dateLocale : 'HH:mm' }}</ion-badge>
      <ng-content></ng-content>
    </ion-item>
  `,
  styles: [
    `
      ion-badge {
        font-weight: 500;
      }
      ion-item ion-label {
        line-height: 1.1em;
        margin: 16px 0 12px 0;
      }
      ion-item ion-label p {
        font-size: 0.8em;
      }
      ion-item ion-badge.deadlineDate {
        width: 100px;
        padding: 2px 8px;
      }
      ion-item ion-badge.deadlineDate.mobile {
        width: 120px;
        text-align: right;
      }
      ion-item ion-badge[slot='start'] {
        margin-right: 20px;
      }
      ion-item ion-badge[slot='end'] {
        margin-left: 12px;
      }
      ion-item ion-badge.deadlineTime {
        width: 45px;
        --background: none;
        --color: var(--ion-color-medium);
      }
    `
  ]
})
export class DeadlineComponent {
  /**
   * The deadline to show; if not set, shows a skeleton instead.
   */
  @Input() deadline: Deadline;
  /**
   * The color for the component.
   */
  @Input() color = 'white';

  constructor(private t: IDEATranslationsService, public app: AppService) {}

  getDeadlineColor(): string {
    const date = new Date(this.deadline.at);
    if (isToday(date)) return 'danger';
    if (isTomorrow(date)) return 'warning';
    else return 'light';
  }
  getDeadlineLabel(): string {
    const date = new Date(this.deadline.at);
    if (isToday(date)) return this.t._('DEADLINES.TODAY');
    if (isTomorrow(date)) return this.t._('DEADLINES.TOMORROW');
    else return this.t.formatDate(date);
  }
}
