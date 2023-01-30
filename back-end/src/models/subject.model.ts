import { Resource } from 'idea-toolbox';

/**
 * The subject of a topic.
 */
export class Subject extends Resource {
  /**
   * The ESN Galaxy username of the subject.
   */
  username: string;
  /**
   * The name of the subject.
   */
  name: string;
  /**
   * The URL to the subject's avatar.
   */
  avatarURL: string;
  /**
   * The name of the subject's ESN Section.
   */
  section?: string;
  /**
   * The name of the subject's ESN country.
   */
  country?: string;

  load(x: any): void {
    super.load(x);
    this.username = this.clean(x.username, String);
    this.name = this.clean(x.name, String);
    this.avatarURL = this.clean(x.avatarURL, String);
    if (x.section) this.section = this.clean(x.section, String);
    if (x.country) this.country = this.clean(x.country, String);
  }
}
