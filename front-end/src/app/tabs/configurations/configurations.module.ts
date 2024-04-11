import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { IDEAShowHintButtonModule, IDEATranslationsModule } from '@idea-ionic/common';

import { ConfigurationsRoutingModule } from './configurations.routing.module';
import { ConfigurationsPage } from './configurations.page';

import { EmailTemplateModule } from './emailTemplate/emailTemplate.module';
import { GiveBadgesComponent } from './badges/giveBadges.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IDEATranslationsModule,
    IDEAShowHintButtonModule,
    ConfigurationsRoutingModule,
    EmailTemplateModule,
    GiveBadgesComponent
  ],
  declarations: [ConfigurationsPage]
})
export class ConfigurationsModule {}
