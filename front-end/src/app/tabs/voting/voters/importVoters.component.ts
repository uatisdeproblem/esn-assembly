import { read, utils } from 'xlsx';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, Input, OnInit } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import {
  IDEAMessageService,
  IDEAShowHintButtonModule,
  IDEATranslationsModule,
  IDEATranslationsService
} from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { VotingService } from '../voting.service';

import { ExportableVoter, Voter, VotingSession } from '@models/votingSession.model';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslationsModule, IDEAShowHintButtonModule],
  selector: 'app-import-voters',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="medium">
        <ion-buttons slot="start">
          <ion-button [title]="'COMMON.CANCEL' | translate" (click)="close()">
            <ion-icon slot="icon-only" icon="close-circle"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ 'VOTING.IMPORT_VOTERS' | translate }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list class="aList ion-padding-start ion-padding-end">
        <ion-list-header>
          <ion-label>
            <h2>{{ 'VOTING.DOWNLOAD_IMPORT_TEMPLATE' | translate }}</h2>
            <p>{{ 'VOTING.DOWNLOAD_IMPORT_TEMPLATE_I' | translate }}</p>
            <p>{{ 'VOTING.DOWNLOAD_IMPORT_TEMPLATE_II' | translate }}</p>
          </ion-label>
        </ion-list-header>
        <p class="ion-text-center">
          <ion-button color="ESNpink" (click)="downloadTemplate()">
            {{ 'VOTING.DOWNLOAD_TEMPLATE' | translate }} <ion-icon icon="download" slot="end" />
          </ion-button>
        </p>
        <ion-list-header class="ion-padding-top">
          <ion-label>
            <h2>{{ 'VOTING.IMPORT_FROM_TEMPLATE' | translate }}</h2>
            <p>{{ 'VOTING.IMPORT_FROM_TEMPLATE_I' | translate }}</p>
          </ion-label>
        </ion-list-header>
        <p class="ion-text-center">
          <input
            #filePicker
            id="filePicker"
            type="file"
            accept=".xlsx, .csv"
            style="display: none"
            (change)="import($event)"
          />
          <ion-button (click)="filePicker.click()">
            {{ 'VOTING.CHOOSE_FILE_FOR_IMPORT' | translate }} <ion-icon icon="folder" slot="end" />
          </ion-button>
        </p>
        <ion-item-divider *ngIf="indexesOfRowsWithErr.length">
          <ion-label>
            <b>
              <ion-text color="dark">{{ 'VOTING.SOME_ROWS_HAVE_ERRORS' | translate }}:</ion-text>
              <ion-text color="danger"> #{{ indexesOfRowsWithErr.join(', #') }} </ion-text>
            </b>
          </ion-label>
        </ion-item-divider>
        <hr />
        <p class="ion-text-center">{{ 'COMMON.OR' | translate }}</p>
        <ion-item>
          <ion-select
            interface="popover"
            [interfaceOptions]="{ cssClass: 'largePopover' }"
            [placeholder]="('VOTING.IMPORT_FROM_OTHER_SESSION' | translate) + '...'"
            [(ngModel)]="votingSessionToCopy"
          >
            <ion-select-option *ngFor="let os of compatibleVotingSessions" [value]="os">
              {{ os.name }}
            </ion-select-option>
          </ion-select>
          <ion-button slot="end" *ngIf="votingSessionToCopy" (click)="importFromOtherSession()">
            {{ 'COMMON.COPY' | translate }}
          </ion-button>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
  styles: [
    `
      ion-content {
        --background: var(--ion-color-white);
      }
      ion-select::part(text) {
        font-weight: 500;
      }
    `
  ]
})
export class ImportVotersStandaloneComponent implements OnInit {
  /**
   * The voting session for which we upload voters.
   */
  @Input() votingSession: VotingSession;

  indexesOfRowsWithErr: number[] = [];

  compatibleVotingSessions: VotingSession[];
  votingSessionToCopy: VotingSession;

  constructor(
    private modalCtrl: ModalController,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private _voting: VotingService,
    public app: AppService
  ) {}
  async ngOnInit(): Promise<void> {
    this.compatibleVotingSessions = (await this._voting.getActiveList()).filter(
      x =>
        x.isSecret === this.votingSession.isSecret &&
        x.isWeighted === this.votingSession.isWeighted &&
        x.sessionId !== this.votingSession.sessionId
    );
  }

  downloadTemplate(): void {
    const filename = `${this.t._('VOTING.IMPORT_VOTERS')}.xlsx`;
    const session = new VotingSession(this.votingSession);
    session.voters = [new Voter({ id: ' ' })];
    this._voting.downloadVotersSpreadsheet(filename, session);
  }
  async import({ target }): Promise<void> {
    const file = target.files[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onerror = (): Promise<void> => this.message.error('COMMON.OPERATION_FAILED');
    fileReader.onload = async event => {
      const wb = read(event.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const header = utils.sheet_to_json(ws, { raw: true, header: 1 })[0];
      const parseOption = { raw: true, header: header as any, defval: '', range: 1 };
      const rows: ExportableVoter[] = utils.sheet_to_json(ws, parseOption);
      const voters = rows.map(
        x =>
          new Voter(
            { id: x['Voter Identifier']?.trim(), name: x.Name, email: x.Email, voteWeight: x['Vote Weight'] },
            this.votingSession
          )
      );

      this.indexesOfRowsWithErr = [];
      voters.forEach((v, index): void => {
        if (v.validate(this.votingSession).length) this.indexesOfRowsWithErr.push(index + 2);
      });

      if (this.indexesOfRowsWithErr.length) {
        this.message.warning('VOTING.SOME_ROWS_HAVE_ERRORS');
        this.resetFileToUpload();
      } else this.modalCtrl.dismiss(voters);
    };
    fileReader.readAsBinaryString(file);
  }
  resetFileToUpload(): void {
    const inputEl = document.getElementById('filePicker') as HTMLInputElement;
    if (inputEl) inputEl.value = '';
  }

  importFromOtherSession(): void {
    this.modalCtrl.dismiss(this.votingSessionToCopy.voters);
  }

  close(): void {
    this.modalCtrl.dismiss();
  }
}
