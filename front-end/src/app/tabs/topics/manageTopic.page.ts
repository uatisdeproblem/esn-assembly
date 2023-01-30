import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { AppService } from '@app/app.service';
import { TopicsService } from './topics.service';

import { Topic } from '@models/topic.model';
import { IDEALoadingService, IDEAMessageService, IDEATranslationsService } from '@idea-ionic/common';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'manage-topic',
  templateUrl: 'manageTopic.page.html',
  styleUrls: ['manageTopic.page.scss']
})
export class ManageTopicPage {
  topic: Topic;

  editMode = UXMode.VIEW;
  UXMode = UXMode;
  errors = new Set<string>();
  entityBeforeChange: Topic;

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private alertCtrl: AlertController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private _topics: TopicsService,
    public app: AppService
  ) {}
  async ionViewWillEnter(): Promise<void> {
    const topicId = this.route.snapshot.paramMap.get('topicId') ?? 'new';
    try {
      await this.loading.show();
      if (topicId !== 'new') {
        this.topic = await this._topics.getById(topicId);
        this.editMode = UXMode.VIEW;
      } else {
        this.topic = new Topic();
        this.editMode = UXMode.INSERT;
      }
    } catch (error) {
      this.message.error('COMMON.NOT_FOUND');
    } finally {
      this.loading.hide();
    }
  }

  async save(): Promise<void> {
    this.errors = new Set(this.topic.validate());
    if (this.errors.size) return this.message.error('COMMON.FORM_HAS_ERROR_TO_CHECK');

    try {
      await this.loading.show();
      let result: Topic;
      if (this.editMode === UXMode.INSERT) result = await this._topics.insert(this.topic);
      else result = await this._topics.update(this.topic);
      this.topic.load(result);
      this.location.replaceState(this.location.path().replace('/new', '/'.concat(this.topic.topicId)));
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

  async archive(): Promise<void> {
    const doDelete = async (): Promise<void> => {
      try {
        await this.loading.show();
        await this._topics.archive(this.topic);
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
      { text: this.t._('COMMON.ARCHIVE'), role: 'destructive', handler: doDelete }
    ];
    const alert = await this.alertCtrl.create({ header, buttons });
    alert.present();
  }

  enterEditMode(): void {
    this.entityBeforeChange = new Topic(this.topic);
    this.editMode = UXMode.EDIT;
  }
  exitEditMode(): void {
    if (this.editMode === UXMode.INSERT) this.app.closePage();
    else {
      this.topic = this.entityBeforeChange;
      this.errors = new Set<string>();
      this.editMode = UXMode.VIEW;
    }
  }
}

export enum UXMode {
  VIEW,
  INSERT,
  EDIT
}
