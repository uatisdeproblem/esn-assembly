import { Component, OnInit } from '@angular/core';
import { AlertController, IonicModule, ModalController, PopoverController } from '@ionic/angular';
import { Suggestion } from 'idea-toolbox';
import {
  IDEALoadingService,
  IDEAMessageService,
  IDEASuggestionsComponent,
  IDEATranslationsModule,
  IDEATranslationsService
} from '@idea-ionic/common';

import { UserBadgeComponent } from './userBadge.component';

import { AppService } from '@app/app.service';
import { BadgesService } from './badges.service';

import { Badge, BuiltInBadges, UserBadge } from '@models/badge.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslationsModule],
  selector: 'app-give-badges',
  template: `
    <ion-header>
      <ion-toolbar color="ideaToolbar">
        <ion-buttons slot="start">
          <ion-button [title]="'COMMON.CLOSE' | translate" (click)="close()">
            <ion-icon icon="close-circle-outline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ 'BADGES.GIVE_A_BADGE' | translate }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list class="aList">
        <ion-item>
          <ion-label position="stacked">{{ 'CONFIGURATIONS.USER_ID' | translate }}</ion-label>
          <ion-input [(ngModel)]="userId" [readonly]="!!usersBadges" />
          <ion-button
            slot="end"
            class="ion-margin-top"
            *ngIf="!usersBadges"
            [disabled]="!userId"
            (click)="getUserBadges(userId)"
          >
            <ion-icon icon="search" slot="icon-only" />
          </ion-button>
          <ion-button
            slot="end"
            class="ion-margin-top"
            fill="clear"
            color="medium"
            *ngIf="usersBadges"
            (click)="usersBadges = null"
          >
            <ion-icon icon="arrow-undo" slot="icon-only" />
          </ion-button>
          <ion-button
            slot="end"
            class="ion-margin-top"
            fill="clear"
            *ngIf="usersBadges"
            (click)="app.openUserProfileById(userId)"
          >
            <ion-icon slot="icon-only" icon="open-outline" />
          </ion-button>
        </ion-item>
        <ion-grid class="ion-margin-top badgesGrid" *ngIf="usersBadges">
          <ion-row class="ion-justify-content-center ion-align-items-center">
            <ion-col class="ion-text-center" *ngFor="let userBadge of usersBadges">
              <ion-img [src]="_badges.getImageURLOfUserBadge(userBadge)" (click)="openUserBadgeDetails(userBadge)" />
              <ion-button fill="clear" color="danger" (click)="removeBadgeFromUser(userId, userBadge)">
                <ion-icon slot="icon-only" icon="trash" />
              </ion-button>
            </ion-col>
            <ion-col class="ion-text-center">
              <ion-button shape="round" (click)="addBadgeToUser(userId)">
                <ion-icon slot="icon-only" icon="add" />
              </ion-button>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-list>
    </ion-content>
  `,
  styles: [
    `
      ion-grid.badgesGrid {
        ion-img {
          margin: 0 auto;
          width: 100px;
          height: 100px;
        }
      }
    `
  ]
})
export class GiveBadgesComponent implements OnInit {
  userId: string;
  usersBadges: UserBadge[];
  badges: Badge[];

  constructor(
    private popoverCtrl: PopoverController,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    public _badges: BadgesService,
    public app: AppService
  ) {}
  async ngOnInit(): Promise<void> {
    this.badges = await this._badges.getList();
  }

  async getUserBadges(userId: string): Promise<void> {
    if (!userId) return;
    userId = userId.toLowerCase();
    this.usersBadges = null;
    try {
      await this.loading.show();
      this.usersBadges = await this._badges.getListOfUserById(userId);
    } catch (error) {
      this.message.error('COMMON.SOMETHING_WENT_WRONG');
    } finally {
      this.loading.hide();
    }
  }

  async removeBadgeFromUser(userId: string, userBadge: UserBadge): Promise<void> {
    userId = userId.toLowerCase();
    const doRemove = async (): Promise<void> => {
      try {
        await this.loading.show();
        await this._badges.removeBadgeFromUser(userId, userBadge.badge);
        this.usersBadges.splice(this.usersBadges.indexOf(userBadge), 1);
        this.message.success('COMMON.OPERATION_COMPLETED');
      } catch (error) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };

    const header = this.t._('COMMON.ARE_YOU_SURE');
    const buttons = [{ text: this.t._('COMMON.CANCEL') }, { text: this.t._('COMMON.CONFIRM'), handler: doRemove }];
    const alert = await this.alertCtrl.create({ header, buttons });
    await alert.present();
  }

  async addBadgeToUser(userId: string): Promise<void> {
    userId = userId.toLowerCase();

    const builtInBadges = Object.keys(BuiltInBadges).map(
      badge =>
        new Badge({
          badgeId: badge,
          name: this.t._('BADGES.BUILT_IN_BADGES.'.concat(badge)),
          description: this.t._('BADGES.BUILT_IN_BADGES_I.'.concat(badge))
        })
    );

    const doAdd = async (badge: string): Promise<void> => {
      try {
        await this.loading.show();
        await this._badges.addBadgeToUser(userId, badge);
        this.usersBadges.unshift(new UserBadge({ userId, badge }));
        this.message.success('COMMON.OPERATION_COMPLETED');
      } catch (error) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };

    const data = [...builtInBadges, ...this.badges].map(
      badge =>
        new Suggestion({
          value: badge.badgeId,
          name: badge.name,
          description: badge.description,
          category1: Badge.isBuiltIn(badge.badgeId)
            ? this.t._('BADGES.BUILT_IN_BADGE')
            : this.t._('BADGES.CUSTOM_BADGE')
        })
    );

    const componentProps = {
      data,
      sortData: true,
      searchPlaceholder: this.t._('BADGES.GIVE_A_BADGE'),
      hideIdFromUI: true,
      hideClearButton: true
    };
    const modal = await this.modalCtrl.create({ component: IDEASuggestionsComponent, componentProps });
    modal.onDidDismiss().then(({ data }): void => {
      if (data?.value) doAdd(data.value);
    });
    modal.present();
  }

  async openUserBadgeDetails(userBadge: UserBadge): Promise<void> {
    const popover = await this.popoverCtrl.create({
      component: UserBadgeComponent,
      componentProps: { userBadge },
      cssClass: 'badgePopover'
    });
    popover.present();
  }

  close(): void {
    this.modalCtrl.dismiss();
  }
}
