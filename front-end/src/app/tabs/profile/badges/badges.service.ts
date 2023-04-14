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
  private async loadList(userId?: string): Promise<void> {
    const params: any = {};
    if (userId) params.userId = userId;
    const badges: UserBadge[] = await this.api.getResource('badges', { params });
    this.badges = badges.map(x => new UserBadge(x));
  }
  /**
   * Get the list of the user's badges.
   * Note: it's a slice of the array.
   */
  async getList(options: { userId?: string; force?: boolean } = {}): Promise<UserBadge[]> {
    if (!this.badges || options.force || options.userId) await this.loadList(options.userId);
    if (!this.badges) return null;
    return this.badges.slice();
  }

  /**
   * Get a badge by its id.
   */
  async getById(badge: string): Promise<UserBadge> {
    return new UserBadge(await this.api.getResource(['badges', badge]));
  }

  /**
   * Remove a badge from a user.
   */
  async removeBadgeFromUser(userId: string, badge: string): Promise<void> {
    const params = { userId };
    await this.api.deleteResource(['badges', badge], { params });
  }
  /**
   * Add a badge to a user.
   */
  async addBadgeToUser(userId: string, badge: string): Promise<void> {
    const params = { userId };
    await this.api.postResource(['badges', badge], { params });
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
