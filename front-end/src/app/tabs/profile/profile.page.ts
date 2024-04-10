import { Component, OnInit } from '@angular/core';
import { IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { BadgesService } from './badges/badges.service';

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

  constructor(private t: IDEATranslationsService, public _badges: BadgesService, public app: AppService) {}
  async ngOnInit(): Promise<void> {
    await this._badges.getList();
  }
  async ionViewDidEnter(): Promise<void> {
    this.userBadges = await this._badges.getListOfUserById(this.app.user.userId);
  }

  async sendFeedback(): Promise<void> {
    const emailSubject = encodeURIComponent(this.t._('PROFILE.FEEDBACK_EMAIL_SUBJECT'));
    const url = `mailto:${this.app.configurations.supportEmail}?subject=${emailSubject}`;
    await this.app.openURL(url);
  }
}
