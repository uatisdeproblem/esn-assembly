import { Component } from '@angular/core';

import { AppService } from '@app/app.service';

import { environment as env } from '@env';

@Component({
  selector: 'profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss']
})
export class ProfilePage {
  version = env.idea.app.version;

  constructor(public app: AppService) {}

  async openGalaxyAccount(): Promise<void> {
    const url = 'https://accounts.esn.org/user/'.concat(this.app.user.userId);
    await this.app.openURL(url);
  }
}
