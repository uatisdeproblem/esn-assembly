import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Platform } from '@ionic/angular';
import { Title } from '@angular/platform-browser';
import { IDEAStorageService, IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from './app.service';
import { ConfigurationsService } from './tabs/configurations/configurations.service';

import { ServiceLanguages } from '@models/serviceLanguages.enum';

export const initGuard: CanActivateFn = async (): Promise<boolean> => {
  const platform = inject(Platform);
  const title = inject(Title);
  const storage = inject(IDEAStorageService);
  const t = inject(IDEATranslationsService);
  const app = inject(AppService);
  const _configurations = inject(ConfigurationsService);

  if (app.initReady) return true;

  await platform.ready();
  await storage.ready();

  await t.init(Object.values(ServiceLanguages), ServiceLanguages.English);

  app.configurations = await _configurations.get();
  title.setTitle(app.configurations.appTitle);

  app.initReady = true;
  return true;
};
