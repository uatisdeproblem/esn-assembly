import { Component, Input } from '@angular/core';

import { AppService } from '@app/app.service';

import { Question, QuestionMessage } from '@models/question.model';
import { Topic } from '@models/topic.model';

@Component({
  selector: 'app-question',
  templateUrl: 'question.component.html',
  styleUrls: ['question.component.scss']
})
export class QuestionComponent {
  /**
   * The question's topic.
   */
  @Input() topic: Topic;
  /**
   * The question to show.
   */
  @Input() question: Question;

  messages: QuestionMessage[] = [
    {
      questionId: 'q1',
      messageId: 'm1',
      text: 'This is an example',
      creator: {
        username: 'gt',
        name: 'Matteo Carbone',
        country: 'ESN Italy',
        section: 'ESN Modena',
        avatarURL: 'https://matteocarbone.com/media/MC.png'
      },
      createdAt: Date.now()
    }
  ].map(x => new QuestionMessage(x));

  constructor(public app: AppService) {}
}
