import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { IDEATranslationsModule } from '@idea-ionic/common';

import { StatisticsButtonComponent, StatisticsComponent } from './statistics.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslationsModule],
  declarations: [StatisticsComponent, StatisticsButtonComponent],
  exports: [StatisticsComponent, StatisticsButtonComponent]
})
export class StatisticsModule {}
