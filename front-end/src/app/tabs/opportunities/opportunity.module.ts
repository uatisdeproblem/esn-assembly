import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { StatisticsModule } from '@common/statistics.module';

import { OpportunityComponent } from './opportunity.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslationsModule, StatisticsModule],
  declarations: [OpportunityComponent],
  exports: [OpportunityComponent]
})
export class OpportunityModule {}
