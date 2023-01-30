import { Resource } from 'idea-toolbox';

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
}
