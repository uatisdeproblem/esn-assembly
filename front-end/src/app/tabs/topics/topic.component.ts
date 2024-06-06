import { Component, EventEmitter, Input, Output } from '@angular/core';

import { AppService } from '@app/app.service';

import { Topic, TopicTypes } from '@models/topic.model';
import { SubjectTypes } from '@models/subject.model';
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
  /**
   * Trigger when a topic's checkbox is changed
   */
  @Output() checkboxChange = new EventEmitter<boolean>();

  TopicTypes = TopicTypes;
  SubjectTypes = SubjectTypes;
  selected = false;

  SET = StatisticEntityTypes;

  constructor(public app: AppService) {}

  onCheckboxChange(event: any) {
    this.selected = event.detail.checked;
    this.checkboxChange.emit(this.selected);
  }

  onTopicClick() {
    this.select.emit();
  }
}
