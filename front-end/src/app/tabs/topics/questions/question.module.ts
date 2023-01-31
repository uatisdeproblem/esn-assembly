import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { QuestionSummaryComponent } from './questionSummary.component';
import { QuestionComponent } from './question.component';

import { SubjectModule } from '@common/subject.module';
import { MessageBubbleModule } from '@common/messageBubble.module';
import { HTMLEditorModule } from 'src/app/common/htmlEditor.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IDEATranslationsModule,
    SubjectModule,
    MessageBubbleModule,
    HTMLEditorModule
  ],
  declarations: [QuestionSummaryComponent, QuestionComponent],
  exports: [QuestionSummaryComponent, QuestionComponent]
})
export class QuestionModule {}
