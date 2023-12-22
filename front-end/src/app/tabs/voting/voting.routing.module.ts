import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { VotingSessionsPage } from './votingSessions.page';
import { VotingSessionPage } from './votingSession.page';
import { ManageVotingSessionPage } from './manageSession.page';

const routes: Routes = [
  { path: '', component: VotingSessionsPage },
  {
    path: 'archive',
    loadChildren: (): Promise<any> => import('./archive/votingArchive.module').then(m => m.VotingArchiveModule)
  },
  { path: ':sessionId', component: VotingSessionPage },
  { path: ':sessionId/manage', component: ManageVotingSessionPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class VotingRoutingModule {}
