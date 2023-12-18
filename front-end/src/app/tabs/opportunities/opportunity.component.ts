import { Component, EventEmitter, Input, Output } from '@angular/core';

import { AppService } from '@app/app.service';

import { Opportunity } from '@models/opportunity.model';
import { StatisticEntityTypes } from '@models/statistic.model';

@Component({
  selector: 'app-opportunity',
  templateUrl: 'opportunity.component.html',
  styleUrls: ['opportunity.component.scss']
})
export class OpportunityComponent {
  /**
   * The opportunity to show. If null, load a skeleton instead.
   */
  @Input() opportunity: Opportunity | null;
  /**
   * Whether to display the opportunity as a grid row.
   */
  @Input() row = false;
  /**
   * In case `row`, whether to display the header row.
   */
  @Input() header = false;
  /**
   * Trigger when a opportunity is selected.
   */
  @Output() select = new EventEmitter<void>();

  SET = StatisticEntityTypes;

  constructor(public app: AppService) {}
}
