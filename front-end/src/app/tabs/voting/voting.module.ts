import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { VotingRoutingModule } from './voting.routing.module';
import { VotingSessionsPage } from './votingSessions.page';
import { ManageVotingSessionPage } from './manageSession.page';
import { VotingSessionPage } from './votingSession.page';

import { VotingSessionStandaloneComponent } from './votingSession.component';
import { ManageBallotStandaloneComponent } from './ballots/manageBallot.component';
import { ManageVoterStandaloneComponent } from './voters/manageVoter.component';
import { EditModeButtonsModule } from '@common/editModeButtons.module';
import { EventsPickerComponent } from '@common/eventsPicker.component';
import { DatetimeWithTimezoneStandaloneComponent } from '@common/datetimeWithTimezone';
import { HTMLEditorModule } from '@common/htmlEditor.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NgxDatatableModule,
    IDEATranslationsModule,
    VotingRoutingModule,
    VotingSessionStandaloneComponent,
    ManageBallotStandaloneComponent,
    ManageVoterStandaloneComponent,
    EditModeButtonsModule,
    EventsPickerComponent,
    DatetimeWithTimezoneStandaloneComponent,
    HTMLEditorModule
  ],
  declarations: [VotingSessionsPage, ManageVotingSessionPage, VotingSessionPage]
})
export class VotingModule {}
