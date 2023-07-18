import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { DeadlineComponent } from './deadline.component';

import { Deadline } from '@models/deadline.model';
import { FAVORITE_TIMEZONE } from '@models/favoriteTimezone.const';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, IDEATranslationsModule, DeadlineComponent],
  selector: 'app-dealines',
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
      <ion-list class="aList">
        <ion-list-header>
          <ion-label>
            <h1>{{ 'DEADLINES.DEADLINES' | translate }}</h1>
            <p>{{ 'DEADLINES.DEADLINES_TIMEZONE' | translate : { timezone: FAVORITE_TIMEZONE } }}</p>
          </ion-label>
        </ion-list-header>
        <ion-item class="noElements" *ngIf="deadlines && !deadlines.length">
          <ion-label>{{ 'COMMON.NO_ELEMENTS' | translate }}</ion-label>
        </ion-item>
        <app-deadline *ngIf="!deadlines"></app-deadline>
        <app-deadline *ngFor="let deadline of deadlines" [deadline]="deadline"></app-deadline>
      </ion-list>
    </ion-content>
  `,
  styles: [
    `
      ion-list.aList ion-list-header {
        margin-left: 8px;
      }
    `,
    `
      ion-toolbar ion-buttons[slot='start'] ion-button {
        margin-left: 8px;
      }
    `
  ]
})
export class DeadlinesComponent {
  /**
   * The deadlines to show.
   */
  @Input() deadlines: Deadline[];

  FAVORITE_TIMEZONE = FAVORITE_TIMEZONE;

  constructor(private modalCtrl: ModalController) {}

  close(): void {
    this.modalCtrl.dismiss();
  }
}
