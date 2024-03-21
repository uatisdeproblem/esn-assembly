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
   * The IDs of the users that can manage the dashboard.
   */
  dashboardManagersIds: string[];
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
   * The subtitle of the platform.
   */
  appSubtitle: string;
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
  /**
   * Whether to hide the Q&A topics feature from the front-end.
   */
  hideQATopics: boolean;
  /**
   * Whether to hide the opportunities feature from the front-end.
   */
  hideOpportunities: boolean;
  /**
   * Whether to hide the voting feature from the front-end.
   */
  hideVoting: boolean;
  /**
   * Whether to hide the badges (gamification) feature from the front-end.
   */
  hideBadges: boolean;

  load(x: any): void {
    super.load(x);
    this.administratorsIds = this.cleanArray(x.administratorsIds, String).map(x => x.toLowerCase());
    this.opportunitiesManagersIds = this.cleanArray(x.opportunitiesManagersIds, String).map(x => x.toLowerCase());
    this.dashboardManagersIds = this.cleanArray(x.dashboardManagersIds, String).map(x => x.toLowerCase());
    this.bannedUsersIds = this.cleanArray(x.bannedUsersIds, String).map(x => x.toLowerCase());

    this.appTitle = this.clean(x.appTitle, String, 'Assembly app');
    this.appSubtitle = this.clean(x.appSubtitle, String);
    this.supportEmail = this.clean(x.supportEmail, String);
    this.appLogoURL = this.clean(x.appLogoURL, String);
    this.appLogoURLDarkMode = this.clean(x.appLogoURLDarkMode, String);
    this.timezone = this.clean(x.timezone, String, DEFAULT_TIMEZONE);
    this.usersOriginDisplay = this.clean(x.usersOriginDisplay, String, UsersOriginDisplayOptions.SECTION);
    this.hideQATopics = this.clean(x.hideQATopics, Boolean, false);
    this.hideOpportunities = this.clean(x.hideOpportunities, Boolean, false);
    this.hideVoting = this.clean(x.hideVoting, Boolean, false);
    this.hideBadges = this.clean(x.hideBadges, Boolean, false);
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
  APPLICATION_REJECTED = 'APPLICATION_REJECTED',
  VOTING_INSTRUCTIONS = 'VOTING_INSTRUCTIONS',
  VOTING_CONFIRMATION = 'VOTING_CONFIRMATION'
}

/**
 * The possible options in displaying information about a user.
 */
export enum UsersOriginDisplayOptions {
  COUNTRY = 'country',
  SECTION = 'section',
  BOTH = 'both'
}
