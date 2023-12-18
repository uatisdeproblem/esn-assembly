import { Component, Input, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';

import { AppService } from '@app/app.service';
import { BadgesService } from './badges.service';

import { UserBadge } from '@models/userBadge.model';

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

  constructor(private popoverCtrl: PopoverController, public _badges: BadgesService, public app: AppService) {}
  async ngOnInit(): Promise<void> {
    await this._badges.getById(this.userBadge.badge);
  }

  close(): void {
    this.popoverCtrl.dismiss();
  }
}
