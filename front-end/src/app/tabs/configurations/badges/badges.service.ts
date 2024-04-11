import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';

import { Badge, UserBadge } from '@models/badge.model';

@Injectable({ providedIn: 'root' })
export class BadgesService {
  private badges: Badge[];

  /**
   * The number of badges to consider for the pagination, when active.
   */
  MAX_PAGE_SIZE = 24;

  constructor(private api: IDEAApiService, private app: AppService) {}

  //
  // BADGES
  //

  /**
   * Load the list of badges from the back-end.
   */
  private async loadList(): Promise<void> {
    const badges: UserBadge[] = await this.api.getResource('badges');
    this.badges = badges.map(b => new Badge(b));
  }
  /**
   * Get the list of badges.
   * Note: it's a slice of the array.
   */
  async getList(
    options: {
      force?: boolean;
      search?: string;
      withPagination?: boolean;
      startPaginationAfterId?: string;
    } = {}
  ): Promise<Badge[]> {
    if (!this.badges || options.force) await this.loadList();
    if (!this.badges) return null;

    options.search = options.search ? String(options.search).toLowerCase() : '';

    let filteredList = this.badges.slice();

    if (options.search)
      filteredList = filteredList.filter(x =>
        options.search
          .split(' ')
          .every(searchTerm => [x.name, x.description].filter(f => f).some(f => f.toLowerCase().includes(searchTerm)))
      );

    if (options.withPagination && filteredList.length > this.MAX_PAGE_SIZE) {
      let indexOfLastOfPreviousPage = 0;
      if (options.startPaginationAfterId)
        indexOfLastOfPreviousPage = filteredList.findIndex(x => x.badgeId === options.startPaginationAfterId) || 0;
      filteredList = filteredList.slice(0, indexOfLastOfPreviousPage + this.MAX_PAGE_SIZE);
    }

    return filteredList;
  }
  /**
   * Get a badge by its id.
   */
  async getById(badge: string): Promise<Badge> {
    return new Badge(await this.api.getResource(['badges', badge]));
  }
  /**
   * Add a badge.
   */
  async add(badge: Badge): Promise<Badge> {
    return new Badge(await this.api.postResource(['badges'], { body: badge }));
  }
  /**
   * Edit a badge.
   */
  async update(badge: Badge): Promise<Badge> {
    return new Badge(await this.api.putResource(['badges', badge.badgeId], { body: badge }));
  }
  /**
   * Delete a badge.
   */
  async delete(badge: Badge): Promise<void> {
    await this.api.deleteResource(['badges', badge.badgeId]);
  }

  //
  // USERS BADGES
  //

  /**
   * Get the list of the user's badges.
   */
  async getListOfUserById(userId: string): Promise<UserBadge[]> {
    const params = { userId };
    const badges: UserBadge[] = await this.api.getResource('usersBadges', { params });
    return badges.map(x => new UserBadge(x));
  }
  /**
   * Get a user badge by its id and mark it as seen.
   */
  async markUserBadgeAsSeen(badge: string): Promise<UserBadge> {
    return new UserBadge(await this.api.getResource(['usersBadges', badge]));
  }
  /**
   * Remove a badge from a user.
   */
  async removeBadgeFromUser(userId: string, badge: string): Promise<void> {
    const params = { userId };
    await this.api.deleteResource(['usersBadges', badge], { params });
  }
  /**
   * Add a badge to a user.
   */
  async addBadgeToUser(userId: string, badge: string): Promise<void> {
    const params = { userId };
    await this.api.postResource(['usersBadges', badge], { params });
  }

  //
  // UI
  //

  /**
   * Get the detail of a badge from a user badge.
   */
  getDetailOfUserBadge(userBadge: UserBadge): Badge | null {
    return this.badges?.find(x => x.badgeId === userBadge.badge) ?? null;
  }
  /**
   * Get the image of a user badge.
   */
  getImageURLOfUserBadge(userBadge: UserBadge): string | null {
    if (Badge.isBuiltIn(userBadge.badge)) return 'assets/imgs/badges/' + userBadge.badge + '.svg';
    const badge = this.getDetailOfUserBadge(userBadge);
    return badge ? this.app.getImageURLByURI(badge.imageURI) : null;
  }
}
