import { Injectable } from '@angular/core';
import { Attachment } from 'idea-toolbox';
import { IDEAApiService } from '@idea-ionic/common';

@Injectable({ providedIn: 'root' })
export class PublicAttachmentsService {
  constructor(private api: IDEAApiService) {}

  /**
   * Upload a new public attachment.
   */
  async upload(file: File): Promise<string> {
    const body = { action: 'GET_ATTACHMENT_UPLOAD_URL' };
    const { url, id } = await this.api.patchResource('public-attachments', { body });
    await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
    return id;
  }

  /**
   * Download a public attachment.
   */
  async download(attachment: Attachment): Promise<string> {
    const body = { action: 'GET_ATTACHMENT_DOWNLOAD_URL', attachmentId: attachment.attachmentId };
    const { url } = await this.api.patchResource('public-attachments', { body });
    return url;
  }
}
