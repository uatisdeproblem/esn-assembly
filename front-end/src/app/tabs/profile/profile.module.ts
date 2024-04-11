import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { ProfileRoutingModule } from './profile.routing.module';
import { ProfilePage } from './profile.page';

import { UserBadgeComponent } from '@tabs/configurations/badges/userBadge.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslationsModule, ProfileRoutingModule, UserBadgeComponent],
  declarations: [ProfilePage]
})
export class ProfileModule {}
