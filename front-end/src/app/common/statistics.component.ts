import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { addYears, isToday } from 'date-fns/esm';
import Chart from 'chart.js/auto';
import { epochISOString } from 'idea-toolbox';
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
  `
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
   * The starting date for the the statistics data to acquire and display.
   */
  @Input() since: epochISOString = addYears(new Date(), -1).toISOString();
  /**
   * The ending date for the the statistics data to acquire and display.
   */
  @Input() to: epochISOString = new Date().toISOString();
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
      since: this.since,
      to: this.to,
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
  @Input({ required: true }) since: epochISOString;
  @Input({ required: true }) to: epochISOString;
  @Input({ required: true }) title: string | null;

  statistic: Statistic;

  chartType: 'bar' | 'line' = 'bar';
  groupByCountry = false;
  granularity = StatisticGranularities.MONTHLY;
  Granularities = StatisticGranularities;

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
        since: this.since,
        to: this.to,
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
      this.t.formatDate(x, this.granularity === StatisticGranularities.DAILY ? 'd MMM yy' : 'MMM YYYY')
    );

    if (this.groupByCountry) {
      Object.entries(this.statistic.details).forEach(([country, data]): number =>
        datasets.push({ label: country, data })
      );
    } else {
      const data = [];
      Object.values(this.statistic.details).forEach(valuesOfCountry =>
        valuesOfCountry.forEach((value, index): void => (data[index] = (data[index] ?? 0) + value))
      );
      datasets.push({ label: this.t._('STATISTICS.ALL_COUNTRIES'), data });
    }

    const chartCanvas = document.getElementById('theChart') as HTMLCanvasElement;
    this.chart = new Chart(chartCanvas, {
      type: this.chartType,
      data: { labels, datasets },
      options: {
        layout: { padding: 20 },
        plugins: { colors: { enabled: true }, tooltip: {}, legend: {} },
        scales: {
          x: { stacked: this.chartType === 'bar' && this.groupByCountry },
          y: { stacked: this.chartType === 'bar' && this.groupByCountry, ticks: { precision: 0 } }
        }
      }
    });
  }

  isToday(date: string | number | Date): boolean {
    return isToday(new Date(date));
  }

  close(): void {
    this.modalCtrl.dismiss();
  }
}
