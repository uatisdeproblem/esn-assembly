import { Component } from '@angular/core';
import { IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { BadgesService } from './badges/badges.service';

import { environment as env } from '@env';
import { UserBadge } from '@models/userBadge.model';

@Component({
  selector: 'profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss']
})
export class ProfilePage {
  version = env.idea.app.version;

  badges: UserBadge[];

  constructor(private t: IDEATranslationsService, public _badges: BadgesService, public app: AppService) {}
  async ionViewDidEnter(): Promise<void> {
    this.badges = await this._badges.getList({ force: true });
  }

  async sendFeedback(): Promise<void> {
    const emailSubject = encodeURIComponent(this.t._('PROFILE.FEEDBACK_EMAIL_SUBJECT'));
    const url = `mailto:${env.idea.app.supportEmail}?subject=${emailSubject}`;
    await this.app.openURL(url);
  }
}
