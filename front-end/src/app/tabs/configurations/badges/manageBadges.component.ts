import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertController, IonicModule, ModalController } from '@ionic/angular';
import {
  IDEALoadingService,
  IDEAMessageService,
  IDEATranslationsModule,
  IDEATranslationsService
} from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { BadgesService } from './badges.service';
import { MediaService } from '@common/media.service';

import { Badge } from '@models/badge.model';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslationsModule],
  selector: 'app-manage-badges',
  template: `
    <ion-header>
      <ion-toolbar color="ideaToolbar">
        <ion-buttons slot="start">
          <ion-button [title]="'COMMON.CLOSE' | translate" (click)="close()">
            <ion-icon icon="close-circle-outline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ (badge.badgeId ? 'BADGES.MANAGE_BADGE' : 'BADGES.NEW_BADGE') | translate }}</ion-title>
        <ion-buttons slot="end">
          <ion-button [title]="'COMMON.SAVE' | translate" (click)="save()">
            <ion-icon icon="checkmark-circle-outline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list class="aList">
        <ion-item [class.fieldHasError]="hasFieldAnError('name')">
          <ion-label position="stacked">{{ 'BADGES.NAME' | translate }}</ion-label>
          <ion-input [(ngModel)]="badge.name" />
        </ion-item>
        <ion-item [class.fieldHasError]="hasFieldAnError('description')">
          <ion-label position="stacked">{{ 'BADGES.DESCRIPTION' | translate }}</ion-label>
          <ion-input [(ngModel)]="badge.description" />
        </ion-item>
        <ion-item [class.fieldHasError]="hasFieldAnError('imageURL')">
          <ion-label position="stacked">{{ 'BADGES.IMAGE_URL' | translate }}</ion-label>
          <ion-input [(ngModel)]="badge.imageURL" />
          <input #uploadImageInput type="file" accept="image/*" style="display: none" (change)="uploadImage($event)" />
          <ion-button slot="end" fill="clear" color="medium" class="ion-margin-top" (click)="uploadImageInput.click()">
            <ion-icon icon="cloud-upload-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-item>
        <p class="ion-text-right ion-padding-end ion-padding-top" *ngIf="badge.badgeId">
          <ion-button color="danger" (click)="deleteBadge()">
            {{ 'COMMON.DELETE' | translate }}
          </ion-button>
        </p>
      </ion-list>
    </ion-content>
  `
})
export class ManageBadgesComponent implements OnInit {
  /**
   * The badge to manage.
   */
  @Input() badge: Badge;

  errors = new Set<string>();

  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private _media: MediaService,
    public _badges: BadgesService,
    public app: AppService
  ) {}
  ngOnInit(): void {
    this.badge = new Badge(this.badge);
  }

  hasFieldAnError(field: string): boolean {
    return this.errors.has(field);
  }

  async save(): Promise<void> {
    this.errors = new Set(this.badge.validate());
    if (this.errors.size) return this.message.error('COMMON.FORM_HAS_ERROR_TO_CHECK');

    try {
      await this.loading.show();
      let result: Badge;
      if (!this.badge.badgeId) result = await this._badges.insert(this.badge);
      else result = await this._badges.update(this.badge);
      this.badge.load(result);
      this.modalCtrl.dismiss(true);
      this.message.success('COMMON.OPERATION_COMPLETED');
    } catch (err) {
      this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      this.loading.hide();
    }
  }

  async uploadImage({ target }): Promise<void> {
    const file = target.files[0];
    if (!file) return;

    try {
      await this.loading.show();
      const imageURI = await this._media.uploadImage(file);

      this.badge.imageURL = this.app.getImageURLByURI(imageURI);
    } catch (error) {
      this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      if (target) target.value = '';
      this.loading.hide();
    }
  }

  async deleteBadge(): Promise<void> {
    const doDelete = async (): Promise<void> => {
      try {
        await this.loading.show();
        await this._badges.delete(this.badge);
        this.message.success('COMMON.OPERATION_COMPLETED');
        this.modalCtrl.dismiss(true);
      } catch (error) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const subHeader = this.t._('COMMON.ACTION_IS_IRREVERSIBLE');
    const message = this.t._('BADGES.DELETE_BADGE_WARNING');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.DELETE'), role: 'destructive', handler: doDelete }
    ];
    const alert = await this.alertCtrl.create({ header, subHeader, message, buttons });
    alert.present();
  }

  close(): void {
    this.modalCtrl.dismiss();
  }
}
