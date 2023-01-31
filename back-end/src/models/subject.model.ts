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
  type: SubjectTypes;
  /**
   * The name of the subject.
   */
  name: string;
  /**
   * The URL to the subject's avatar.
   */
  avatarURL?: string;
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
    if (this.type === SubjectTypes.USER) {
      this.avatarURL = this.clean(x.avatarURL, String);
      this.section = this.clean(x.section, String);
    } else {
      delete this.avatarURL;
      delete this.section;
    }
    if (this.type !== SubjectTypes.COUNTRY) {
      this.country = this.clean(x.country, String);
    } else {
      delete this.country;
    }
  }

  validate(): string[] {
    const e = super.validate();
    if (this.iE(this.id)) e.push('id');
    if (this.iE(this.type)) e.push('type');
    if (this.iE(this.name)) e.push('name');
    if (this.type === SubjectTypes.USER) {
      if (this.iE(this.section)) e.push('section');
      if (this.iE(this.country)) e.push('country');
    }
    return e;
  }

  /**
   * Get the subject's URL in ESN Galaxy.
   */
  getURL(): string {
    const BASE_URL = 'https://accounts.esn.org/';
    switch (this.type) {
      case SubjectTypes.USER:
        return BASE_URL.concat('user/', this.id);
      case SubjectTypes.COUNTRY:
        return BASE_URL.concat('country/', this.id);
      case SubjectTypes.SECTION:
        return BASE_URL.concat('section/', this.id);
    }
  }
}

/**
 * The possible type of subjects.
 */
export enum SubjectTypes {
  USER = 'USER',
  SECTION = 'SECTION',
  COUNTRY = 'COUNTRY'
}
