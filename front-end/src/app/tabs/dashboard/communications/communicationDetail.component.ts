import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { HTMLEditorModule } from '@app/common/htmlEditor.module';

import { Communication } from '@models/communication.model';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, IDEATranslationsModule, HTMLEditorModule],
  selector: 'app-communication-detail',
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
    <ion-content color="white">
      <ion-card color="white">
        <ion-card-header>
          <ion-card-subtitle>{{ communication.date | dateLocale }}</ion-card-subtitle>
          <ion-card-title>
            <ion-text color="medium" style="font-weight: 600">
              {{ communication.event?.name }}
            </ion-text>
            <ion-text *ngIf="communication.event"> - </ion-text>
            {{ communication.name }}
          </ion-card-title>
          <ion-card-subtitle>{{ communication.brief }}</ion-card-subtitle>
        </ion-card-header>
        <ion-img *ngIf="communication.imageURL" [src]="communication.imageURL"></ion-img>
        <app-html-editor [content]="communication.content" [editMode]="false"></app-html-editor>
      </ion-card>
    </ion-content>
  `,
  styles: [
    `
      ion-card {
        margin: 0 0 20px 0;
        padding: 0 16px;
        width: 100%;
        box-shadow: none !important;
      }
      ion-card-header ion-card-subtitle {
        color: var(--ion-color-step-500);
      }
      ion-img {
        object-fit: cover;
        height: 180px;
      }
      ion-img::part(image) {
        border-radius: 8px;
      }
    `,
    `
      ion-toolbar ion-buttons[slot='start'] ion-button {
        margin-left: 8px;
      }
    `,
    `
      app-html-editor {
        --app-html-editor-margin: 10px 2px;
        --app-html-editor-padding: 20px 16px;
        --app-html-editor-background-color: var(--ion-color-light);
        --app-html-editor-box-shadow: rgba(9, 30, 66, 0.15) 0px 1px 1px, rgba(9, 30, 66, 0.1) 0px 0px 1px 1px;
        --app-html-editor-border-radius: 8px;
        --app-html-editor-color: var(--ion-color-step-800);
      }
    `
  ]
})
export class CommunicationDetailComponent {
  /**
   * The communication to show.
   */
  @Input() communication: Communication;

  constructor(private modalCtrl: ModalController) {}

  close(): void {
    this.modalCtrl.dismiss();
  }
}
