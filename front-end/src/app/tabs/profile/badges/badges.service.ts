import { Injectable } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { IDEAApiService } from '@idea-ionic/common';

import { UserBadgeComponent } from './userBadge.component';

import { UserBadge } from '@models/userBadge.model';

@Injectable({ providedIn: 'root' })
export class BadgesService {
  private badges: UserBadge[];

  constructor(private popoverCtrl: PopoverController, private api: IDEAApiService) {}

  /**
   * Load the user's badges from the back-end.
   */
  private async loadList(): Promise<void> {
    const badges: UserBadge[] = await this.api.getResource('badges');
    this.badges = badges.map(x => new UserBadge(x));
  }
  /**
   * Get the list of the user's badges.
   * Note: it's a slice of the array.
   */
  async getList(options: { force?: boolean } = {}): Promise<UserBadge[]> {
    if (!this.badges || options.force) await this.loadList();
    if (!this.badges) return null;
    return this.badges.slice();
  }

  /**
   * Get a badge by its id.
   */
  async getById(badge: string): Promise<UserBadge> {
    return new UserBadge(await this.api.getResource(['badges', badge]));
  }

  //
  // UI
  //

  getBadgeImage(userBadge: UserBadge): string {
    return 'assets/imgs/badges/' + userBadge.badge + '.svg';
  }
  async openBadgeDetails(userBadge: UserBadge): Promise<void> {
    const popover = await this.popoverCtrl.create({
      component: UserBadgeComponent,
      componentProps: { userBadge },
      cssClass: 'largePopover'
    });
    popover.present();
  }
}
