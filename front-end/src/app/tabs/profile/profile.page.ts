import { Component } from '@angular/core';
import { Browser } from '@capacitor/browser';

import { AppService } from '@app/app.service';

@Component({
  selector: 'profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss']
})
export class ProfilePage {
  constructor(public app: AppService) {}

  async openGalaxyAccount(): Promise<void> {
    const url = 'https://accounts.esn.org/user/'.concat(this.app.user.userId);
    await Browser.open({ url });
  }
}
