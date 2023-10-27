import { Component, EventEmitter, Input, Output } from '@angular/core';

import { AppService } from '@app/app.service';

import { Topic, TopicTypes } from '@models/topic.model';
import { SubjectTypes } from '@models/subject.model';
import { FAVORITE_TIMEZONE } from '@models/favoriteTimezone.const';
import { StatisticEntityTypes } from '@models/statistic.model';

@Component({
  selector: 'app-topic',
  templateUrl: 'topic.component.html',
  styleUrls: ['topic.component.scss']
})
export class TopicComponent {
  /**
   * The topic to show. If null, load a skeleton instead.
   */
  @Input() topic: Topic | null;
  /**
   * Whether to display the topic as a grid row.
   */
  @Input() row = false;
  /**
   * In case `row`, whether to display the header row.
   */
  @Input() header = false;
  /**
   * Trigger when a topic is selected.
   */
  @Output() select = new EventEmitter<void>();

  TopicTypes = TopicTypes;
  SubjectTypes = SubjectTypes;
  FAVORITE_TIMEZONE = FAVORITE_TIMEZONE;

  SET = StatisticEntityTypes;

  constructor(public app: AppService) {}
}
