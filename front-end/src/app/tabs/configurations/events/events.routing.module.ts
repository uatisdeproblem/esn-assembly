import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EventsPage } from './events.page';
import { EventPage } from './event.page';

const routes: Routes = [
  { path: '', component: EventsPage },
  { path: ':eventId', component: EventPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EventsRoutingModule {}
