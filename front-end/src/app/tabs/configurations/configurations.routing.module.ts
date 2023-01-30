import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ConfigurationsPage } from './configurations.page';

const routes: Routes = [
  { path: '', component: ConfigurationsPage },
  {
    path: 'categories',
    loadChildren: (): Promise<any> => import('./categories/categories.module').then(m => m.CategoriesModule)
  },
  {
    path: 'events',
    loadChildren: (): Promise<any> => import('./events/events.module').then(m => m.EventsModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConfigurationsRoutingModule {}
