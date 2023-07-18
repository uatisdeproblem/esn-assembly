import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { DashboardRoutingModule } from './dashboard.routing.module';
import { DashboardPage } from './dashboard.page';

import { CommunicationComponent } from './communications/communication.component';
import { CommunicationDetailComponent } from './communications/communicationDetail.component';
import { ManageCommunicationComponent } from './communications/manageCommunication.component';
import { DeadlineComponent } from './deadlines/deadline.component';
import { DeadlinesComponent } from './deadlines/deadlines.component';
import { UsefulLinkComponent } from './usefulLinks/usefulLink.component';
import { ManageUsefulLinkComponent } from './usefulLinks/manageUsefulLink.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IDEATranslationsModule,
    DashboardRoutingModule,
    CommunicationComponent,
    CommunicationDetailComponent,
    ManageCommunicationComponent,
    DeadlineComponent,
    DeadlinesComponent,
    UsefulLinkComponent,
    ManageUsefulLinkComponent
  ],
  declarations: [DashboardPage]
})
export class DashboardModule {}
