import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { ConfigurationsRoutingModule } from './configurations.routing.module';
import { ConfigurationsPage } from './configurations.page';

import { EmailTemplateModule } from 'src/app/common/emailTemplate.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IDEATranslationsModule,
    ConfigurationsRoutingModule,
    EmailTemplateModule
  ],
  declarations: [ConfigurationsPage]
})
export class ConfigurationsModule {}
