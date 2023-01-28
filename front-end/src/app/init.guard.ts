import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { Platform } from '@ionic/angular';
import { IDEAStorageService, IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from './app.service';

import { ServiceLanguages } from '@models/serviceLanguages.enum';

@Injectable({ providedIn: 'root' })
export class InitGuard implements CanActivate {
  constructor(
    private platform: Platform,
    private storage: IDEAStorageService,
    private t: IDEATranslationsService,
    private app: AppService
  ) {}

  async canActivate(): Promise<boolean> {
    if (this.app.initReady) return true;

    await this.platform.ready();
    await this.storage.ready();

    await this.t.init(Object.values(ServiceLanguages), ServiceLanguages.English);

    this.app.initReady = true;
    return true;
  }
}
