import { Component, Input } from '@angular/core';
import { Location } from '@angular/common';
import { AlertController } from '@ionic/angular';
import { Check } from 'idea-toolbox';
import { IDEALoadingService, IDEAMessageService, IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { TopicsService } from './topics.service';
import { MediaService } from '@app/common/media.service';

import { Topic, TopicTypes } from '@models/topic.model';
import { Subject, SubjectTypes } from '@models/subject.model';
import { UserRoles } from '@models/user.model';

@Component({
  selector: 'manage-topic',
  templateUrl: 'manageTopic.page.html',
  styleUrls: ['manageTopic.page.scss']
})
export class ManageTopicPage {
  @Input() topicId = 'new-standard';
  topic: Topic;

  editMode = UXMode.VIEW;
  UXMode = UXMode;
  errors = new Set<string>();
  entityBeforeChange: Topic;

  hasDeadlineForQuestions = false;
  hasDeadlineForAnswers = false;

  TopicTypes = TopicTypes;
  SubjectTypes = SubjectTypes;

  activeTopics: Topic[];
  relatedTopics: Topic[];
  relatedTopicsChecks: Check[];

  rolesAbleToInteractChecks: Check[];

  publishingOption = PublishingOptions.DRAFT;
  PublishingOptions = PublishingOptions;

  constructor(
    private location: Location,
    private alertCtrl: AlertController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private _topics: TopicsService,
    private _media: MediaService,
    public app: AppService
  ) {}
  async ionViewWillEnter(): Promise<void> {
    if (!this.app.user.isAdministrator) return this.app.closePage('COMMON.UNAUTHORIZED');

    try {
      await this.loading.show();

      this.activeTopics = await this._topics.getActiveList();

      this.rolesAbleToInteractChecks = Object.entries(UserRoles).map(
        role => new Check({ value: role[0], name: this.t._('USER_ROLES.'.concat(role[1])) })
      );

      if (this.topicId !== 'new-standard' && this.topicId !== 'new-live') {
        this.topic = await this._topics.getById(this.topicId);
        this.setUIHelpersForComplexFields();
        this.relatedTopics = await this._topics.getRelated(this.topic);
        this.relatedTopicsChecks = this.activeTopics
          .filter(x => x.topicId !== this.topic.topicId)
          .map(
            x =>
              new Check({
                value: x.topicId,
                name: x.name,
                checked: this.relatedTopics.some(y => x.topicId === y.topicId),
                category1: x.type
              })
          );
        this.rolesAbleToInteractChecks.forEach(
          c => (c.checked = this.topic.rolesAbleToInteract.includes(c.value as UserRoles))
        );
        this.editMode = UXMode.VIEW;
      } else {
        this.topic = new Topic({
          type: this.topicId === 'new-live' ? TopicTypes.LIVE : TopicTypes.STANDARD
        });
        if (this.topicId === 'new-live') this.topic.closedAt = new Date().toISOString();
        this.relatedTopics = [];
        this.relatedTopicsChecks = this.activeTopics.map(
          x => new Check({ value: x.topicId, name: x.name, category1: x.type })
        );
        this.editMode = UXMode.INSERT;
      }
    } catch (error) {
      this.message.error('COMMON.NOT_FOUND');
    } finally {
      this.loading.hide();
    }
  }

  handleChangeOfPublishingOption(): void {
    if (this.publishingOption === PublishingOptions.DRAFT) delete this.topic.publishedSince;
    if (this.publishingOption === PublishingOptions.PUBLISH) this.topic.publishedSince = new Date().toISOString();
  }

  shouldResetDeadlineForQuestions(): void {
    if (!this.hasDeadlineForQuestions) this.topic.willCloseAt = null;
  }
  shouldResetDeadlineForAnswers(): void {
    if (!this.hasDeadlineForAnswers) this.topic.acceptAnswersUntil = null;
  }

  addSubject(): void {
    this.topic.subjects.push(new Subject({ type: SubjectTypes.USER }));
  }
  removeSubject(subject: Subject): void {
    this.topic.subjects.splice(this.topic.subjects.indexOf(subject), 1);
  }
  addFirstSubjectWithUserData(): void {
    if (this.topic.subjects.length) return;
    this.topic.subjects.push(Subject.fromUser(this.app.user));
  }

  setRolesAbleToInteractFromChecks(): void {
    if (this.rolesAbleToInteractChecks.every(x => x.checked)) this.topic.rolesAbleToInteract = [];
    else
      this.topic.rolesAbleToInteract = this.rolesAbleToInteractChecks
        .filter(x => x.checked)
        .map(x => x.value as UserRoles);
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
      this.location.replaceState(
        this.location
          .path()
          .replace('/new-standard', '/'.concat(this.topic.topicId))
          .replace('/new-live', '/'.concat(this.topic.topicId))
      );
      await this.handleChangesInRelated();
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
  private async handleChangesInRelated(): Promise<void> {
    const checkedTopics = this.relatedTopicsChecks.filter(x => x.checked).map(x => String(x.value));
    const toRemove = this.relatedTopics.filter(x => !checkedTopics.includes(x.topicId)).map(x => x.topicId);
    const toAdd = checkedTopics.filter(x => !this.relatedTopics.some(y => y.topicId === x));

    for (const topicId of toRemove) {
      try {
        await this._topics.unlinkByIds(this.topic.topicId, topicId);
      } catch (error) {
        // no problem
      }
    }

    for (const topicId of toAdd) {
      try {
        await this._topics.linkByIds(this.topic.topicId, topicId);
      } catch (error) {
        // no problem
      }
    }

    this.relatedTopics = this.activeTopics.filter(x => checkedTopics.includes(x.topicId));
  }

  async manageTopicStatus(open: boolean): Promise<void> {
    const doStatusChange = async (): Promise<void> => {
      try {
        await this.loading.show();
        if (open) await this._topics.open(this.topic);
        else await this._topics.close(this.topic);
        this.message.success('COMMON.OPERATION_COMPLETED');
        this.app.goToInTabs(['topics', this.topic.topicId, this.topic.type === TopicTypes.LIVE ? 'live' : 'standard'], {
          back: true
        });
      } catch (error) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.CONFIRM'), role: 'destructive', handler: doStatusChange }
    ];
    const alert = await this.alertCtrl.create({ header, buttons });
    alert.present();
  }
  async archiveTopic(archive = true): Promise<void> {
    const doArchive = async (): Promise<void> => {
      try {
        await this.loading.show();
        if (archive) await this._topics.archive(this.topic);
        else await this._topics.unarchive(this.topic);
        this.message.success('COMMON.OPERATION_COMPLETED');
        this.app.goToInTabs(['topics', this.topic.topicId, this.topic.type === TopicTypes.LIVE ? 'live' : 'standard'], {
          back: true
        });
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
  async deleteTopic(): Promise<void> {
    const doDelete = async (): Promise<void> => {
      try {
        await this.loading.show();
        await this._topics.delete(this.topic);
        this.message.success('COMMON.OPERATION_COMPLETED');
        this.app.goToInTabs(['topics'], { back: true });
      } catch (error) {
        if (error.message === 'Unlink related topics first') this.message.error('TOPICS.CANT_DELETE_IF_LINKED_ERROR');
        else this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const message = this.t._('COMMON.ACTION_IS_IRREVERSIBLE');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.DELETE'), role: 'destructive', handler: doDelete }
    ];
    const alert = await this.alertCtrl.create({ header, message, buttons });
    alert.present();
  }
  async duplicateTopic(): Promise<void> {
    const doDuplicate = async (): Promise<void> => {
      try {
        await this.loading.show();
        const copy = new Topic(this.topic);
        copy.name = `${copy.name} - ${this.t._('COMMON.COPY')}`;
        delete copy.publishedSince;
        delete copy.willCloseAt;
        delete copy.closedAt;
        delete copy.archivedAt;
        copy.load(await this._topics.insert(copy));
        this.message.success('COMMON.OPERATION_COMPLETED');
        this.app.goToInTabs(['topics', copy.topicId, 'manage'], { root: true });
      } catch (error) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.DUPLICATE'), handler: doDuplicate }
    ];
    const alert = await this.alertCtrl.create({ header, buttons });
    alert.present();
  }

  enterEditMode(): void {
    this.entityBeforeChange = new Topic(this.topic);
    this.editMode = UXMode.EDIT;
  }
  exitEditMode(): void {
    if (this.editMode === UXMode.INSERT) this.app.goToInTabs(['topics'], { back: true });
    else {
      this.topic = this.entityBeforeChange;
      this.errors = new Set<string>();
      this.editMode = UXMode.VIEW;
      this.setUIHelpersForComplexFields();
    }
  }
  private setUIHelpersForComplexFields(): void {
    this.hasDeadlineForQuestions = !!this.topic.willCloseAt;
    this.hasDeadlineForAnswers = !!this.topic.acceptAnswersUntil;
    if (this.topic.publishedSince) {
      if (this.topic.publishedSince > new Date().toISOString()) this.publishingOption = PublishingOptions.SCHEDULE;
      else this.publishingOption = PublishingOptions.PUBLISH;
    } else this.publishingOption = PublishingOptions.DRAFT;
  }

  browseImagesForElementId(elementId: string): void {
    document.getElementById(elementId).click();
  }
  async uploadImageForSubject(subject: Subject, { target }): Promise<void> {
    const file = target.files[0];
    if (!file) return;

    try {
      await this.loading.show();
      const imageURI = await this._media.uploadImage(file);
      subject.avatarURL = this.app.getImageURLByURI(imageURI);
    } catch (error) {
      this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      if (target) target.value = '';
      this.loading.hide();
    }
  }

  getTitle(): string {
    const str = this.t._('TOPICS.MANAGE_TOPIC');
    if (this.topic?.type) return `${str} (${this.t._('TOPICS.TYPES.'.concat(this.topic.type)).toLowerCase()})`;
    else return str;
  }
}

export enum UXMode {
  VIEW,
  INSERT,
  EDIT
}

export enum PublishingOptions {
  DRAFT = 'DRAFT',
  PUBLISH = 'PUBLISH',
  SCHEDULE = 'SCHEDULE'
}
