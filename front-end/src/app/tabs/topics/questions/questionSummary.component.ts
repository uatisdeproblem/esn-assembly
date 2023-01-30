import { Component, EventEmitter, Input, Output } from '@angular/core';

import { AppService } from '@app/app.service';

import { Question } from '@models/question.model';

@Component({
  selector: 'app-question-summary',
  templateUrl: 'questionSummary.component.html',
  styleUrls: ['questionSummary.component.scss']
})
export class QuestionSummaryComponent {
  /**
   * The question to show. If null, load a skeleton instead.
   */
  @Input() question: Question | null;
  /**
   * Whether the question is currently selected.
   */
  @Input() current = false;
  /**
   * Trigger when a question is selected.
   */
  @Output() select = new EventEmitter<void>();

  constructor(public app: AppService) {}
}
