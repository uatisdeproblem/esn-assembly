import { Component } from '@angular/core';
import { IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';

import { environment as env } from '@env';

@Component({
  selector: 'profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss']
})
export class ProfilePage {
  version = env.idea.app.version;

  constructor(private t: IDEATranslationsService, public app: AppService) {}

  async openGalaxyAccount(): Promise<void> {
    const url = 'https://accounts.esn.org/user/'.concat(this.app.user.userId);
    await this.app.openURL(url);
  }

  async sendFeedback(): Promise<void> {
    const emailSubject = encodeURIComponent(this.t._('PROFILE.FEEDBACK_EMAIL_SUBJECT'));
    const url = `mailto:${env.idea.app.supportEmail}?subject=${emailSubject}`;
    await this.app.openURL(url);
  }
}
