import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { UserBadgeComponent } from './userBadge.component';

@NgModule({
  imports: [IonicModule, CommonModule, FormsModule, IDEATranslationsModule],
  declarations: [UserBadgeComponent],
  exports: [UserBadgeComponent]
})
export class UserBadgeModule {}
