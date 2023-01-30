import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { Platform, NavController } from '@ionic/angular';
import { IDEAApiService, IDEAStorageService } from '@idea-ionic/common';

import { AppService } from './app.service';

import { User } from '@models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private platform: Platform,
    private navCtrl: NavController,
    private storage: IDEAStorageService,
    private api: IDEAApiService,
    private app: AppService
  ) {}

  async canActivate(): Promise<boolean> {
    if (this.app.authReady) return true;

    await this.platform.ready();
    await this.storage.ready();

    try {
      await this.loadUserAndToken();

      if (window.location.pathname === '/') return this.navigateAndResolve([]);
      else return this.navigateAndResolve();
    } catch (err) {
      return this.navigateAndResolve(['auth']);
    }
  }

  private async loadUserAndToken(): Promise<void> {
    const tokenExpiresAt = await this.storage.get('tokenExpiresAt');
    if (!tokenExpiresAt || tokenExpiresAt < Date.now()) throw new Error('The token expired');

    this.api.authToken = await this.storage.get('token');
    if (!this.api.authToken) throw new Error('Missing token');

    this.app.user = new User(await this.storage.get('user'));
    if (!this.app.user) throw new Error('Missing user');
  }
  private navigateAndResolve(navigationPath?: string[]): boolean {
    if (navigationPath) this.navCtrl.navigateRoot(navigationPath);
    this.app.authReady = true;
    return true;
  }
}
