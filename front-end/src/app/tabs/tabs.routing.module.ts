import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TabsComponent } from './tabs.component';

const routes: Routes = [
  {
    path: '',
    component: TabsComponent,
    children: [
      { path: '', redirectTo: 'topics', pathMatch: 'full' },
      {
        path: 'topics',
        loadChildren: (): Promise<any> => import('./topics/topics.module').then(m => m.TopicsModule)
      },
      {
        path: 'archive',
        loadChildren: (): Promise<any> => import('./archive/archive.module').then(m => m.ArchiveModule)
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
