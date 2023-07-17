import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { DashboardRoutingModule } from './dashboard.routing.module';
import { CommunicationsComponent, DashboardPage } from './dashboard.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslationsModule, DashboardRoutingModule],
  declarations: [DashboardPage, CommunicationsComponent]
})
export class DashboardModule {}
