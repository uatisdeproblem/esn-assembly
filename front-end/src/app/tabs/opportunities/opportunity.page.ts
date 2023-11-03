import { Component, Input, ViewChild } from '@angular/core';
import { IonContent, IonRefresher } from '@ionic/angular';
import { Attachment, epochISOString } from 'idea-toolbox';
import { IDEALoadingService, IDEAMessageService, IDEATranslationsService } from '@idea-ionic/common';

import { ACCEPTED_ATTACHMENTS_FORMATS, bytesToMegaBytes } from '@app/common/attachments.component';

import { AppService } from '@app/app.service';
import { OpportunitiesService } from './opportunities.service';
import { AttachmentsService } from 'src/app/common/attachments.service';

import { environment as env } from '@env';
import { Opportunity } from '@models/opportunity.model';
import { dateStringIsPast, FAVORITE_TIMEZONE } from '@models/favoriteTimezone.const';
import { Application } from '@models/application.model';
import { Subject } from '@models/subject.model';

@Component({
  selector: 'opportunity',
  templateUrl: 'opportunity.page.html',
  styleUrls: ['opportunity.page.scss']
})
export class OpportunityPage {
  @Input() opportunityId: string;
  opportunity: Opportunity;

  @ViewChild(IonContent) content: IonContent;

  FAVORITE_TIMEZONE = FAVORITE_TIMEZONE;

  showContent = true;

  application: Application;
  acceptedAttachmentsFormats = ACCEPTED_ATTACHMENTS_FORMATS.join(',');
  errors = new Set<string>();
  attachmentUploadErros: Record<string, Error> = {};
  writingApplication = false;

  constructor(
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private _opportunities: OpportunitiesService,
    private _attachments: AttachmentsService,
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
  }
  async handleRefresh(refresh: IonRefresher): Promise<void> {
    this.opportunity = null;
    await this.loadResources();
    refresh.complete();
  }

  manageOpportunity(): void {
    this.app.goToInTabs(['opportunities', this.opportunity.opportunityId, 'manage']);
  }

  async downloadAttachment(attachment: Attachment): Promise<void> {
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
    this.application.attachments[expectedAttachmentName] = attachment;

    try {
      if (bytesToMegaBytes(file.size) > env.idea.app.maxFileUploadSizeMB)
        throw new Error(this.t._('ATTACHMENTS.FILE_IS_TOO_BIG'));
      attachment.attachmentId = await this._attachments.upload(file);
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
    this.application.attachments[expectedAttachmentName] = null;
    this.attachmentUploadErros[expectedAttachmentName] = null;
  }
  async downloadAttachmentByExpectedName(attachment: Attachment): Promise<void> {
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

  startApplication(): void {
    this.application = new Application({ subject: Subject.fromUser(this.app.user) });
    this.writingApplication = true;
  }
  cancelApplication(): void {
    this.application = null;
    this.writingApplication = false;
  }
  async sendApplication(): Promise<void> {
    // this.errors = new Set(this.application.validate(this.opportunity));
    if (this.errors.size) return this.message.error('COMMON.FORM_HAS_ERROR_TO_CHECK');

    this.message.success('OPPORTUNITIES.APPLICATION_RECEIVED');
    this.application.applicationId = '123'; // @todo
    this.writingApplication = false;
    this.content.scrollToTop(500);
  }
  hasFieldAnError(field: string): boolean {
    return this.errors.has(field);
  }
  editApplication(): void {
    this.writingApplication = true;
    // @todo
  }
  withdrawApplication(): void {
    // @todo
  }

  async sendQuestionAsEmail(): Promise<void> {
    const emailSubject = encodeURIComponent(
      this.t._('OPPORTUNITIES.QUESTION_ON_OPPORTUNITY').concat(': ', this.opportunity.name)
    );
    const url = `mailto:${this.opportunity.contactEmail}?subject=${emailSubject}`;
    await this.app.openURL(url);
  }
}
