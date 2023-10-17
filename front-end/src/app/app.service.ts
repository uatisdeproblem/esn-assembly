import { Injectable } from '@angular/core';
import { Params } from '@angular/router';
import { AlertController, NavController, Platform } from '@ionic/angular';
import { Browser } from '@capacitor/browser';
import {
  IDEAActionSheetController,
  IDEAApiService,
  IDEAMessageService,
  IDEAStorageService,
  IDEATranslationsService
} from '@idea-ionic/common';

import { environment as env } from '@env';
import { User } from '@models/user.model';

/**
 * The base URLs where the thumbnails are located.
 */
const THUMBNAILS_BASE_URL = env.idea.app.mediaUrl.concat('/images/', env.idea.api.stage, '/');
/**
 * A local fallback URL for the users avatars.
 */
const AVATAR_FALLBACK_URL = './assets/imgs/no-avatar.jpg';
/**
 * A local generic fallback URL for the images.
 */
const ESN_STAR_FALLBACK_URL = './assets/icons/icon.svg';
/**
 * The local URL to the icon.
 */
const APP_ICON_PATH = './assets/icons/icon.svg';
/**
 * The local URL to the icon.
 */
const APP_ICON_WHITE_PATH = './assets/icons/star-white.svg';

@Injectable({ providedIn: 'root' })
export class AppService {
  initReady = false;
  authReady = false;

  private darkMode: boolean;

  user: User;

  constructor(
    private platform: Platform,
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private message: IDEAMessageService,
    private storage: IDEAStorageService,
    private actionSheetCtrl: IDEAActionSheetController,
    private api: IDEAApiService,
    private t: IDEATranslationsService
  ) {
    this.darkMode = this.respondToColorSchemePreferenceChanges();
  }
  private respondToColorSchemePreferenceChanges(): boolean {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => (this.darkMode = e.matches));
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /**
   * Whether we are running the app in developer mode (from localhost).
   */
  isDeveloperMode(): boolean {
    return env.debug;
  }
  /**
   * Open an alert to get the token for running requests against this project's API.
   */
  async getTokenId(): Promise<void> {
    const message = this.api.authToken as string;
    const alert = await this.alertCtrl.create({ message, buttons: ['Thanks 🙌'], cssClass: 'selectable' });
    alert.present();
  }

  /**
   * Whether we should display a UX designed for smaller screens.
   */
  isInMobileMode(): boolean {
    return this.platform.width() < 992;
  }
  /**
   * Whether the current color scheme preference is set to dark.
   */
  isInDarkMode(): boolean {
    return this.darkMode;
  }

  /**
   * Reload the app.
   */
  reloadApp(): void {
    window.location.assign('');
  }
  /**
   * Navigate to a page by its path.
   */
  goTo(path: string[], options: { back?: boolean; root?: boolean; queryParams?: Params } = {}): void {
    if (options.back) this.navCtrl.navigateBack(path, options);
    else if (options.root) this.navCtrl.navigateRoot(path, options);
    else this.navCtrl.navigateForward(path, options);
  }
  /**
   * Navigate to a page in the tabs routing by its path.
   */
  goToInTabs(path: string[], options: { back?: boolean; root?: boolean; queryParams?: Params } = {}): void {
    this.goTo(['t', ...path], options);
  }
  /**
   * Close the current page and navigate back, optionally displaying an error message.
   */
  closePage(errorMessage?: string, pathBack?: string[]): void {
    if (errorMessage) this.message.error(errorMessage);
    try {
      this.navCtrl.back();
    } catch (_) {
      this.navCtrl.navigateBack(pathBack || []);
    }
  }

  /**
   * Get the URL to an image by its URI.
   */
  getImageURLByURI(imageURI: string): string {
    return THUMBNAILS_BASE_URL.concat(imageURI, '.png');
  }
  /**
   * Load a fallback URL when an avatar is missing.
   */
  fallbackAvatar(targetImg: any, star = false): void {
    const fallbackURL = star ? ESN_STAR_FALLBACK_URL : AVATAR_FALLBACK_URL;
    if (targetImg && targetImg.src !== fallbackURL) targetImg.src = AVATAR_FALLBACK_URL;
  }
  /**
   * Get the URL to the fallback avatar's image.
   */
  getAvatarFallbackURL(star = false): string {
    return star ? ESN_STAR_FALLBACK_URL : AVATAR_FALLBACK_URL;
  }

  /**
   * Actions on the current user.
   */
  async openUserPreferences(): Promise<void> {
    const header = this.user.firstName;
    const buttons = [
      { text: this.t._('COMMON.LOGOUT'), icon: 'log-out', handler: (): Promise<void> => this.logout() },
      { text: this.t._('COMMON.CANCEL'), role: 'cancel', icon: 'arrow-undo' }
    ];

    const actions = await this.actionSheetCtrl.create({ header, buttons });
    actions.present();
  }
  /**
   * Show some app's info.
   */
  async info(): Promise<void> {
    const openPrivacyPolicy = (): Promise<void> => this.openURL(this.t._('IDEA_VARIABLES.PRIVACY_POLICY_URL'));

    const header = this.t._('COMMON.APP_NAME');
    const message = this.t._('COMMON.VERSION', { v: env.idea.app.version });
    const buttons = [
      { text: this.t._('IDEA_AUTH.PRIVACY_POLICY'), handler: openPrivacyPolicy },
      { text: this.t._('COMMON.CLOSE') }
    ];

    const alert = await this.alertCtrl.create({ header, message, buttons });
    alert.present();
  }

  /**
   * Sign-out from the current user.
   */
  async logout(): Promise<void> {
    const doLogout = async (): Promise<void> => {
      await this.storage.clear();
      this.reloadApp();
    };

    const header = this.t._('COMMON.LOGOUT');
    const message = this.t._('COMMON.ARE_YOU_SURE');
    const buttons = [{ text: this.t._('COMMON.CANCEL') }, { text: this.t._('COMMON.LOGOUT'), handler: doLogout }];

    const alert = await this.alertCtrl.create({ header, message, buttons });
    alert.present();
  }

  /**
   * Utility to generate a numeric array.
   * Useful for skeleton interfaces.
   */
  generateNumericArray(length: number): number[] {
    return [...Array(length).keys()];
  }

  /**
   * Get the app's main icon.
   */
  getIcon(white = false): string {
    return white ? APP_ICON_WHITE_PATH : APP_ICON_PATH;
  }

  /**
   * Open the URL in the browser.
   */
  async openURL(url: string): Promise<void> {
    const windowName = this.platform.is('ios') ? '_parent' : '_blank';
    await Browser.open({ url, windowName });
  }

  /**
   * Open a new window in the browser to download some data as a file.
   */
  downloadDataAsFile(data: any, type: string, fileName: string): void {
    const uri = `data:${type};charset=utf-8,${encodeURIComponent(data)}`;

    const downloadLink = document.createElement('a');
    downloadLink.href = uri;
    downloadLink.download = fileName;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }
}
