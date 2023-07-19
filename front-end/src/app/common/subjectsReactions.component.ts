import { AfterViewInit, Component, Input } from '@angular/core';
import { PopoverController } from '@ionic/angular';

import { AppService } from '@app/app.service';

import { Subject } from '@models/subject.model';

@Component({
  selector: 'app-subject-reactions',
  templateUrl: 'subjectsReactions.component.html',
  styleUrls: ['subjectsReactions.component.scss']
})
export class SubjectsReactionsComponent implements AfterViewInit {
  /**
   * The subject to show.
   */
  @Input() subjectsPromise: Promise<Subject[]>;
  /**
   * The reaction.
   */
  @Input() reaction: 'upvote' | 'clap';

  showSpinner = true;
  subjects: Subject[];

  constructor(private popoverCtrl: PopoverController, public app: AppService) {}
  async ngAfterViewInit(): Promise<void> {
    if (this.subjectsPromise) this.subjects = await this.subjectsPromise;
    this.showSpinner = false;
  }

  close(): void {
    this.popoverCtrl.dismiss();
  }
}
