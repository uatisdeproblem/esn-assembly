import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HttpClientModule } from '@angular/common/http';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { HTMLEditorComponent } from './htmlEditor.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, HttpClientModule, AngularEditorModule, IDEATranslationsModule],
  declarations: [HTMLEditorComponent],
  exports: [HTMLEditorComponent]
})
export class HTMLEditorModule {}
