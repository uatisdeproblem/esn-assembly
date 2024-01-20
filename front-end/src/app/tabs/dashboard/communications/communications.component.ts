import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { IDEAMessageService, IDEATranslationsModule } from '@idea-ionic/common';

import { ManageCommunicationComponent } from './manageCommunication.component';
import { CommunicationDetailComponent } from './communicationDetail.component';
import { DateTimezonePipe } from '@common/dateTimezone.pipe';

import { AppService } from '@app/app.service';
import { CommunicationsService } from './communications.service';

import { Communication } from '@models/communication.model';

const FIRST_YEAR_FOR_COMMUNICATIONS = 2023;

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IDEATranslationsModule,
    DateTimezonePipe,
    ManageCommunicationComponent
  ],
  selector: 'app-communications',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="medium">
        <ion-buttons slot="start">
          <ion-button (click)="close()">
            <ion-icon slot="start" icon="close" /> {{ 'COMMON.CLOSE' | translate }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list class="aList">
        <ion-list-header>
          <ion-label>
            <h1>{{ 'COMMUNICATIONS.COMMUNICATIONS' | translate }}</h1>
          </ion-label>
        </ion-list-header>
        <div class="ion-text-right">
          <ion-item color="transparent" lines="none">
            <ion-select
              interface="popover"
              labelPlacement="end"
              [(ngModel)]="filterByYear"
              (ionChange)="loadListOfYear(filterByYear)"
            >
              <ion-select-option *ngFor="let year of years" [value]="year">{{ year }}</ion-select-option>
            </ion-select>
          </ion-item>
        </div>
        <ion-item class="noElements" *ngIf="communications && !communications.length">
          <ion-label>{{ 'COMMON.NO_ELEMENTS' | translate }}</ion-label>
        </ion-item>
        <ion-item *ngIf="!communications">
          <ion-label><ion-skeleton-text animated /></ion-label>
        </ion-item>
        <ion-item button *ngFor="let communication of communications" (click)="openCommunication(communication)">
          <ion-label class="ion-text-wrap">
            <p *ngIf="communication.event">{{ communication.event.name }}</p>
            {{ communication.name }}
          </ion-label>
          <ion-note slot="end">{{ communication.date | dateTz }}</ion-note>
          <ion-button
            slot="end"
            color="ESNgreen"
            fill="clear"
            *ngIf="app.user.isAdministrator"
            (click)="editCommunication(communication, $event)"
          >
            <ion-icon slot="icon-only" icon="pencil" />
          </ion-button>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
  styles: [
    `
      ion-list.aList ion-list-header {
        margin-left: 8px;
      }
      ion-toolbar ion-buttons[slot='start'] ion-button {
        margin-left: 8px;
      }
    `
  ]
})
export class CommunicationsComponent implements OnInit {
  communications: Communication[];

  years: number[];
  filterByYear = new Date().getFullYear();

  constructor(
    private modalCtrl: ModalController,
    private message: IDEAMessageService,
    private _communications: CommunicationsService,
    public app: AppService
  ) {}
  async ngOnInit(): Promise<void> {
    this.years = this.app.getYearsSince(FIRST_YEAR_FOR_COMMUNICATIONS);
    await this.loadListOfYear(this.filterByYear);
  }

  async loadListOfYear(year: number | null): Promise<void> {
    try {
      this.communications = null;
      this.communications = await this._communications.getList({ force: true, year });
    } catch (error) {
      this.message.error('COMMON.COULDNT_LOAD_LIST');
    }
  }

  close(): void {
    this.modalCtrl.dismiss();
  }

  async openCommunication(communication: Communication): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: CommunicationDetailComponent,
      componentProps: { communication }
    });
    modal.present();

    // request the communication so that it counts in the statistics (even if we don't need it)
    try {
      await this._communications.getById(communication.communicationId);
    } catch (error) {
      // no problem
    }
  }

  async editCommunication(communication: Communication, event?: Event): Promise<void> {
    if (event) event.stopPropagation();

    const modal = await this.modalCtrl.create({
      component: ManageCommunicationComponent,
      componentProps: { communication },
      backdropDismiss: false
    });
    modal.onDidDismiss().then(async (): Promise<void> => {
      this.communications = await this._communications.getList({ force: true, year: this.filterByYear });
    });
    await modal.present();
  }
}
