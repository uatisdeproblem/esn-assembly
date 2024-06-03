import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { IDEACheckerModule, IDEATranslationsModule } from '@idea-ionic/common';

import { SubjectModule } from '@common/subject.module';
import { EditModeButtonsModule } from '@common/editModeButtons.module';
import { AttachmentsModule } from '@common/attachments.module';
import { HTMLEditorModule } from '@common/htmlEditor.module';
import { EventsPickerComponent } from '@common/eventsPicker.component';
import { CategoriesPickerComponent } from '@common/categoriesPicker.component';
import { StatisticsModule } from '@common/statistics.module';
import { DateTimezonePipe } from '@common/dateTimezone.pipe';
import { DatetimeWithTimezoneStandaloneComponent } from '@common/datetimeWithTimezone';

import { TopicsRoutingModule } from './topics.routing.module';
import { TopicsPage } from './topics.page';
import { StandardTopicPage } from './standardTopic.page';
import { ManageTopicPage } from './manageTopic.page';
import { LiveTopicPage } from './liveTopic.page';

import { TopicModule } from '../topics/topic.module';
import { QuestionModule } from './questions/question.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IDEATranslationsModule,
    IDEACheckerModule,
    EventsPickerComponent,
    CategoriesPickerComponent,
    TopicsRoutingModule,
    TopicModule,
    QuestionModule,
    SubjectModule,
    EditModeButtonsModule,
    AttachmentsModule,
    HTMLEditorModule,
    StatisticsModule,
    DateTimezonePipe,
    DatetimeWithTimezoneStandaloneComponent
  ],
  declarations: [TopicsPage, StandardTopicPage, LiveTopicPage, ManageTopicPage],
})
export class TopicsModule {}
