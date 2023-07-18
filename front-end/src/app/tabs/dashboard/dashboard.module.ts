import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { DashboardRoutingModule } from './dashboard.routing.module';
import { DashboardPage } from './dashboard.page';

import { CommunicationComponent } from './communications/communication.component';
import { DeadlineComponent } from './deadlines/deadline.component';
import { DeadlinesComponent } from './deadlines/deadlines.component';
import { UsefulLinkComponent } from './usefulLinks/usefulLink.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IDEATranslationsModule,
    DashboardRoutingModule,
    CommunicationComponent,
    DeadlineComponent,
    DeadlinesComponent,
    UsefulLinkComponent
  ],
  declarations: [DashboardPage]
})
export class DashboardModule {}
