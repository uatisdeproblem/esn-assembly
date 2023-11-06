import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { OpportunitiesPage } from './opportunities.page';
import { OpportunityPage } from './opportunity.page';
import { ManageOpportunityPage } from './manageOpportunity.page';

const routes: Routes = [
  { path: '', component: OpportunitiesPage },
  {
    path: 'archive',
    loadChildren: (): Promise<any> => import('./archive/archive.module').then(m => m.ArchiveModule)
  },
  { path: ':opportunityId', component: OpportunityPage },
  { path: ':opportunityId/manage', component: ManageOpportunityPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OpportunitiesRoutingModule {}
