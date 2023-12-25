import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, Input, OnInit } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { IDEAMessageService, IDEAShowHintButtonModule, IDEATranslationsModule } from '@idea-ionic/common';

import { AppService } from '@app/app.service';

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
          <ion-button [title]="'COMMON.SAVE' | translate" (click)="save()">
            <ion-icon slot="icon-only" icon="checkmark-circle"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list class="aList" lines="full">
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
          <ion-input [(ngModel)]="voter.name" />
        </ion-item>
        <ion-item [class.fieldHasError]="hasFieldAnError('email')">
          <ion-label position="stacked">{{ 'VOTING.VOTER_EMAIL' | translate }}</ion-label>
          <ion-input type="email" [(ngModel)]="voter.email" />
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
            [(ngModel)]="voter.voteWeight"
          />
          <idea-show-hint-button slot="end" class="ion-margin-top" hint="VOTING.VOTER_WEIGHT" translate />
        </ion-item>
        <p class="ion-text-end ion-padding-end">
          <ion-button size="small" color="danger" (click)="removeVoter()">
            {{ 'COMMON.REMOVE' | translate }}
          </ion-button>
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

  errors = new Set<string>();

  constructor(private modalCtrl: ModalController, private message: IDEAMessageService, public app: AppService) {}
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
}
