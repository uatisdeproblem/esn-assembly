import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { DateTimezonePipe } from '@common/dateTimezone.pipe';

import { AppService } from '@app/app.service';

import { VotingSession } from '@models/votingSession.model';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslationsModule, DateTimezonePipe],
  selector: 'app-voting-session',
  templateUrl: 'votingSession.component.html',
  styleUrls: ['votingSession.component.scss']
})
export class VotingSessionStandaloneComponent {
  /**
   * The voting session to show. If null, load a skeleton instead.
   */
  @Input() votingSession: VotingSession | null;
  /**
   * Whether to display the voting session as a grid row.
   */
  @Input() row = false;
  /**
   * In case `row`, whether to display the header row.
   */
  @Input() header = false;
  /**
   * Trigger when a voting session is selected.
   */
  @Output() select = new EventEmitter<void>();

  constructor(public app: AppService) {}
}
