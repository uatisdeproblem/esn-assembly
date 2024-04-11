import { Component, OnInit, inject } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { IDEATranslationsService } from '@idea-ionic/common';

import { UserBadgeComponent } from '@tabs/configurations/badges/userBadge.component';

import { AppService } from '@app/app.service';
import { BadgesService } from '@tabs/configurations/badges/badges.service';

import { environment as env } from '@env';
import { UserBadge } from '@models/badge.model';

@Component({
  selector: 'profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss']
})
export class ProfilePage implements OnInit {
  version = env.idea.app.version;

  userBadges: UserBadge[];

  private _popover = inject(PopoverController);
  private _t = inject(IDEATranslationsService);
  _badges = inject(BadgesService);
  _app = inject(AppService);

  async ngOnInit(): Promise<void> {
    await this._badges.getList();
  }
  async ionViewDidEnter(): Promise<void> {
    this.userBadges = await this._badges.getListOfUserById(this._app.user.userId);
  }

  async sendFeedback(): Promise<void> {
    const emailSubject = encodeURIComponent(this._t._('PROFILE.FEEDBACK_EMAIL_SUBJECT'));
    const url = `mailto:${this._app.configurations.supportEmail}?subject=${emailSubject}`;
    await this._app.openURL(url);
  }

  async openUserBadgeDetails(userBadge: UserBadge): Promise<void> {
    const popover = await this._popover.create({
      component: UserBadgeComponent,
      componentProps: { userBadge },
      cssClass: 'badgePopover'
    });
    popover.present();
  }
}
