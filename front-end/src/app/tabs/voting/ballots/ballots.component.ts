import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { AppService } from '@app/app.service';

import { VotingMajorityTypes, VotingSession, ResultForBallotOption, VotingBallot } from '@models/votingSession.model';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslationsModule],
  selector: 'app-voting-ballots',
  template: `
    <ion-reorder-group [disabled]="!showActions" (ionItemReorder)="handleBallotReorder($event)">
      <ion-card *ngFor="let ballot of votingSession.ballots; let bIndex = index">
        <ion-card-header>
          <ng-container *ngIf="showActions">
            <ion-item lines="none" style="--min-height: none">
              <ion-button slot="end" fill="clear" color="danger" (click)="remove.emit(ballot)">
                <ion-icon icon="trash-outline" slot="icon-only" />
              </ion-button>
              <ion-button slot="end" fill="clear" (click)="manage.emit(ballot)">
                <ion-icon icon="pencil" slot="icon-only" />
              </ion-button>
              <ion-reorder slot="end" />
            </ion-item>
          </ng-container>
          <ion-card-title>{{ ballot.text }}</ion-card-title>
          <ion-card-subtitle class="tappable" [id]="'majorityTypeInfo-' + bIndex">
            {{ 'VOTING.MAJORITY_TYPES.' + ballot.majorityType | translate }} <ion-icon icon="information" />
          </ion-card-subtitle>
          <ion-popover [trigger]="'majorityTypeInfo-' + bIndex" triggerAction="click">
            <ng-template>
              <ion-content class="ion-padding">
                <p style="font-size: 0.9em">{{ 'VOTING.MAJORITY_TYPES.' + ballot.majorityType + '_I' | translate }}</p>
              </ion-content>
            </ng-template>
          </ion-popover>
        </ion-card-header>
        <ion-card-content>
          <ion-item
            lines="none"
            *ngFor="let option of ballot.options; let oIndex = index"
            [button]="results && !votingSession.isSecret"
            [id]="'votersList-' + bIndex + '-' + oIndex"
          >
            <ion-badge slot="start" color="light">{{ oIndex + 1 }}</ion-badge>
            <ion-label class="ion-text-wrap">{{ option }}</ion-label>
            <ion-badge *ngIf="results" slot="end" color="medium">
              {{ results[bIndex][oIndex].numVotes }} ({{
                results[bIndex][oIndex].numVotes / votingSession.voters.length | percent
              }})
            </ion-badge>
            <ion-popover
              *ngIf="results && !votingSession.isSecret"
              [trigger]="'votersList-' + bIndex + '-' + oIndex"
              triggerAction="click"
            >
              <ng-template>
                <ion-content>
                  <ion-list class="ion-padding">
                    <ion-list-header>
                      <ion-label class="ion-margin-bottom">
                        <p>{{ 'VOTING.VOTERS_FOR' | translate }}</p>
                        <h3>{{ option }}</h3>
                      </ion-label>
                    </ion-list-header>
                    <ion-item *ngIf="results[bIndex][oIndex].numVotes === 0">
                      <ion-label class="ion-padding-start">
                        <i>{{ 'VOTING.NO_VOTERS' | translate }}</i>
                      </ion-label>
                    </ion-item>
                    <ion-item *ngFor="let voter of results[bIndex][oIndex].voters">
                      <ion-label class="ion-text-wrap ion-padding-start">{{ voter }}</ion-label>
                    </ion-item>
                  </ion-list>
                </ion-content>
              </ng-template>
            </ion-popover>
          </ion-item>
        </ion-card-content>
      </ion-card>
    </ion-reorder-group>
  `,
  styles: [
    `
      ion-card-header {
        padding-bottom: 8px;
      }
      ion-card-title {
        font-size: 1.15em;
      }
      ion-card-subtitle {
        margin-top: 2px;
        color: var(--ion-color-step-400);
      }
      ion-item {
        --min-height: 32px;
        --padding-start: 12px;
      }
      ion-item ion-badge[slot='start'] {
        margin-right: 12px;
        width: 20px;
      }
      ion-item ion-label {
        margin: 0;
        font-size: 0.9em;
      }
      ion-item ion-badge[slot='end'] {
        width: 80px;
        text-align: right;
      }
      ion-label h3 {
        font-weight: 500;
      }
    `
  ]
})
export class BallotsStandaloneComponent {
  /**
   * The voting session containing the ballots to display.
   */
  @Input() votingSession: VotingSession;
  /**
   * The results to display; if not set, they are not shown.
   */
  @Input() results: ResultForBallotOption[][] | null;
  /**
   * Whether to display the actions to manage the ballots.
   */
  @Input() showActions = false;
  /**
   * Trigger to remove a ballot.
   */
  @Output() remove = new EventEmitter<VotingBallot>();
  /**
   * Trigger to manage a ballot.
   */
  @Output() manage = new EventEmitter<VotingBallot>();

  MajorityTypes = VotingMajorityTypes;

  constructor(public app: AppService) {}

  handleBallotReorder({ detail }): void {
    const toReposition = this.votingSession.ballots.splice(detail.from, 1)[0];
    this.votingSession.ballots.splice(detail.to, 0, toReposition);
    detail.complete();
  }
}
