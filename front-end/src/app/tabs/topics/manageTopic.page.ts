import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { Check, epochISODateString } from 'idea-toolbox';
import { IDEALoadingService, IDEAMessageService, IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { TopicsService } from './topics.service';
import { TopicCategoryService } from '../configurations/categories/categories.service';
import { TopicEventsService } from '../configurations/events/events.service';

import { Topic } from '@models/topic.model';
import { TopicCategory, TopicCategoryAttached } from '@models/category.model';
import { TopicEvent, TopicEventAttached } from '@models/event.model';
import { Subject, SubjectTypes } from '@models/subject.model';
import { KNOWN_GALAXY_ROLES } from '@models/user.model';
import { FAVORITE_TIMEZONE } from '@models/favoriteTimezone.const';

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
  events: TopicEvent[];

  hasDeadline = false;
  now = new Date().toISOString().slice(0, 16);
  FAVORITE_TIMEZONE = FAVORITE_TIMEZONE;

  SubjectTypes = SubjectTypes;

  rolesAbleToAskQuestionsChecks = KNOWN_GALAXY_ROLES.map(role => new Check({ value: role }));

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private alertCtrl: AlertController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private _topics: TopicsService,
    private _categories: TopicCategoryService,
    private _events: TopicEventsService,
    public app: AppService
  ) {}
  async ngOnInit(): Promise<void> {
    [this.categories, this.events] = await Promise.all([this._categories.getList(), this._events.getList()]);
  }
  async ionViewWillEnter(): Promise<void> {
    const topicId = this.route.snapshot.paramMap.get('topicId') ?? 'new';
    try {
      await this.loading.show();
      if (topicId !== 'new') {
        this.topic = await this._topics.getById(topicId);
        this.editMode = UXMode.VIEW;
        if (this.topic.willCloseAt) this.hasDeadline = true;
        this.rolesAbleToAskQuestionsChecks.forEach(
          c => (c.checked = this.topic.rolesAbleToAskQuestions.includes(String(c.value)))
        );
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

  compareWithEvent(e1: TopicEventAttached, e2: TopicEventAttached): boolean {
    return e1 && e2 ? e1.eventId === e2.eventId : e1 === e2;
  }
  compareWithCategory(c1: TopicCategoryAttached, c2: TopicCategoryAttached): boolean {
    return c1 && c2 ? c1.categoryId === c2.categoryId : c1 === c2;
  }

  shouldResetDeadline(): void {
    if (!this.hasDeadline) this.topic.willCloseAt = null;
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
        .map(x => String(x.value));
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

  async manageTopicStatus(open = true): Promise<void> {
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
        this.app.closePage();
      } catch (error) {
        this.message.error('COMMON.OPERATION_FAILED');
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
    }
  }
}

export enum UXMode {
  VIEW,
  INSERT,
  EDIT
}
