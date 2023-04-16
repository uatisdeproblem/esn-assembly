import { Component, Input, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';

import { BadgesService } from './badges.service';

import { UserBadge } from '@models/userBadge.model';
import { FAVORITE_TIMEZONE } from '@models/favoriteTimezone.const';

@Component({
  selector: 'user-badge',
  templateUrl: 'userBadge.component.html',
  styleUrls: ['userBadge.component.scss']
})
export class UserBadgeComponent implements OnInit {
  /**
   * The user's badge to show.
   */
  @Input() userBadge: UserBadge;

  FAVORITE_TIMEZONE = FAVORITE_TIMEZONE;

  constructor(private popoverCtrl: PopoverController, public _badges: BadgesService) {}
  async ngOnInit(): Promise<void> {
    await this._badges.getById(this.userBadge.badge);
  }

  close(): void {
    this.popoverCtrl.dismiss();
  }
}
