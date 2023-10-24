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
  @Input() reaction: 'upvote' | 'clap' | 'appreciation';

  showSpinner = true;
  subjects: Subject[];

  icon: string;
  color: string;

  constructor(private popoverCtrl: PopoverController, public app: AppService) {}
  async ngAfterViewInit(): Promise<void> {
    if (this.subjectsPromise) this.subjects = await this.subjectsPromise;
    this.showSpinner = false;
    this.icon = this.getIcon();
    this.color = this.getColor();
  }

  private getIcon(): string {
    if (this.reaction === 'upvote') return 'thumbs-up';
    if (this.reaction === 'clap') return '/assets/icons/clap.svg';
    if (this.reaction === 'appreciation') return 'heart';
  }
  private getColor(): string {
    if (this.reaction === 'upvote') return 'ESNgreen';
    if (this.reaction === 'clap') return 'ESNpink';
    if (this.reaction === 'appreciation') return 'ESNpink';
  }

  close(): void {
    this.popoverCtrl.dismiss();
  }
}
