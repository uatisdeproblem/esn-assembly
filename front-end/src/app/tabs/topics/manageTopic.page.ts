import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { Check } from 'idea-toolbox';
import { IDEALoadingService, IDEAMessageService, IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { TopicsService } from './topics.service';
import { TopicCategoryService } from '../configurations/categories/categories.service';
import { GAEventsService } from '../configurations/events/events.service';
import { MediaService } from '@app/common/media.service';

import { Topic } from '@models/topic.model';
import { TopicCategory, TopicCategoryAttached } from '@models/category.model';
import { GAEvent, GAEventAttached } from '@models/event.model';
import { Subject, SubjectTypes } from '@models/subject.model';
import { UserRoles } from '@models/user.model';
import { dateStringIsFuture, FAVORITE_TIMEZONE } from '@models/favoriteTimezone.const';

@Component({
  selector: 'manage-topic',
  templateUrl: 'manageTopic.page.html',
  styleUrls: ['manageTopic.page.scss']
})
export class ManageTopicPage implements OnInit {
  topic: Topic;

  editMode = UXMode.VIEW;
  UXMode = UXMode;
  errors = new Set<string>();
  entityBeforeChange: Topic;

  categories: TopicCategory[];
  events: GAEvent[];

  hasDeadlineForQuestions = false;
  hasDeadlineForAnswers = false;
  FAVORITE_TIMEZONE = FAVORITE_TIMEZONE;

  SubjectTypes = SubjectTypes;

  activeTopics: Topic[];
  relatedTopics: Topic[];
  relatedTopicsChecks: Check[];

  rolesAbleToAskQuestionsChecks: Check[];

  publishingOption = PublishingOptions.DRAFT;
  PublishingOptions = PublishingOptions;

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private alertCtrl: AlertController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private _topics: TopicsService,
    private _categories: TopicCategoryService,
    private _events: GAEventsService,
    private _media: MediaService,
    public app: AppService
  ) {}
  async ngOnInit(): Promise<void> {
    if (!this.app.user.isAdministrator) return this.app.closePage('COMMON.UNAUTHORIZED');

    [this.categories, this.events, this.activeTopics] = await Promise.all([
      this._categories.getList(),
      this._events.getList(),
      this._topics.getActiveList()
    ]);
    this.rolesAbleToAskQuestionsChecks = Object.entries(UserRoles).map(
      role => new Check({ value: role[0], name: this.t._('USER_ROLES.'.concat(role[1])) })
    );
  }
  async ionViewWillEnter(): Promise<void> {
    const topicId = this.route.snapshot.paramMap.get('topicId') ?? 'new';
    try {
      await this.loading.show();
      if (topicId !== 'new') {
        this.topic = await this._topics.getById(topicId);
        this.setUIHelpersForComplexFields();
        this.relatedTopics = await this._topics.getRelated(this.topic);
        this.relatedTopicsChecks = this.activeTopics
          .filter(x => x.topicId !== this.topic.topicId)
          .map(
            x =>
              new Check({
                value: x.topicId,
                name: x.name,
                checked: this.relatedTopics.some(y => x.topicId === y.topicId)
              })
          );
        this.rolesAbleToAskQuestionsChecks.forEach(
          c => (c.checked = this.topic.rolesAbleToAskQuestions.includes(c.value as UserRoles))
        );
        this.editMode = UXMode.VIEW;
      } else {
        this.topic = new Topic();
        this.relatedTopics = [];
        this.relatedTopicsChecks = this.activeTopics.map(x => new Check({ value: x.topicId, name: x.name }));
        this.editMode = UXMode.INSERT;
      }
    } catch (error) {
      this.message.error('COMMON.NOT_FOUND');
    } finally {
      this.loading.hide();
    }
  }

  compareWithEvent(e1: GAEventAttached, e2: GAEventAttached): boolean {
    return e1 && e2 ? e1.eventId === e2.eventId : e1 === e2;
  }
  compareWithCategory(c1: TopicCategoryAttached, c2: TopicCategoryAttached): boolean {
    return c1 && c2 ? c1.categoryId === c2.categoryId : c1 === c2;
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

  setRolesAbleToAskQuestionsFromChecks(): void {
    if (this.rolesAbleToAskQuestionsChecks.every(x => x.checked)) this.topic.rolesAbleToAskQuestions = [];
    else
      this.topic.rolesAbleToAskQuestions = this.rolesAbleToAskQuestionsChecks
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
      this.location.replaceState(this.location.path().replace('/new', '/'.concat(this.topic.topicId)));
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
  async deleteTopic(): Promise<void> {
    const doDelete = async (): Promise<void> => {
      try {
        await this.loading.show();
        await this._topics.delete(this.topic);
        this.message.success('COMMON.OPERATION_COMPLETED');
        this.app.closePage(null, ['']);
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
      this.setUIHelpersForComplexFields();
    }
  }
  private setUIHelpersForComplexFields(): void {
    this.hasDeadlineForQuestions = !!this.topic.willCloseAt;
    this.hasDeadlineForAnswers = !!this.topic.acceptAnswersUntil;
    if (this.topic.publishedSince) {
      if (dateStringIsFuture(this.topic.publishedSince, FAVORITE_TIMEZONE))
        this.publishingOption = PublishingOptions.SCHEDULE;
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
      await sleepForNumSeconds(5);
      subject.avatarURL = this.app.getImageURLByURI(imageURI);
    } catch (error) {
      this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      if (target) target.value = '';
      this.loading.hide();
    }
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

const sleepForNumSeconds = (numSeconds = 1): Promise<void> =>
  new Promise(resolve => setTimeout((): void => resolve(null), 1000 * numSeconds));
