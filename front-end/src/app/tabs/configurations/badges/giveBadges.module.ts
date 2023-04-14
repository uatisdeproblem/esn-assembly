import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { GiveBadgesComponent } from './giveBadges.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslationsModule],
  declarations: [GiveBadgesComponent],
  exports: [GiveBadgesComponent]
})
export class GiveBadgesModule {}
