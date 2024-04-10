import { Component, Input, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';

import { AppService } from '@app/app.service';
import { BadgesService } from './badges.service';

import { Badge, UserBadge } from '@models/badge.model';

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

  badge: Badge;

  constructor(private popoverCtrl: PopoverController, public _badges: BadgesService, public app: AppService) {}
  async ngOnInit(): Promise<void> {
    await this._badges.getUserBadgeById(this.userBadge.badge);
    this.badge = this._badges.getBadgeDetail(this.userBadge);
  }

  close(): void {
    this.popoverCtrl.dismiss();
  }
}
