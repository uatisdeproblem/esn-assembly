import { Component, Input } from '@angular/core';
import { Attachment } from 'idea-toolbox';
import { IDEALoadingService, IDEAMessageService, IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from '../app.service';
import { AttachmentsService } from './attachments.service';

import { environment as env } from '@env';

@Component({
  selector: 'app-attachments',
  templateUrl: 'attachments.component.html',
  styleUrls: ['attachments.component.scss']
})
export class AttachmentsComponent {
  /**
   * The array in which we want to add/remove attachments.
   */
  @Input() attachments: Attachment[];
  /**
   * Whether we are editing or viewing the attachments.
   */
  @Input() editMode = false;

  uploadErrors: UploadError[] = [];

  acceptedAttachmentsFormats = ['image/*', '.pdf', '.doc', '.docx', '.xls', '.xlsx'].join(',');

  constructor(
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private _attachments: AttachmentsService,
    public app: AppService,
    public t: IDEATranslationsService
  ) {}

  browseFiles(event?: any): void {
    if (event) event.stopPropagation();
    document.getElementById('attachmentPicker').click();
  }

  addAttachmentFromFile(ev: any): void {
    this.uploadErrors = [];
    const files: FileList = ev.target ? ev.target.files : {};

    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      const fullName = file.name.split('.');
      const format = fullName.pop();
      const name = fullName.join('.');

      this.addAttachment(name, format, file);
    }

    // empty the file picker to allow the upload of new files with the same name
    if (ev.target) ev.target.value = null;
  }

  private async addAttachment(name: string, format: string, file: File): Promise<void> {
    const attachment = new Attachment({ name, format });
    this.attachments.push(attachment);

    try {
      if (bytesToMegaBytes(file.size) > env.idea.app.maxFileUploadSizeMB)
        throw new Error(this.t._('ATTACHMENTS.FILE_IS_TOO_BIG'));
      attachment.attachmentId = await this._attachments.upload(file);
    } catch (err) {
      this.uploadErrors.push({ file: name, error: err.message });
      this.removeAttachment(attachment);
      this.message.error(err.message, true);
    }
  }

  removeAttachment(attachment: Attachment): void {
    this.attachments.splice(this.attachments.indexOf(attachment), 1);
  }

  removeErrorFromList(err: UploadError): void {
    const indexErr = this.uploadErrors.indexOf(err);
    if (indexErr !== -1) this.uploadErrors.splice(this.uploadErrors.indexOf(err), 1);
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
}

const bytesToMegaBytes = (bytes: number): number => bytes / 1024 ** 2;

interface UploadError {
  file: string;
  error: string;
}
