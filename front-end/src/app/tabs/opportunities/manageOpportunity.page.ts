import { Component, Input } from '@angular/core';
import { Location } from '@angular/common';
import { AlertController } from '@ionic/angular';
import { IDEALoadingService, IDEAMessageService, IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { OpportunitiesService } from './opportunities.service';

import { Opportunity, OpportunityApplicationAttachment } from '@models/opportunity.model';
import { dateStringIsFuture, FAVORITE_TIMEZONE } from '@models/favoriteTimezone.const';

@Component({
  selector: 'manage-opportunity',
  templateUrl: 'manageOpportunity.page.html',
  styleUrls: ['manageOpportunity.page.scss']
})
export class ManageOpportunityPage {
  @Input() opportunityId = 'new';
  opportunity: Opportunity;

  editMode = UXMode.VIEW;
  UXMode = UXMode;
  errors = new Set<string>();
  entityBeforeChange: Opportunity;

  hasDeadline = false;
  FAVORITE_TIMEZONE = FAVORITE_TIMEZONE;

  publishingOption = PublishingOptions.DRAFT;
  PublishingOptions = PublishingOptions;

  constructor(
    private location: Location,
    private alertCtrl: AlertController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private _opportunities: OpportunitiesService,
    public app: AppService
  ) {}
  async ionViewWillEnter(): Promise<void> {
    if (!this.app.user.canManageOpportunities) return this.app.closePage('COMMON.UNAUTHORIZED');

    console.log(this.opportunityId);

    try {
      await this.loading.show();

      if (this.opportunityId !== 'new') {
        this.opportunity = await this._opportunities.getById(this.opportunityId);
        this.setUIHelpersForComplexFields();
        this.editMode = UXMode.VIEW;
      } else {
        this.opportunity = new Opportunity();
        this.editMode = UXMode.INSERT;
      }
    } catch (error) {
      this.message.error('COMMON.NOT_FOUND');
    } finally {
      this.loading.hide();
    }
  }

  handleChangeOfPublishingOption(): void {
    if (this.publishingOption === PublishingOptions.DRAFT) delete this.opportunity.publishedSince;
    if (this.publishingOption === PublishingOptions.PUBLISH) this.opportunity.publishedSince = new Date().toISOString();
  }

  shouldResetDeadlineForApplications(): void {
    if (!this.hasDeadline) this.opportunity.willCloseAt = null;
  }

  async addExpectedAttachment(): Promise<void> {
    const doAdd = ({ name }): void => {
      if (!name) return;
      this.opportunity.expectedAttachments.push(new OpportunityApplicationAttachment({ name }));
    };

    const header = this.t._('OPPORTUNITIES.EXPECTED_ATTACHMENT_NAME');
    const inputs: any = [{ name: 'name', type: 'text' }];
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.ADD'), handler: doAdd }
    ];

    const alert = await this.alertCtrl.create({ header, inputs, buttons });
    alert.present();
  }
  removeExpectedAttachment(expectedAttachment: OpportunityApplicationAttachment): void {
    this.opportunity.expectedAttachments.splice(this.opportunity.expectedAttachments.indexOf(expectedAttachment), 1);
  }
  reorderExpectedAttachments({ detail }): void {
    this.opportunity.expectedAttachments = detail.complete(this.opportunity.expectedAttachments);
  }

  async save(): Promise<void> {
    this.errors = new Set(this.opportunity.validate());
    if (this.errors.size) return this.message.error('COMMON.FORM_HAS_ERROR_TO_CHECK');

    try {
      await this.loading.show();
      let result: Opportunity;
      if (this.editMode === UXMode.INSERT) result = await this._opportunities.insert(this.opportunity);
      else result = await this._opportunities.update(this.opportunity);
      this.opportunity.load(result);
      this.location.replaceState(this.location.path().replace('/new', '/'.concat(this.opportunity.opportunityId)));
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

  async manageOpportunityStatus(open: boolean): Promise<void> {
    const doStatusChange = async (): Promise<void> => {
      try {
        await this.loading.show();
        if (open) await this._opportunities.open(this.opportunity);
        else await this._opportunities.close(this.opportunity);
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
  async archiveOpportunity(archive = true): Promise<void> {
    const doArchive = async (): Promise<void> => {
      try {
        await this.loading.show();
        if (archive) await this._opportunities.archive(this.opportunity);
        else await this._opportunities.unarchive(this.opportunity);
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
  async deleteOpportunity(): Promise<void> {
    const doDelete = async (): Promise<void> => {
      try {
        await this.loading.show();
        await this._opportunities.delete(this.opportunity);
        this.message.success('COMMON.OPERATION_COMPLETED');
        this.app.closePage(null, ['']);
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
    this.entityBeforeChange = new Opportunity(this.opportunity);
    this.editMode = UXMode.EDIT;
  }
  exitEditMode(): void {
    if (this.editMode === UXMode.INSERT) this.app.closePage();
    else {
      this.opportunity = this.entityBeforeChange;
      this.errors = new Set<string>();
      this.editMode = UXMode.VIEW;
      this.setUIHelpersForComplexFields();
    }
  }
  private setUIHelpersForComplexFields(): void {
    this.hasDeadline = !!this.opportunity.willCloseAt;
    if (this.opportunity.publishedSince) {
      if (dateStringIsFuture(this.opportunity.publishedSince, FAVORITE_TIMEZONE))
        this.publishingOption = PublishingOptions.SCHEDULE;
      else this.publishingOption = PublishingOptions.PUBLISH;
    } else this.publishingOption = PublishingOptions.DRAFT;
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