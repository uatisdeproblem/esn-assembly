import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { IDEASelectModule, IDEAShowHintButtonModule, IDEATranslationsModule } from '@idea-ionic/common';

import { VotingRoutingModule } from './voting.routing.module';
import { VotingSessionsPage } from './votingSessions.page';
import { ManageVotingSessionPage } from './manageSession.page';
import { VotingSessionPage } from './votingSession.page';

import { VotingSessionStandaloneComponent } from './votingSession.component';
import { ManageBallotStandaloneComponent } from './ballots/manageBallot.component';
import { ManageVoterStandaloneComponent } from './voters/manageVoter.component';
import { BallotsStandaloneComponent } from './ballots/ballots.component';
import { ImportVotersStandaloneComponent } from './voters/importVoters.component';

import { EditModeButtonsModule } from '@common/editModeButtons.module';
import { EventsPickerComponent } from '@common/eventsPicker.component';
import { DatetimeWithTimezoneStandaloneComponent } from '@common/datetimeWithTimezone';
import { HTMLEditorModule } from '@common/htmlEditor.module';
import { DateTimezonePipe } from '@common/dateTimezone.pipe';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NgxDatatableModule,
    IDEATranslationsModule,
    IDEASelectModule,
    IDEAShowHintButtonModule,
    VotingRoutingModule,
    VotingSessionStandaloneComponent,
    ManageBallotStandaloneComponent,
    ManageVoterStandaloneComponent,
    BallotsStandaloneComponent,
    ImportVotersStandaloneComponent,
    EditModeButtonsModule,
    EventsPickerComponent,
    DatetimeWithTimezoneStandaloneComponent,
    HTMLEditorModule,
    DateTimezonePipe
  ],
  declarations: [VotingSessionsPage, ManageVotingSessionPage, VotingSessionPage]
})
export class VotingModule {}
