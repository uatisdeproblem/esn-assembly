import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TopicsPage } from './topics.page';
import { TopicPage } from './topic.page';
import { ManageTopicPage } from './manageTopic.page';

const routes: Routes = [
  { path: '', component: TopicsPage },
  { path: ':topicId', component: TopicPage },
  { path: ':topicId/manage', component: ManageTopicPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TopicsRoutingModule {}
