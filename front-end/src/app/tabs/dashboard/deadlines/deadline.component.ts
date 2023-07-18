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
      <ion-badge slot="start" [color]="getDeadlineColor()">{{ getDeadlineLabel() }}</ion-badge>
      <ion-label class="ion-text-wrap">{{ deadline.name }}</ion-label>
      <ion-note slot="end">{{ deadline.at | dateLocale : 'HH:mm' }}</ion-note>
    </ion-item>
  `,
  styles: [
    `
      ion-item ion-badge[slot='start'] {
        width: 100px;
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
    else return 'medium';
  }
  getDeadlineLabel(): string {
    const date = new Date(this.deadline.at);
    if (isToday(date)) return this.t._('DEADLINES.TODAY');
    if (isTomorrow(date)) return this.t._('DEADLINES.TOMORROW');
    else return this.t.formatDate(date);
  }
}
