import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { StatisticsModule } from '@common/statistics.module';
import { DateTimezonePipe } from '@common/dateTimezone.pipe';

import { TopicComponent } from './topic.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslationsModule, StatisticsModule, DateTimezonePipe],
  declarations: [TopicComponent],
  exports: [TopicComponent]
})
export class TopicModule {}
