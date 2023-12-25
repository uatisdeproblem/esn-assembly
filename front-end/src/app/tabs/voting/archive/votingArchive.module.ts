import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { VotingArchiveRoutingModule } from './votingArchive.routing.module';
import { VotingArchivePage } from './votingArchive.page';

import { VotingSessionStandaloneComponent } from '../votingSession.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IDEATranslationsModule,
    VotingArchiveRoutingModule,
    VotingSessionStandaloneComponent
  ],
  declarations: [VotingArchivePage]
})
export class VotingArchiveModule {}
