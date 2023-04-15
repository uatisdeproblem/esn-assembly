import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IDEAStorageService } from '@idea-ionic/common';

import { AppService } from '../app.service';

import { environment as env } from '@env';

@Component({
  selector: 'auth-page',
  templateUrl: 'auth.page.html',
  styleUrls: ['auth.page.scss']
})
export class AuthPage implements OnInit {
  version = env.idea.app.version;

  constructor(private storage: IDEAStorageService, private route: ActivatedRoute, public app: AppService) {}
  async ngOnInit(): Promise<void> {
    const apiToken = this.route.snapshot.queryParamMap.get('token');
    // complete the flow from ESN Accounts
    if (apiToken) {
      const user = parseJWT(apiToken);
      const tokenExpiresAt = user.exp * 1000;
      if (tokenExpiresAt > Date.now()) {
        await this.storage.set('token', apiToken);
        await this.storage.set('tokenExpiresAt', tokenExpiresAt);
        await this.storage.set('user', user);
      }
      window.location.assign('');
    }
  }

  startLoginFlowWithESNAccounts(): void {
    const apiLoginURL = `https://${env.idea.api.url}/${env.idea.api.stage}/login`;
    const localhost = location.hostname.startsWith('localhost') ? '?localhost=8100' : '';
    window.location.assign(`https://accounts.esn.org/cas/login?service=${apiLoginURL}${localhost}`);
  }
}

/**
 * Parse a JWT token without using external libraries.
 */
const parseJWT = (token: string): any => {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    window
      .atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
};
