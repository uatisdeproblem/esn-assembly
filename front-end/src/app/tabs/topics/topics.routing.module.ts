import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TopicsPage } from './topics.page';
import { TopicPage } from './topic.page';

const routes: Routes = [
  { path: '', component: TopicsPage },
  { path: ':topicId', component: TopicPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TopicsRoutingModule {}
