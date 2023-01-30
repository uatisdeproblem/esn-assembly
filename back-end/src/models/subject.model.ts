import { Resource } from 'idea-toolbox';

/**
 * The subject of a topic.
 */
export class Subject extends Resource {
  /**
   * The ESN Galaxy ID of the subject.
   */
  id: string;
  /**
   * The type of subject.
   */
  type: SubjectType;
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
    this.id = this.clean(x.id, String);
    this.type = this.clean(x.type, String);
    this.name = this.clean(x.name, String);
    this.avatarURL = this.clean(x.avatarURL, String);
    if (this.type === SubjectType.USER) {
      if (x.section) this.section = this.clean(x.section, String);
      if (x.country) this.country = this.clean(x.country, String);
    }
  }

  validate(): string[] {
    const e = super.validate();
    if (this.iE(this.id)) e.push('id');
    if (this.iE(this.type)) e.push('type');
    if (this.iE(this.name)) e.push('name');
    if (this.type === SubjectType.USER) {
      if (this.iE(this.section)) e.push('section');
      if (this.iE(this.country)) e.push('country');
    }
    return e;
  }
}

/**
 * The possible type of subjects.
 */
export enum SubjectType {
  USER = 'USER',
  SECTION = 'SECTION',
  COUNTRY = 'COUNTRY'
}
