import { Component, Input } from '@angular/core';

import { AppService } from '@app/app.service';

import { Subject } from '@models/subject.model';

@Component({
  selector: 'app-message-bubble',
  templateUrl: 'messageBubble.component.html',
  styleUrls: ['messageBubble.component.scss']
})
export class MessageBubbleComponent {
  /**
   * The text to show.
   */
  @Input() text: string;
  /**
   * The creator of the text.
   */
  @Input() creator: Subject;
  /**
   * Whether the creator of the text is the sender.
   */
  @Input() isSender = false;

  constructor(public app: AppService) {}
}
