import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, PopoverController } from '@ionic/angular';
import { IDEATranslationsModule, IDEATranslationsService } from '@idea-ionic/common';

import { DateTimezonePipe } from '@common/dateTimezone.pipe';

import { AppService } from '@app/app.service';
import { BadgesService } from './badges.service';

import { Badge, UserBadge } from '@models/badge.model';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, IDEATranslationsModule, DateTimezonePipe],
  selector: 'app-user-badge',
  template: `
    <ion-card color="white" *ngIf="badge && userBadge">
      <ion-card-header>
        <ion-card-subtitle *ngIf="!userBadge.firstSeenAt">
          <ion-item color="primary">
            <ion-label class="ion-text-wrap ion-text-center">{{ 'BADGES.YOU_EARNED_A_BADGE' | translate }}</ion-label>
          </ion-item>
        </ion-card-subtitle>
        <ion-card-title class="ion-text-center">{{ badge.name }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p class="ion-text-center">{{ badge.description }}</p>
        <ion-img
          [src]="_badges.getImageURLOfUserBadge(userBadge)"
          (ionError)="_badges.fallbackBadgeImage($event?.target)"
        />
        <p class="ion-text-center ion-padding-bottom">
          <ion-badge color="light">
            {{ 'BADGES.BADGE_EARNED' | translate }}: {{ userBadge.earnedAt | dateTz }}
          </ion-badge>
        </p>
        <p class="ion-text-center">
          <ion-button fill="clear" color="medium" (click)="close()">
            {{ 'COMMON.CLOSE' | translate }}
          </ion-button>
        </p>
      </ion-card-content>
    </ion-card>
  `,
  styles: [
    `
      ion-card-subtitle {
        margin-top: 15px;
        margin-bottom: 30px;
      }
      ion-card-subtitle ion-item {
        border-radius: 4px;
      }
      ion-card-subtitle ion-item ion-label {
        font-weight: 500;
      }
      ion-card-title {
        margin-top: 15px;
        font-size: 1.8em;
      }
      ion-img {
        margin: 30px auto;
        height: 220px;
        width: 220px;
      }
    `
  ]
})
export class UserBadgeComponent implements OnInit {
  /**
   * The user's badge to show.
   */
  @Input() userBadge: UserBadge;

  badge: Badge;

  private _popover = inject(PopoverController);
  private _t = inject(IDEATranslationsService);
  _badges = inject(BadgesService);
  _app = inject(AppService);

  async ngOnInit(): Promise<void> {
    await this._badges.markUserBadgeAsSeen(this.userBadge.badge);
    this.badge = Badge.isBuiltIn(this.userBadge.badge)
      ? new Badge({
          badgeId: this.userBadge.badge,
          name: this._t._('BADGES.BUILT_IN_BADGES.'.concat(this.userBadge.badge)),
          description: this._t._('BADGES.BUILT_IN_BADGES_I.'.concat(this.userBadge.badge))
        })
      : this._badges.getDetailOfUserBadge(this.userBadge);
    if (!this.badge) this.badge = new Badge({ badgeId: 'NOT_FOUND', name: this._t._('COMMON.NOT_FOUND') });
  }

  close(): void {
    this._popover.dismiss();
  }
}
