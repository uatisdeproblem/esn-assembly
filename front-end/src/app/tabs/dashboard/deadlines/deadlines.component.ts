import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { IDEAMessageService, IDEATranslationsModule } from '@idea-ionic/common';

import { DeadlineComponent } from './deadline.component';
import { ManageDeadlineComponent } from './manageDeadline.component';

import { AppService } from '@app/app.service';
import { DeadlinesService } from './deadlines.service';

import { Deadline } from '@models/deadline.model';

const FIRST_YEAR_FOR_DEADLINES = 2023;

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslationsModule, DeadlineComponent, ManageDeadlineComponent],
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
            <p *ngIf="!editMode">
              {{ 'DEADLINES.DEADLINES_TIMEZONE' | translate : { timezone: app.configurations.timezone } }}
            </p>
          </ion-label>
          <ion-button color="ESNgreen" *ngIf="editMode" (click)="addDeadline()">
            {{ 'COMMON.ADD' | translate }}
          </ion-button>
        </ion-list-header>
        <div class="ion-text-right">
          <ion-item color="transparent" lines="none">
            <ion-select
              interface="popover"
              labelPlacement="end"
              [(ngModel)]="filterByYear"
              (ionChange)="loadListOfYear(filterByYear)"
            >
              <ion-select-option [value]="null">{{ 'DEADLINES.FUTURE_DEADLINES' | translate }}</ion-select-option>
              <ion-select-option *ngFor="let year of years" [value]="year">{{ year }}</ion-select-option>
            </ion-select>
          </ion-item>
        </div>
        <ion-item class="noElements" *ngIf="deadlines && !deadlines.length">
          <ion-label>{{ 'COMMON.NO_ELEMENTS' | translate }}</ion-label>
        </ion-item>
        <app-deadline *ngIf="!deadlines"></app-deadline>
        <app-deadline *ngFor="let deadline of deadlines" [deadline]="deadline">
          <ng-container *ngIf="editMode">
            <ion-button slot="end" fill="clear" color="ESNgreen" (click)="editDeadline(deadline)">
              <ion-icon icon="pencil" slot="icon-only"></ion-icon>
            </ion-button>
          </ng-container>
        </app-deadline>
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
export class DeadlinesComponent implements OnInit {
  /**
   * The deadlines to show.
   */
  @Input() deadlines: Deadline[];
  /**
   * Whether the component should be in edit mode.
   */
  @Input() editMode = false;

  years: number[];
  filterByYear: number = null;

  constructor(
    private modalCtrl: ModalController,
    private message: IDEAMessageService,
    private _deadlines: DeadlinesService,
    public app: AppService
  ) {}
  ngOnInit(): void {
    this.years = this.app.getYearsSince(FIRST_YEAR_FOR_DEADLINES);
  }

  async loadListOfYear(year: number | null): Promise<void> {
    try {
      this.deadlines = null;
      this.deadlines = await this._deadlines.getList({ force: true, year });
    } catch (error) {
      this.message.error('COMMON.COULDNT_LOAD_LIST');
    }
  }

  close(): void {
    this.modalCtrl.dismiss();
  }

  async addDeadline(): Promise<void> {
    await this.editDeadline(new Deadline());
  }
  async editDeadline(deadline: Deadline): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ManageDeadlineComponent,
      componentProps: { deadline },
      backdropDismiss: false
    });
    modal.onDidDismiss().then(async (): Promise<void> => {
      this.deadlines = await this._deadlines.getList({ force: true, year: this.filterByYear });
    });
    await modal.present();
  }
}
