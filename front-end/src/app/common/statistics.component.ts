import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { addDays } from 'date-fns/esm';
import Chart from 'chart.js/auto';
import { IDEALoadingService, IDEAMessageService, IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { StatisticsService } from './statistics.service';

import { StatisticEntityTypes, Statistic, StatisticGranularities } from '@models/statistic.model';

@Component({
  selector: 'app-statistics-button',
  template: `
    <ion-button size="small" fill="clear" [color]="color" (click)="openStatistics($event)">
      <ion-icon icon="stats-chart" slot="icon-only" size="small" />
    </ion-button>
  `,
  styles: [
    `
      ion-button {
        --padding-start: 4px;
        --padding-end: 4px;
      }
    `
  ]
})
export class StatisticsButtonComponent {
  /**
   * The entity type for which to display the statistics.
   */
  @Input() entityType: StatisticEntityTypes;
  /**
   * The optional entity ID for which to display the statistics.
   */
  @Input() entityId: string = null;
  /**
   * The period to consider for the statistics data to acquire and display.
   */
  @Input() period: StatisticPeriods = StatisticPeriods.ONE_YEAR;
  /**
   * The granularity of the statistic to display.
   */
  @Input() granularity: StatisticGranularities = StatisticGranularities.MONTHLY;
  /**
   * Whether to group the statistic per ESN country.
   */
  @Input() groupBy: 'country' | 'section' | null = null;
  /**
   * The type of chart to display.
   */
  @Input() chartType: 'bar' | 'line' = 'bar';
  /**
   * An optional title to show
   */
  @Input() title: string = null;
  /**
   * The color of the button.
   */
  @Input() color: string = 'ESNpink';

  constructor(private modalCtrl: ModalController) {}

  async openStatistics(event?: Event): Promise<void> {
    if (event) event.stopPropagation();
    const componentProps = {
      entityType: this.entityType,
      entityId: this.entityId,
      period: this.period,
      granularity: this.granularity,
      groupBy: this.groupBy,
      chartType: this.chartType,
      title: this.title
    };
    const cssClass = 'modalFullScreen';
    const popover = await this.modalCtrl.create({ component: StatisticsComponent, componentProps, cssClass });
    popover.present();
  }
}

@Component({
  selector: 'app-statistics',
  templateUrl: 'statistics.component.html',
  styleUrls: ['statistics.component.scss']
})
export class StatisticsComponent implements OnInit {
  @Input({ required: true }) entityType: StatisticEntityTypes;
  @Input({ required: true }) entityId: string | null;
  @Input({ required: true }) period: StatisticPeriods;
  @Input({ required: true }) granularity: StatisticGranularities;
  @Input({ required: true }) groupBy: 'country' | 'section' | null;
  @Input({ required: true }) chartType: 'bar' | 'line';
  @Input({ required: true }) title: string | null;

  statistic: Statistic;

  GranularitiesList = Object.keys(StatisticGranularities);
  Granularities = StatisticGranularities;
  Periods = StatisticPeriods;
  PeriodsList = Object.keys(StatisticPeriods).filter(x => isNaN(Number(x)));

  chart: Chart;

  constructor(
    private modalCtrl: ModalController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private _statistics: StatisticsService,
    public app: AppService
  ) {}
  async ngOnInit(): Promise<void> {
    await this.loadStatisticAndBuildChart();
  }
  async loadStatisticAndBuildChart(): Promise<void> {
    try {
      await this.loading.show();
      this.statistic = await this._statistics.getInTimeWindowOfEntity({
        since: addDays(new Date(), -this.period).toISOString(),
        to: new Date().toISOString(),
        granularity: this.granularity,
        entityType: this.entityType,
        entityId: this.entityId
      });
    } catch (error) {
      this.message.error('COMMON.SOMETHING_WENT_WRONG');
    } finally {
      this.loading.hide();
    }
    this.buildChart();
  }
  buildChart(): void {
    this.chart?.destroy();

    const datasets: { label: string; data: number[] }[] = [];

    const labels = this.statistic.timePoints.map(x =>
      this.t.formatDate(
        x,
        this.granularity === StatisticGranularities.HOURLY
          ? `HH':00', d MMM yy`
          : this.granularity === StatisticGranularities.DAILY
          ? 'd MMM yy'
          : 'MMM YYYY'
      )
    );

    if (this.groupBy === 'country') {
      Object.entries(this.statistic.byCountry).forEach(([country, data]): number =>
        datasets.push({ label: country, data })
      );
    } else if (this.groupBy === 'section') {
      Object.entries(this.statistic.bySection).forEach(([section, data]): number =>
        datasets.push({ label: section, data })
      );
    } else {
      const data = [];
      Object.values(this.statistic.byCountry).forEach(valuesOfCountry =>
        valuesOfCountry.forEach((value, index): void => (data[index] = (data[index] ?? 0) + value))
      );
      datasets.push({ label: this.t._('STATISTICS.ALL_USERS'), data });
    }

    const chartCanvas = document.getElementById('theChart') as HTMLCanvasElement;
    this.chart = new Chart(chartCanvas, {
      type: this.chartType,
      data: { labels, datasets },
      options: {
        maintainAspectRatio: false,
        layout: { padding: 20 },
        plugins: { colors: { enabled: true }, tooltip: {}, legend: {} },
        scales: {
          x: { stacked: this.chartType === 'bar' && !!this.groupBy },
          y: { stacked: this.chartType === 'bar' && !!this.groupBy, ticks: { precision: 0 } }
        }
      }
    });
  }

  getFirstDateOfStatistic(): Date {
    return this.statistic.timePoints.length ? new Date(this.statistic.timePoints[0].slice(0, 10)) : null;
  }

  close(): void {
    this.modalCtrl.dismiss();
  }
}

/**
 * The period choices (in number of days) to gather data for a statistic.
 */
export enum StatisticPeriods {
  THREE_YEARS = 1095,
  ONE_YEAR = 365,
  THREE_MONTHS = 92,
  ONE_MONTH = 31,
  ONE_WEEK = 7,
  TODAY = 0
}
