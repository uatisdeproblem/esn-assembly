import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { VotingArchivePage } from './votingArchive.page';

const routes: Routes = [{ path: '', component: VotingArchivePage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class VotingArchiveRoutingModule {}
