import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import {
  addDays,
  addMonths,
  addYears,
  endOfDay,
  endOfMonth,
  isBefore,
  isToday,
  startOfDay,
  startOfMonth
} from 'date-fns/esm';
import Chart from 'chart.js/auto';
import { epochISOString } from 'idea-toolbox';
import { IDEALoadingService, IDEAMessageService, IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { StatisticsService } from './statistics.service';

import { StatisticEntityTypes, Statistic } from '@models/statistic.model';

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
  granularity = Granularities.MONTHLY;
  Granularities = Granularities;

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
    try {
      await this.loading.show();
      this.statistic = await this._statistics.getInTimeWindowOfEntity(
        this.since,
        this.to,
        this.entityType,
        this.entityId
      );
    } catch (error) {
      this.message.error('COMMON.SOMETHING_WENT_WRONG');
    } finally {
      this.loading.hide();
    }
    this.buildChart();
  }
  buildChart(): void {
    if (this.since > this.to) return;

    this.chart?.destroy();

    const timePoints = this.buildTimePointsBasedOnGranularity(true);
    const labels = timePoints.map(x =>
      this.t.formatDate(x, this.granularity === Granularities.DAILY ? 'd MMM yy' : 'MMM YYYY')
    );
    const datasets = this.buildDatasetsBasedOnGrouping(timePoints);

    const chartCanvas = document.getElementById('theChart') as HTMLCanvasElement;
    this.chart = new Chart(chartCanvas, {
      type: this.chartType,
      data: { labels, datasets },
      options: {
        layout: { padding: 20 },
        plugins: { colors: { enabled: true }, tooltip: {}, legend: {} },
        scales: {
          x: { stacked: this.chartType === 'bar' && this.groupByCountry },
          y: { stacked: this.chartType === 'bar' && this.groupByCountry }
        }
      }
    });
  }
  buildTimePointsBasedOnGranularity(translate = false): string[] {
    const timePoints = [];
    let currentDate = new Date(this.since);
    const to = new Date(this.to);
    if (this.granularity === Granularities.DAILY) {
      while (isBefore(startOfDay(currentDate), endOfDay(to))) {
        timePoints.push(currentDate.toISOString().slice(0, 10));
        currentDate = addDays(currentDate, 1);
      }
    } else {
      while (isBefore(startOfMonth(currentDate), endOfMonth(to))) {
        timePoints.push(currentDate.toISOString().slice(0, 7));
        currentDate = addMonths(currentDate, 1);
      }
    }
    return timePoints;
  }
  buildDatasetsBasedOnGrouping(timePoints: string[]): { label: string; data: number[] }[] {
    const countriesSet = new Set<string>();
    Object.values(this.statistic.details).map(x => Object.keys(x).forEach(x => countriesSet.add(x)));
    const countries = Array.from(countriesSet);

    const allCountriesKey = this.t._('STATISTICS.ALL_COUNTRIES');
    const datasets = this.groupByCountry
      ? countries.map(country => ({ label: country, data: [] }))
      : [{ label: allCountriesKey, data: [] }];

    timePoints.forEach(timePoint => {
      const valueOfCountriesForTimePoint: Map<string, number> = new Map();

      const timestampsInCurrentTimePoint = Object.keys(this.statistic.details).filter(x => x.startsWith(timePoint));
      timestampsInCurrentTimePoint.forEach(timestamp => {
        countries.forEach(country => {
          const valueOfCountryInTimestamp = this.statistic.details[timestamp][country] ?? 0;
          const mapKey = this.groupByCountry ? country : allCountriesKey;
          const totalOfCountryInTimePoint = valueOfCountriesForTimePoint.get(mapKey) ?? 0;
          valueOfCountriesForTimePoint.set(mapKey, totalOfCountryInTimePoint + valueOfCountryInTimestamp);
        });
      });

      datasets.forEach(dataset => {
        dataset.data.push(valueOfCountriesForTimePoint.get(dataset.label));
      });
    });

    return datasets;
  }

  isToday(date: string | number | Date): boolean {
    return isToday(new Date(date));
  }

  close(): void {
    this.modalCtrl.dismiss();
  }
}

enum Granularities {
  // HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  MONTHLY = 'MONTHLY'
}
