import { Component, Input, ViewChild } from '@angular/core';
import { AlertController, IonContent, IonRefresher } from '@ionic/angular';
import { Attachment, epochISOString } from 'idea-toolbox';
import { IDEALoadingService, IDEAMessageService, IDEATranslationsService } from '@idea-ionic/common';

import { ACCEPTED_ATTACHMENTS_FORMATS, bytesToMegaBytes } from '@app/common/attachments.component';

import { AppService } from '@app/app.service';
import { OpportunitiesService } from './opportunities.service';
import { ApplicationsService } from './applications/applications.service';
import { PublicAttachmentsService } from '@app/common/attachments.service';

import { environment as env } from '@env';
import { Opportunity } from '@models/opportunity.model';
import { dateStringIsPast, FAVORITE_TIMEZONE } from '@models/favoriteTimezone.const';
import { Application, ApplicationStatuses } from '@models/application.model';
import { Subject } from '@models/subject.model';

@Component({
  selector: 'opportunity',
  templateUrl: 'opportunity.page.html',
  styleUrls: ['opportunity.page.scss']
})
export class OpportunityPage {
  @Input() opportunityId: string;
  opportunity: Opportunity;
  showContent = true;

  @ViewChild(IonContent) content: IonContent;
  FAVORITE_TIMEZONE = FAVORITE_TIMEZONE;

  applications: Application[];

  userApplication: Application;
  acceptedAttachmentsFormats = ACCEPTED_ATTACHMENTS_FORMATS.join(',');
  errors = new Set<string>();
  attachmentUploadErros: Record<string, Error> = {};
  writingApplication = false;
  ApplicationStatuses = ApplicationStatuses;

  constructor(
    private alertCtrl: AlertController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private _opportunities: OpportunitiesService,
    private _applications: ApplicationsService,
    private _attachments: PublicAttachmentsService,
    public app: AppService
  ) {}
  async ionViewWillEnter(): Promise<void> {
    try {
      await this.loading.show();
      await this.loadResources();
    } catch (error) {
      this.message.error('COMMON.NOT_FOUND');
    } finally {
      this.loading.hide();
    }
  }
  private async loadResources(): Promise<void> {
    this.opportunity = await this._opportunities.getById(this.opportunityId);
    this.applications = await this._applications.getListOfopportunity(this.opportunity, { force: true });
    this.userApplication = this.applications.find(x => x.userId === this.app.user.userId);
  }
  async handleRefresh(refresh: IonRefresher): Promise<void> {
    this.opportunity = null;
    this.applications = null;
    this.userApplication = null;
    await this.loadResources();
    refresh.complete();
  }

  manageOpportunity(): void {
    this.app.goToInTabs(['opportunities', this.opportunity.opportunityId, 'manage']);
  }

  async downloadOpportunityAttachment(attachment: Attachment): Promise<void> {
    try {
      await this.loading.show();
      const url = await this._attachments.download(attachment);
      await this.app.openURL(url);
    } catch (error) {
      this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      this.loading.hide();
    }
  }

  dateStringIsPast(dateString: epochISOString): boolean {
    return dateStringIsPast(dateString, FAVORITE_TIMEZONE);
  }

  browseFilesForInputId(id: string): void {
    document.getElementById(id).click();
  }
  async addAttachment({ target }, expectedAttachmentName: string): Promise<void> {
    if (!target?.files.length) return;

    const file: File = target.files[0];
    const fullName = file.name.split('.');
    const format = fullName.pop();
    const name = fullName.join('.');
    const attachment = new Attachment({ name, format });
    this.userApplication.attachments[expectedAttachmentName] = attachment;

    try {
      if (bytesToMegaBytes(file.size) > env.idea.app.maxFileUploadSizeMB)
        throw new Error(this.t._('ATTACHMENTS.FILE_IS_TOO_BIG'));
      attachment.attachmentId = await this._applications.uploadAttachment(this.opportunity, file);
      this.attachmentUploadErros[expectedAttachmentName] = null;
    } catch (err) {
      this.removeAttachmentByExpectedName(expectedAttachmentName);
      this.attachmentUploadErros[expectedAttachmentName] = err.message;
      this.message.error(err.message, true);
    }

    // empty the file picker to allow the upload of new files with the same name
    if (target) target.value = null;
  }
  removeAttachmentByExpectedName(expectedAttachmentName: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.userApplication.attachments[expectedAttachmentName] = null;
    this.attachmentUploadErros[expectedAttachmentName] = null;
  }

  startApplication(): void {
    this.userApplication = new Application({ userId: this.app.user.userId, subject: Subject.fromUser(this.app.user) });
    this.writingApplication = true;
  }
  fixUserApplication(): void {
    this.writingApplication = true;
  }
  cancelApplication(): void {
    if (!this.userApplication.applicationId) this.userApplication = null;
    this.writingApplication = false;
  }
  async sendApplication(): Promise<void> {
    this.errors = new Set(this.userApplication.validate(this.opportunity));
    if (this.errors.size) return this.message.error('COMMON.FORM_HAS_ERROR_TO_CHECK');

    const doSend = async (): Promise<void> => {
      try {
        await this.loading.show();
        if (this.userApplication.applicationId)
          this.userApplication.load(await this._applications.update(this.opportunity, this.userApplication));
        else {
          this.userApplication.load(await this._applications.insert(this.opportunity, this.userApplication));
          this.applications.unshift(this.userApplication);
        }
        this.writingApplication = false;
        this.content.scrollToTop(500);
        this.message.success('OPPORTUNITIES.APPLICATION_SENT');
      } catch (err) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };

    const header = this.t._('COMMON.ARE_YOU_SURE');
    const message = this.t._('OPPORTUNITIES.IS_YOUR_APPLICATION_READY');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.SEND'), role: 'destructive', handler: doSend }
    ];
    const alert = await this.alertCtrl.create({ header, message, buttons });
    alert.present();
  }
  hasFieldAnError(field: string): boolean {
    return this.errors.has(field);
  }
  async withdrawUserApplication(): Promise<void> {
    const doDelete = async (): Promise<void> => {
      try {
        await this.loading.show();
        await this._applications.delete(this.opportunity, this.userApplication);
        const index = this.applications.findIndex(x => x.applicationId === this.userApplication.applicationId);
        if (index !== -1) this.applications.splice(index, 1);
        this.userApplication = null;
        this.message.success('COMMON.OPERATION_COMPLETED');
      } catch (err) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };

    const header = this.t._('OPPORTUNITIES.WITHDRAW_APPLICATION');
    const subHeader = this.t._('COMMON.ARE_YOU_SURE');
    const message = this.t._('OPPORTUNITIES.WITHDRAW_APPLICATION_I');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.CONFIRM'), role: 'destructive', handler: doDelete }
    ];
    const alert = await this.alertCtrl.create({ header, subHeader, message, buttons });
    alert.present();
  }

  async sendQuestionAsEmail(): Promise<void> {
    const emailSubject = encodeURIComponent(
      this.t._('OPPORTUNITIES.QUESTION_ON_OPPORTUNITY').concat(': ', this.opportunity.name)
    );
    const url = `mailto:${this.opportunity.contactEmail}?subject=${emailSubject}`;
    await this.app.openURL(url);
  }

  reviewApplication(application: Application): void {
    // @todo modale con approve e reject
  }
}
