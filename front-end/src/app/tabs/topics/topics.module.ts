import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { TopicsRoutingModule } from './topics.routing.module';
import { TopicsPage } from './topics.page';
import { TopicPage } from './topic.page';
import { ManageTopicPage } from './manageTopic.page';

import { TopicModule } from '../topics/topic.module';
import { QuestionModule } from './questions/question.module';
import { SubjectModule } from '@common/subject.module';
import { EditModeButtonsModule } from 'src/app/common/editModeButtons.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IDEATranslationsModule,
    TopicsRoutingModule,
    TopicModule,
    QuestionModule,
    SubjectModule,
    EditModeButtonsModule
  ],
  declarations: [TopicsPage, TopicPage, ManageTopicPage]
})
export class TopicsModule {}
