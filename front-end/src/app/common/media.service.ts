import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

@Injectable({ providedIn: 'root' })
export class MediaService {
  constructor(private api: IDEAApiService) {}

  /**
   * Upload a new image and get its URI.
   */
  async uploadImage(file: File): Promise<string> {
    const { url, id } = await this.api.postResource('media');
    await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
    return id;
  }
}
