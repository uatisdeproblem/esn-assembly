import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { SubjectComponent } from './subject.component';
import { SubjectsReactionsComponent } from './subjectsReactions.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslationsModule],
  declarations: [SubjectComponent, SubjectsReactionsComponent],
  exports: [SubjectComponent, SubjectsReactionsComponent]
})
export class SubjectModule {}
