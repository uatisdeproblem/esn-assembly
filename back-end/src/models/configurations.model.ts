import { Resource } from 'idea-toolbox';

export const DEFAULT_TIMEZONE = 'Europe/Brussels';

/**
 * The platform's configuations.
 */
export class Configurations extends Resource {
  static PK = '1';
  /**
   * A fixed string, to identify the configurations.
   */
  PK = Configurations.PK;

  /**
   * The IDs of the platform's administrators.
   */
  administratorsIds: string[];
  /**
   * The IDs of the users that can open and manage opportunities.
   */
  opportunitiesManagersIds: string[];
  /**
   * The IDs of the users banned; these users won't be able to add new contents (questions, messages, etc.).
   * Note: it's not a data model by itself becase we hope this list will always stay empty/short.
   */
  bannedUsersIds: string[];

  /**
   * The name/title of the platform.
   */
  appTitle: string;
  /**
   * A contact email to reach if support is needed by users.
   */
  supportEmail: string;
  /**
   * The logo of the platform (in light mode); if not specified, the default logo is shown.
   */
  appLogoURL: string;
  /**
   * The logo of the platform in dark mode; if not specified, the default logo is shown.
   */
  appLogoURLDarkMode: string;
  /**
   * The timezone to use for dates and deadlines.
   */
  timezone: string;
  /**
   * When displaying a user, which information to show.
   */
  usersOriginDisplay: UsersOriginDisplayOptions;

  load(x: any): void {
    super.load(x);
    this.administratorsIds = this.cleanArray(x.administratorsIds, String).map(x => x.toLowerCase());
    this.opportunitiesManagersIds = this.cleanArray(x.opportunitiesManagersIds, String).map(x => x.toLowerCase());
    this.bannedUsersIds = this.cleanArray(x.bannedUsersIds, String).map(x => x.toLowerCase());

    this.appTitle = this.clean(x.appTitle, String);
    this.supportEmail = this.clean(x.supportEmail, String);
    this.appLogoURL = this.clean(x.appLogoURL, String);
    this.appLogoURLDarkMode = this.clean(x.appLogoURLDarkMode, String);
    this.timezone = this.clean(x.timezone, String, DEFAULT_TIMEZONE);
    this.usersOriginDisplay = this.clean(x.usersOriginDisplay, String, UsersOriginDisplayOptions.SECTION);
  }

  safeLoad(newData: any, safeData: any): void {
    super.safeLoad(newData, safeData);
    this.PK = Configurations.PK;
  }

  validate(): string[] {
    const e = super.validate();
    if (this.iE(this.administratorsIds)) e.push('administratorsIds');
    if (this.iE(this.appTitle)) e.push('appTitle');
    return e;
  }
}

/**
 * The possible email templates.
 */
export enum EmailTemplates {
  QUESTIONS = 'QUESTIONS',
  ANSWERS = 'ANSWERS',
  APPLICATION_APPROVED = 'APPLICATION_APPROVED',
  APPLICATION_REJECTED = 'APPLICATION_REJECTED'
}

/**
 * The possible options in displaying information about a user.
 */
export enum UsersOriginDisplayOptions {
  COUNTRY = 'country',
  SECTION = 'section',
  BOTH = 'both'
}
