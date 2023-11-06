import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TabsComponent } from './tabs.component';

const routes: Routes = [
  {
    path: '',
    component: TabsComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: (): Promise<any> => import('./dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'topics',
        loadChildren: (): Promise<any> => import('./topics/topics.module').then(m => m.TopicsModule)
      },
      {
        path: 'opportunities',
        loadChildren: (): Promise<any> =>
          import('./opportunities/opportunities.module').then(m => m.OpportunitiesModule)
      },
      {
        path: 'profile',
        loadChildren: (): Promise<any> => import('./profile/profile.module').then(m => m.ProfileModule)
      },
      {
        path: 'configurations',
        loadChildren: (): Promise<any> =>
          import('./configurations/configurations.module').then(m => m.ConfigurationsModule)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)]
})
export class TabsComponentRoutingModule {}
