import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TopicsPage } from './topics.page';
import { StandardTopicPage } from './standardTopic.page';
import { LiveTopicPage } from './liveTopic.page';
import { ManageTopicPage } from './manageTopic.page';

const routes: Routes = [
  { path: '', component: TopicsPage },
  {
    path: 'archive',
    loadChildren: (): Promise<any> => import('./archive/archive.module').then(m => m.ArchiveModule)
  },
  { path: ':topicId/standard', component: StandardTopicPage },
  { path: ':topicId/live', component: LiveTopicPage },
  { path: ':topicId/manage', component: ManageTopicPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TopicsRoutingModule {}
