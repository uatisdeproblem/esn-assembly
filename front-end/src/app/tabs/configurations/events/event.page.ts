import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { AppService } from '@app/app.service';
import { GAEventsService } from './events.service';

import { GAEvent } from '@models/event.model';
import { IDEALoadingService, IDEAMessageService, IDEATranslationsService } from '@idea-ionic/common';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'event',
  templateUrl: 'event.page.html',
  styleUrls: ['event.page.scss']
})
export class EventPage {
  event: GAEvent;

  editMode = UXMode.VIEW;
  UXMode = UXMode;
  errors = new Set<string>();
  entityBeforeChange: GAEvent;

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private alertCtrl: AlertController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private _events: GAEventsService,
    public app: AppService
  ) {}
  async ionViewWillEnter(): Promise<void> {
    const eventId = this.route.snapshot.paramMap.get('eventId') ?? 'new';
    try {
      await this.loading.show();
      if (eventId !== 'new') {
        this.event = await this._events.getById(eventId);
        this.editMode = UXMode.VIEW;
      } else {
        this.event = new GAEvent();
        this.editMode = UXMode.INSERT;
      }
    } catch (error) {
      this.message.error('COMMON.NOT_FOUND');
    } finally {
      this.loading.hide();
    }
  }

  async save(): Promise<void> {
    this.errors = new Set(this.event.validate());
    if (this.errors.size) return this.message.error('COMMON.FORM_HAS_ERROR_TO_CHECK');

    try {
      await this.loading.show();
      let result: GAEvent;
      if (this.editMode === UXMode.INSERT) result = await this._events.insert(this.event);
      else result = await this._events.update(this.event);
      this.event.load(result);
      this.location.replaceState(this.location.path().replace('/new', '/'.concat(this.event.eventId)));
      this.editMode = UXMode.VIEW;
      this.message.success('COMMON.OPERATION_COMPLETED');
    } catch (err) {
      this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      this.loading.hide();
    }
  }
  hasFieldAnError(field: string): boolean {
    return this.errors.has(field);
  }

  async archiveEvent(archive = true): Promise<void> {
    const doArchive = async (): Promise<void> => {
      try {
        await this.loading.show();
        if (archive) await this._events.archive(this.event);
        else await this._events.unarchive(this.event);
        this.message.success('COMMON.OPERATION_COMPLETED');
        this.app.closePage();
      } catch (error) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.CONFIRM'), role: 'destructive', handler: doArchive }
    ];
    const alert = await this.alertCtrl.create({ header, buttons });
    alert.present();
  }
  async deleteEvent(): Promise<void> {
    const doDelete = async (): Promise<void> => {
      try {
        await this.loading.show();
        await this._events.delete(this.event);
        this.message.success('COMMON.OPERATION_COMPLETED');
        this.app.closePage();
      } catch (error) {
        if (error.message === 'Event is used') this.message.error('EVENTS.CANT_DELETE_IF_USED_ERROR');
        else this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const subHeader = this.t._('COMMON.ACTION_IS_IRREVERSIBLE');
    const message = this.t._('EVENTS.CANT_DELETE_IF_USED_WARNING');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.DELETE'), role: 'destructive', handler: doDelete }
    ];
    const alert = await this.alertCtrl.create({ header, subHeader, message, buttons });
    alert.present();
  }

  enterEditMode(): void {
    this.entityBeforeChange = new GAEvent(this.event);
    this.editMode = UXMode.EDIT;
  }
  exitEditMode(): void {
    if (this.editMode === UXMode.INSERT) this.app.closePage();
    else {
      this.event = this.entityBeforeChange;
      this.errors = new Set<string>();
      this.editMode = UXMode.VIEW;
    }
  }

  async downloadSummarySpreadsheet(): Promise<void> {
    try {
      await this.loading.show();
      const url = await this._events.downloadSummarySpreadsheet(this.event);
      this.app.openURL(url);
    } catch (error) {
      this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      this.loading.hide();
    }
  }
}

export enum UXMode {
  VIEW,
  INSERT,
  EDIT
}
