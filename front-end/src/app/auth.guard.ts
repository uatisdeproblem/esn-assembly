import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Platform, NavController } from '@ionic/angular';
import { IDEAApiService, IDEAStorageService } from '@idea-ionic/common';

import { AppService } from './app.service';

import { User } from '@models/user.model';

export const authGuard: CanActivateFn = async (): Promise<boolean> => {
  const platform = inject(Platform);
  const navCtrl = inject(NavController);
  const storage = inject(IDEAStorageService);
  const api = inject(IDEAApiService);
  const app = inject(AppService);

  if (app.authReady) return true;

  //
  // HELPERS
  //

  const loadUserAndToken = async (): Promise<void> => {
    const tokenExpiresAt = await storage.get('tokenExpiresAt');
    if (!tokenExpiresAt || tokenExpiresAt < Date.now()) throw new Error('The token expired');

    api.authToken = await storage.get('token');
    if (!api.authToken) throw new Error('Missing token');

    app.user = new User(await storage.get('user'));
    if (!app.user) throw new Error('Missing user');
  };

  const navigateAndResolve = (navigationPath?: string[]): boolean => {
    if (navigationPath) navCtrl.navigateRoot(navigationPath);
    app.authReady = true;
    return true;
  };

  //
  // MAIN
  //

  if (app.authReady) return true;

  await platform.ready();
  await storage.ready();

  try {
    await loadUserAndToken();

    if (window.location.pathname === '/') return navigateAndResolve([]);
    else return navigateAndResolve();
  } catch (err) {
    return navigateAndResolve(['auth']);
  }
};
