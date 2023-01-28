import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { Platform, NavController } from '@ionic/angular';
import { CognitoUser } from 'idea-toolbox';
import { IDEAApiService, IDEAStorageService } from '@idea-ionic/common';
import { IDEAAuthService } from '@idea-ionic/auth';

import { AppService } from './app.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private platform: Platform,
    private navCtrl: NavController,
    private storage: IDEAStorageService,
    private auth: IDEAAuthService,
    private api: IDEAApiService,
    private app: AppService
  ) {}

  async canActivate(): Promise<boolean> {
    if (this.app.authReady) return true;

    await this.platform.ready();
    await this.storage.ready();

    try {
      await this.doAuth();
      this.platform.resume.subscribe(() => this.doAuth());

      if (window.location.pathname === '/') return this.navigateAndResolve([]);

      return this.navigateAndResolve();
    } catch (err) {
      return this.navigateAndResolve(['auth']);
    }
  }

  private async doAuth(): Promise<{ authToken: string; user: CognitoUser }> {
    const authRes = await this.auth.isAuthenticated(false, freshIdToken => (this.api.authToken = freshIdToken));

    this.api.authToken = authRes.idToken;
    this.app.user = new CognitoUser(authRes.userDetails);

    return { authToken: this.api.authToken, user: this.app.user };
  }
  private navigateAndResolve(navigationPath?: string[]): boolean {
    if (navigationPath) this.navCtrl.navigateRoot(navigationPath);
    this.app.authReady = true;
    return true;
  }
}
