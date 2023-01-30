import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { EditModeButtonsComponent } from './editModeButtons.component';

@NgModule({
  imports: [CommonModule, IonicModule, IDEATranslationsModule],
  declarations: [EditModeButtonsComponent],
  exports: [EditModeButtonsComponent]
})
export class EditModeButtonsModule {}
