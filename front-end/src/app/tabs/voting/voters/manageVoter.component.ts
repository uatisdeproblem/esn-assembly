import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, Input, OnInit } from '@angular/core';
import { AlertController, IonicModule, ModalController } from '@ionic/angular';
import {
  IDEALoadingService,
  IDEAMessageService,
  IDEAShowHintButtonModule,
  IDEATranslationsModule,
  IDEATranslationsService
} from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { VotingService } from '../voting.service';

import { Voter, VotingSession } from '@models/votingSession.model';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslationsModule, IDEAShowHintButtonModule],
  selector: 'app-manage-voter',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="medium">
        <ion-buttons slot="start">
          <ion-button [title]="'COMMON.CANCEL' | translate" (click)="close()">
            <ion-icon slot="icon-only" icon="close-circle"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ 'VOTING.MANAGE_VOTER' | translate }}</ion-title>
        <ion-buttons slot="end">
          <ion-button [title]="'COMMON.SAVE' | translate" *ngIf="editMode" (click)="save()">
            <ion-icon slot="icon-only" icon="checkmark-circle"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list class="aList" lines="full" [class.viewMode]="!editMode">
        <ion-item [class.fieldHasError]="hasFieldAnError('id')">
          <ion-label position="stacked">
            {{ 'VOTING.VOTER_ID' | translate }} <ion-text class="obligatoryDot" />
          </ion-label>
          <ion-input readonly [value]="voter.id" />
        </ion-item>
        <ion-item [class.fieldHasError]="hasFieldAnError('name')">
          <ion-label position="stacked">
            {{ 'VOTING.VOTER_NAME' | translate }} <ion-text class="obligatoryDot" />
          </ion-label>
          <ion-input [disabled]="!editMode" [(ngModel)]="voter.name" />
        </ion-item>
        <ion-item *ngIf="votingSession.isForm()" [class.fieldHasError]="hasFieldAnError('email')">
          <ion-label position="stacked">{{ 'VOTING.VOTER_EMAIL' | translate }}</ion-label>
          <ion-input type="email" [disabled]="!editMode" [(ngModel)]="voter.email" />
        </ion-item>
        <ion-item *ngIf="votingSession.isWeighted" [class.fieldHasError]="hasFieldAnError('voteWeight')">
          <ion-label position="stacked">
            {{ 'VOTING.VOTER_WEIGHT' | translate }} <ion-text class="obligatoryDot" />
          </ion-label>
          <ion-input
            type="number"
            pattern="[0-9]{1,6}"
            [step]="1"
            [min]="1"
            [max]="999999"
            [disabled]="!editMode"
            [(ngModel)]="voter.voteWeight"
          />
          <idea-show-hint-button
            slot="end"
            class="ion-margin-top"
            hint="VOTING.VOTER_WEIGHT"
            *ngIf="editMode"
            translate
          />
        </ion-item>
        <p class="ion-text-end ion-padding-end">
          <ion-button size="small" color="danger" *ngIf="editMode" (click)="removeVoter()">
            {{ 'COMMON.REMOVE' | translate }}
          </ion-button>
          <ng-container *ngIf="votingSession.isInProgress()">
            <ion-button (click)="resendVotingLink()">
              {{ 'VOTING.RESEND_VOTING_LINK' | translate }} <ion-icon slot="end" icon="send" />
            </ion-button>
            <ion-button color="warning" (click)="showVotingSecret()">
              {{ 'VOTING.SHOW_VOTING_TOKEN' | translate }} <ion-icon slot="end" icon="eye" />
            </ion-button>
          </ng-container>
        </p>
      </ion-list>
    </ion-content>
  `
})
export class ManageVoterStandaloneComponent implements OnInit {
  /**
   * The voter to manage.
   */
  @Input() voter: Voter;
  /**
   * The related voting session.
   */
  @Input() votingSession: VotingSession;
  /**
   * Whether the component is in edit mode.
   */
  @Input() editMode = false;

  errors = new Set<string>();

  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private _voting: VotingService,
    public app: AppService
  ) {}
  ngOnInit(): void {
    this.voter = new Voter(this.voter, this.votingSession);
  }

  hasFieldAnError(field: string): boolean {
    return this.errors.has(field);
  }

  async save(): Promise<void> {
    this.errors = new Set(this.voter.validate(this.votingSession));
    if (this.errors.size) return this.message.error('COMMON.FORM_HAS_ERROR_TO_CHECK');
    this.modalCtrl.dismiss(this.voter);
  }
  removeVoter(): void {
    this.voter.id = 'DELETE';
    this.modalCtrl.dismiss(this.voter);
  }
  close(): void {
    this.modalCtrl.dismiss();
  }

  async resendVotingLink(): Promise<void> {
    const header = this.t._('VOTING.RESEND_VOTING_LINK');
    const inputs: any[] = [{ name: 'email', type: 'email', value: this.voter.email }];
    const doSend = async ({ email }): Promise<void> => {
      if (!email) return;
      try {
        await this.loading.show();
        await this._voting.resendVotingTicketToVoter(this.votingSession, this.voter, email);
        this.message.success('COMMON.OPERATION_COMPLETED');
      } catch (error) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };
    const buttons = [{ text: this.t._('COMMON.CANCEL') }, { text: this.t._('COMMON.SEND'), handler: doSend }];
    const alert = await this.alertCtrl.create({ header, inputs, buttons });
    await alert.present();
  }
  async showVotingSecret(): Promise<void> {
    try {
      await this.loading.show();
      const token = await this._voting.getVotingTokenOfVoter(this.votingSession, this.voter);
      const header = this.t._('VOTING.SHOW_VOTING_TOKEN');
      const buttons = [{ text: this.t._('COMMON.CLOSE') }];
      const alert = await this.alertCtrl.create({ header, message: token, buttons, cssClass: 'selectableAlert' });
      alert.present();
    } catch (error) {
      this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      this.loading.hide();
    }
  }
}
