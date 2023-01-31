import { Component, Input, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { SecurityContext } from '@angular/core';

import { AppService } from '@app/app.service';

import { Subject } from '@models/subject.model';

@Component({
  selector: 'app-message-bubble',
  templateUrl: 'messageBubble.component.html',
  styleUrls: ['messageBubble.component.scss']
})
export class MessageBubbleComponent implements OnInit {
  /**
   * The text to show; if null, load a skeleton instead.
   */
  @Input() text: string | null;
  /**
   * The creator of the text.
   */
  @Input() creator: Subject;
  /**
   * Whether the creator of the text is the sender.
   */
  @Input() isSender = false;

  sanitizedHtml: string;

  constructor(private sanitizer: DomSanitizer, public app: AppService) {}
  ngOnInit(): void {
    this.sanitizedHtml = this.sanitizer.sanitize(SecurityContext.HTML, this.text);
  }
}
