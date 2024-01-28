import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { IonicModule, PopoverController } from '@ionic/angular';
import Chart from 'chart.js/auto';
import { IDEATranslationsModule, IDEATranslationsService } from '@idea-ionic/common';

import { MajorityTypeStandaloneComponent } from './majorityType.component';
import { BallotVotesDetailStandaloneComponent } from './ballotVotesDetail.component';

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
          <ion-card-subtitle class="tappable" (click)="openMajorityTypePopover(ballot.majorityType, $event)">
            {{ 'VOTING.MAJORITY_TYPES.' + ballot.majorityType | translate }} <ion-icon icon="information" />
          </ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-grid class="ion-no-padding">
            <ion-row class="ion-align-items-center">
              <ion-col [size]="12" [sizeMd]="results ? 9 : 12">
                <ion-item
                  lines="none"
                  *ngFor="let option of getOptionsOfBallotIncludingAbstainAndAbsentByIndex(bIndex); let oIndex = index"
                  [button]="results && !votingSession.isSecret"
                  (click)="openBallotVotesDetailPopover(bIndex, oIndex, option, $event)"
                >
                  <ion-badge slot="start" color="light" *ngIf="!results">{{ oIndex + 1 }}</ion-badge>
                  <ion-badge slot="start" style="--background: {{ chartColors[oIndex] }}" *ngIf="results">
                    &nbsp;
                  </ion-badge>
                  <ion-label class="ion-text-wrap">{{ option }}</ion-label>
                  <ion-badge *ngIf="results" slot="end" color="medium" class="resultPercentage">
                    {{ getResultOfBallotOptionBasedOnRaw(bIndex, oIndex) | percent : '1.2-2' }}
                  </ion-badge>
                </ion-item>
              </ion-col>
              <ion-col [size]="12" [sizeMd]="3" *ngIf="results">
                <div class="chartContainer">
                  <canvas [id]="chartCanvasBaseId + bIndex"></canvas>
                </div>
              </ion-col>
              <ion-col [size]="12" *ngIf="results && !raw">
                <ion-item lines="none" class="outcomeItem">
                  <ion-badge slot="end" color="light" *ngIf="getWinningBallotOptionIndex(bIndex) !== -1">
                    {{ votingSession.ballots[bIndex].options[getWinningBallotOptionIndex(bIndex)] }}
                  </ion-badge>
                  <ion-label class="ion-text-right" *ngIf="getWinningBallotOptionIndex(bIndex) === -1">
                    <i>{{ 'VOTING.NO_OPTION_RECEIVED_ENOUGH_VOTES' | translate }}</i>
                  </ion-label>
                  <ion-icon
                    slot="end"
                    size="small"
                    [icon]="getWinningBallotOptionIndex(bIndex) === -1 ? 'close' : 'trophy-outline'"
                  />
                </ion-item>
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
      ion-item ion-badge.resultPercentage {
        width: 60px;
        text-align: right;
      }
      div.chartContainer {
        height: 120px;
      }
      div.chartContainer canvas {
        width: 100%;
        margin: 0 auto;
      }
      ion-item.outcomeItem {
        margin-top: 4px;
      }
    `
  ]
})
export class BallotsStandaloneComponent implements OnChanges, OnDestroy {
  /**
   * The voting session containing the ballots to display.
   */
  @Input() votingSession: VotingSession;
  /**
   * The results to display; if not set, they are not shown.
   */
  @Input() results: VotingResults | null;
  /**
   * Whether to show the raw results.
   */
  @Input() raw = false;
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

  chartCanvasBaseId: string;

  constructor(private popoverCtrl: PopoverController, private t: IDEATranslationsService, public app: AppService) {}
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.results || changes.raw) {
      this.charts.forEach(chart => chart?.destroy());
      this.charts = [];
      // we need to continue refresh the canvas ID because sometimes the chart's canvas doesn't update
      this.chartCanvasBaseId = 'chartBallot-'.concat(Date.now().toString(), '-');
      setTimeout((): void => this.buildCharts(), 300);
    }
  }
  ngOnDestroy(): void {
    this.charts.forEach(chart => chart?.destroy());
  }

  async openMajorityTypePopover(majorityType: string, event: Event): Promise<void> {
    const popover = await this.popoverCtrl.create({
      component: MajorityTypeStandaloneComponent,
      componentProps: { majorityType },
      event
    });
    popover.present();
  }

  getOptionsOfBallotIncludingAbstainAndAbsentByIndex(bIndex: number): string[] {
    const options = this.votingSession.ballots[bIndex].options;
    if (!this.results) return [...options, this.t._('VOTING.ABSTAIN')];
    if (!this.raw) return options;
    return [...options, this.t._('VOTING.ABSTAIN'), this.t._('VOTING.ABSENT')];
  }
  getResultOfBallotOptionBasedOnRaw(bIndex: number, oIndex: number): number {
    if (this.raw) return this.results[bIndex][oIndex].value;
    const oResults = Object.values(this.results[bIndex]);
    const oResultsNoAbstainAndAbsent = oResults.slice(0, oResults.length - 2);
    const totNoAbstainAndAbsent = oResultsNoAbstainAndAbsent.reduce((tot, acc): number => (tot += acc.value), 0);
    return this.results[bIndex][oIndex].value / totNoAbstainAndAbsent;
  }
  getWinningBallotOptionIndex(bIndex: number): number | -1 {
    const oResults = Object.values(this.results[bIndex]);
    const oResultsNoAbstainAndAbsent = oResults.slice(0, oResults.length - 2);

    let winnerOptionIndex = -1;
    oResultsNoAbstainAndAbsent.forEach((x, oIndex): void => {
      if (winnerOptionIndex === -1 || x.value > oResultsNoAbstainAndAbsent[winnerOptionIndex].value)
        winnerOptionIndex = oIndex;
    });

    const moreWinningResultsWithSameValue = oResultsNoAbstainAndAbsent.some(
      (_, oIndex): boolean =>
        oIndex !== winnerOptionIndex &&
        this.getResultOfBallotOptionBasedOnRaw(bIndex, oIndex) ===
          this.getResultOfBallotOptionBasedOnRaw(bIndex, winnerOptionIndex)
    );
    if (moreWinningResultsWithSameValue) return -1;

    if (this.votingSession.ballots[bIndex].majorityType === VotingMajorityTypes.RELATIVE) return winnerOptionIndex;
    if (this.votingSession.ballots[bIndex].majorityType === VotingMajorityTypes.SIMPLE)
      return this.getResultOfBallotOptionBasedOnRaw(bIndex, winnerOptionIndex) > 1 / 2 ? winnerOptionIndex : -1;
    if (this.votingSession.ballots[bIndex].majorityType === VotingMajorityTypes.TWO_THIRDS)
      // @todo this majority should be fixed in the Statutes (it's not possible to calculate "+1" with weighted voting)
      return this.getResultOfBallotOptionBasedOnRaw(bIndex, winnerOptionIndex) > 2 / 3 ? winnerOptionIndex : -1;
  }

  handleBallotReorder({ detail }): void {
    this.votingSession.ballots = detail.complete(this.votingSession.ballots);
  }

  buildCharts(): void {
    if (!this.results) return;
    this.votingSession.ballots.forEach((_, bIndex): void => {
      const labels = this.getOptionsOfBallotIncludingAbstainAndAbsentByIndex(bIndex);
      const data = this.getOptionsOfBallotIncludingAbstainAndAbsentByIndex(bIndex).map((_, oIndex): any =>
        this.getResultOfBallotOptionBasedOnRaw(bIndex, oIndex)
      );

      const chartCanvas = document.getElementById(this.chartCanvasBaseId + bIndex) as HTMLCanvasElement;
      this.charts[bIndex] = new Chart(chartCanvas, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: this.chartColors }] },
        options: {
          layout: { padding: 20 },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: { label: tooltipItem => `${(Number(tooltipItem.formattedValue) * 100).toFixed(2)}%` }
            }
          }
        }
      });
    });
  }

  async openBallotVotesDetailPopover(
    ballotIndex: number,
    optionIndex: number,
    option: string,
    event: Event
  ): Promise<void> {
    if (!this.results || this.votingSession.isSecret) return;
    const componentProps = {
      ballotOption: option,
      resultValue: this.getResultOfBallotOptionBasedOnRaw(ballotIndex, optionIndex),
      votersNames: this.results[ballotIndex][optionIndex].voters
    };
    const popover = await this.popoverCtrl.create({
      component: BallotVotesDetailStandaloneComponent,
      componentProps,
      event
    });
    popover.present();
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
