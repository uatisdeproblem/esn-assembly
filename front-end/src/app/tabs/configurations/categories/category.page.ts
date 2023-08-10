import { Component, Input } from '@angular/core';
import { Location } from '@angular/common';
import { AlertController } from '@ionic/angular';
import { IDEALoadingService, IDEAMessageService, IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { TopicCategoryService } from './categories.service';

import { CATEGORY_COLORS, TopicCategory } from '@models/category.model';

@Component({
  selector: 'category',
  templateUrl: 'category.page.html',
  styleUrls: ['category.page.scss']
})
export class CategoryPage {
  @Input() categoryId = 'new';
  category: TopicCategory;
  colors = CATEGORY_COLORS;

  editMode = UXMode.VIEW;
  UXMode = UXMode;
  errors = new Set<string>();
  entityBeforeChange: TopicCategory;

  constructor(
    private location: Location,
    private alertCtrl: AlertController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private _categories: TopicCategoryService,
    public app: AppService
  ) {}
  async ionViewWillEnter(): Promise<void> {
    try {
      await this.loading.show();
      if (this.categoryId !== 'new') {
        this.category = await this._categories.getById(this.categoryId);
        this.editMode = UXMode.VIEW;
      } else {
        this.category = new TopicCategory();
        this.editMode = UXMode.INSERT;
      }
    } catch (error) {
      this.message.error('COMMON.NOT_FOUND');
    } finally {
      this.loading.hide();
    }
  }

  async save(): Promise<void> {
    this.errors = new Set(this.category.validate());
    if (this.errors.size) return this.message.error('COMMON.FORM_HAS_ERROR_TO_CHECK');

    try {
      await this.loading.show();
      let result: TopicCategory;
      if (this.editMode === UXMode.INSERT) result = await this._categories.insert(this.category);
      else result = await this._categories.update(this.category);
      this.category.load(result);
      this.location.replaceState(this.location.path().replace('/new', '/'.concat(this.category.categoryId)));
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

  async archiveCategory(archive = true): Promise<void> {
    const doArchive = async (): Promise<void> => {
      try {
        await this.loading.show();
        if (archive) await this._categories.archive(this.category);
        else await this._categories.unarchive(this.category);
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
  async deleteCategory(): Promise<void> {
    const doDelete = async (): Promise<void> => {
      try {
        await this.loading.show();
        await this._categories.delete(this.category);
        this.message.success('COMMON.OPERATION_COMPLETED');
        this.app.closePage();
      } catch (error) {
        if (error.message === 'Category is used') this.message.error('CATEGORIES.CANT_DELETE_IF_USED_ERROR');
        else this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const subHeader = this.t._('COMMON.ACTION_IS_IRREVERSIBLE');
    const message = this.t._('CATEGORIES.CANT_DELETE_IF_USED_WARNING');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.DELETE'), role: 'destructive', handler: doDelete }
    ];
    const alert = await this.alertCtrl.create({ header, subHeader, message, buttons });
    alert.present();
  }

  enterEditMode(): void {
    this.entityBeforeChange = new TopicCategory(this.category);
    this.editMode = UXMode.EDIT;
  }
  exitEditMode(): void {
    if (this.editMode === UXMode.INSERT) this.app.closePage();
    else {
      this.category = this.entityBeforeChange;
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
