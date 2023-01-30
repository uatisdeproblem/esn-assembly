import { Resource } from 'idea-toolbox';

/**
 * The list of roles that, if owned, would grant administative privileges in the platform.
 */
export const ADMIN_GALAXY_ROLES = [
  'International.CNRsecretary',
  'International.AGMchair',
  'International.CNRadministrator',
  'International.Board'
];

/**
 * The list of (known) interesting roles on which to assign permissions in the platform.
 */
export const KNOWN_GALAXY_ROLES = [
  'International.CNRsecretary',
  'International.AGMchair',
  'International.CNRadministrator',
  'International.Board',
  'National.Board',
  'Local.Board'
];

export class User extends Resource {
  /**
   * Username in Galaxy.
   */
  username: string;
  /**
   * Email address.
   */
  email: string;
  /**
   * First name.
   */
  firstName: string;
  /**
   * Last name.
   */
  lastName: string;
  /**
   * Section code in Galaxy.
   */
  roles: string[];
  /**
   * Section code in Galaxy.
   */
  sectionCode: string;
  /**
   * ESN Section.
   */
  section: string;
  /**
   * ESN Country.
   * @todo there's a known error from Galaxy: here is returned the Section and not the Country.
   */
  country: string;
  /**
   * The URL to the user's avatar.
   */
  avatarURL: string;

  load(x: any): void {
    super.load(x);
    this.username = this.clean(x.username, String);
    this.email = this.clean(x.email, String);
    this.firstName = this.clean(x.firstName, String);
    this.lastName = this.clean(x.lastName, String);
    this.roles = this.cleanArray(x.roles, String);
    this.sectionCode = this.clean(x.sectionCode, String);
    this.section = this.clean(x.section, String);
    this.country = this.clean(x.country, String);
    this.avatarURL = this.clean(x.avatarURL, String);
  }

  /**
   * Whether the user has administrative privileges in the platform.
   */
  isAdministrator(): boolean {
    return ADMIN_GALAXY_ROLES.some(x => this.roles.includes(x));
  }
}
