import { Component, Input } from '@angular/core';
import { Browser } from '@capacitor/browser';

import { AppService } from '@app/app.service';

import { Subject, SubjectTypes } from '@models/subject.model';

@Component({
  selector: 'app-subject',
  templateUrl: 'subject.component.html',
  styleUrls: ['subject.component.scss']
})
export class SubjectComponent {
  /**
   * The subject to show.
   */
  @Input() subject: Subject;
  /**
   * The color of the item.
   */
  @Input() color: string;
  /**
   * The lines attribute of the item.
   */
  @Input() lines: string;

  SubjectTypes = SubjectTypes;

  constructor(public app: AppService) {}

  async openOnGalaxy(): Promise<void> {
    const url = this.subject.getURL();
    await Browser.open({ url });
  }
}
