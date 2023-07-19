import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { Communication } from '@models/communication.model';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, IDEATranslationsModule],
  selector: 'app-communication',
  template: `
    <ion-card [color]="color" *ngIf="!communication">
      <ion-skeleton-text animated style="height: 180px"></ion-skeleton-text>
      <ion-card-header>
        <ion-card-subtitle>
          <ion-skeleton-text animated style="width: 30%"></ion-skeleton-text>
        </ion-card-subtitle>
        <ion-card-title><ion-skeleton-text animated style="width: 60%"></ion-skeleton-text></ion-card-title>
        <ion-card-subtitle><ion-skeleton-text animated style="width: 80%"></ion-skeleton-text></ion-card-subtitle>
      </ion-card-header>
    </ion-card>
    <ion-card *ngIf="communication" [color]="color" [button]="button" (click)="select.emit()">
      <ion-img *ngIf="communication.imageURL" [src]="communication.imageURL"></ion-img>
      <ion-card-header>
        <ion-card-subtitle>{{ communication.date | dateLocale }}</ion-card-subtitle>
        <ion-card-title>{{ communication.name }}</ion-card-title>
        <ion-card-subtitle *ngIf="communication.brief">{{ communication.brief }}</ion-card-subtitle>
      </ion-card-header>
      <ion-card-content><ng-content></ng-content></ion-card-content>
    </ion-card>
  `,
  styles: [
    `
      ion-card {
        margin: 0 4px 16px 4px;
      }
      ion-img {
        object-fit: cover;
        height: 180px;
        border-bottom: 1px solid var(--ion-color-light);
      }
      ion-card-subtitle:first-of-type {
        color: var(--ion-color-step-500);
      }
      ion-card-subtitle:nth-of-type(2) {
        margin-top: 12px;
      }
    `
  ]
})
export class CommunicationComponent {
  /**
   * The communication to show; if not set, shows a skeleton instead.
   */
  @Input() communication: Communication;
  /**
   * The color for the component.
   */
  @Input() color = 'white';
  /**
   * Whether the component should act like a button.
   */
  @Input() button = false;
  /**
   * Trigger when selected.
   */
  @Output() select = new EventEmitter<void>();

  constructor() {}
}
