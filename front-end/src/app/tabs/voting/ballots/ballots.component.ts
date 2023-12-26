import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import Chart from 'chart.js/auto';
import { IDEATranslationsModule, IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';

import { VotingMajorityTypes, VotingSession, VotingBallot } from '@models/votingSession.model';
import { VotingResults } from '@models/votingResult.model';

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
                <p style="font-size: 0.9em">
                  {{ 'VOTING.MAJORITY_TYPES.' + ballot.majorityType + '_I' | translate }}
                </p>
              </ion-content>
            </ng-template>
          </ion-popover>
        </ion-card-header>
        <ion-card-content>
          <ion-grid class="ion-no-padding">
            <ion-row class="ion-align-items-center">
              <ion-col [size]="12" [sizeMd]="results ? 9 : 12">
                <ion-item
                  lines="none"
                  *ngFor="let option of getOptionsOfBallotIncludingAbsentsByIndex(bIndex); let oIndex = index"
                  [button]="results && !votingSession.isSecret"
                  [id]="'votersList-' + bIndex + '-' + oIndex"
                >
                  <ion-badge slot="start" color="light" *ngIf="!results">{{ oIndex + 1 }}</ion-badge>
                  <ion-badge slot="start" style="--background: {{ chartColors[oIndex] }}" *ngIf="results">
                    &nbsp;
                  </ion-badge>
                  <ion-label class="ion-text-wrap">{{ option }}</ion-label>
                  <ion-badge *ngIf="results" slot="end" color="medium">
                    {{ results[bIndex][oIndex].value | percent }}
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
                              <p class="ion-text-end">
                                <ion-badge color="medium">{{ results[bIndex][oIndex].value }}</ion-badge>
                              </p>
                            </ion-label>
                          </ion-list-header>
                          <ion-item *ngIf="results[bIndex][oIndex].value === 0">
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
              </ion-col>
              <ion-col [size]="12" [sizeMd]="3" *ngIf="results">
                <div class="chartContainer">
                  <canvas [id]="'chartBallot-' + bIndex"></canvas>
                </div>
              </ion-col>
            </ion-row>
          </ion-grid>
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
        width: 50px;
        text-align: right;
      }
      ion-label h3 {
        font-weight: 500;
      }
      div.chartContainer {
        height: 120px;
      }
      div.chartContainer canvas {
        width: 100%;
        margin: 0 auto;
      }
    `
  ]
})
export class BallotsStandaloneComponent implements OnInit, OnDestroy {
  /**
   * The voting session containing the ballots to display.
   */
  @Input() votingSession: VotingSession;
  /**
   * The results to display; if not set, they are not shown.
   */
  @Input() results: VotingResults | null;
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

  charts: Chart<'doughnut'>[] = [];
  chartColors = CHART_COLORS;

  constructor(private t: IDEATranslationsService, public app: AppService) {}
  ngOnInit(): void {
    if (this.results) setTimeout((): void => this.buildCharts(), 300);
  }
  ngOnDestroy(): void {
    this.charts.forEach(chart => chart?.destroy());
  }

  getOptionsOfBallotIncludingAbsentsByIndex(bIndex: number): string[] {
    const options = this.votingSession.ballots[bIndex].options;
    if (!this.results) return options;
    else return [...options, this.t._('VOTING.ABSENT')];
  }

  handleBallotReorder({ detail }): void {
    const toReposition = this.votingSession.ballots.splice(detail.from, 1)[0];
    this.votingSession.ballots.splice(detail.to, 0, toReposition);
    detail.complete();
  }

  buildCharts(): void {
    if (!this.results) return;
    this.votingSession.ballots.forEach((_, bIndex): void => {
      if (this.charts[bIndex]) this.charts[bIndex].destroy();
      const chartCanvas = document.getElementById('chartBallot-' + bIndex) as HTMLCanvasElement;
      const labels = this.getOptionsOfBallotIncludingAbsentsByIndex(bIndex);
      const data = this.getOptionsOfBallotIncludingAbsentsByIndex(bIndex).map(
        (_, oIndex): any => this.results[bIndex][oIndex].value
      );
      this.charts[bIndex] = new Chart(chartCanvas, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: this.chartColors }] },
        options: {
          layout: { padding: 20 },
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: tooltipItem => `${Number(tooltipItem.formattedValue) * 100}%` } }
          }
        }
      });
    });
  }
}

/**
 * The sorted list of colors to use in the charts.
 */
const CHART_COLORS = [
  '#00a950',
  '#f53794',
  '#4dc9f6',
  '#f67019',
  '#537bc4',
  '#acc236',
  '#166a8f',
  '#8549ba',
  '#58595b'
];
