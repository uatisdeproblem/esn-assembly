import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';
import { Attachment } from 'idea-toolbox';

@Injectable({ providedIn: 'root' })
export class AttachmentsService {
  constructor(private api: IDEAApiService) {}

  /**
   * Upload a new attachment for a topic.
   */
  async upload(file: File): Promise<string> {
    const { url, id } = await this.api.patchResource('topics', { body: { action: 'GET_ATTACHMENT_UPLOAD_URL' } });
    await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
    return id;
  }

  /**
   * Download the attachment of a topic.
   */
  async download(attachment: Attachment): Promise<string> {
    const body = { action: 'GET_ATTACHMENT_DOWNLOAD_URL', attachmentId: attachment.attachmentId };
    const { url } = await this.api.patchResource('topics', { body });
    return url;
  }
}
