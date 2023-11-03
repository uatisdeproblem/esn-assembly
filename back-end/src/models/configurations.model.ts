import { Resource } from 'idea-toolbox';

/**
 * The platform's configuations.
 */
export class Configurations extends Resource {
  /**
   * A fixed string, to identify the configurations.
   */
  PK: string;
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

  load(x: any): void {
    super.load(x);
    this.PK = this.clean(x.PK, String);
    this.administratorsIds = this.cleanArray(x.administratorsIds, String).map(x => x.toLowerCase());
    this.opportunitiesManagersIds = this.cleanArray(x.opportunitiesManagersIds, String).map(x => x.toLowerCase());
    this.bannedUsersIds = this.cleanArray(x.bannedUsersIds, String).map(x => x.toLowerCase());
  }

  safeLoad(newData: any, safeData: any): void {
    super.safeLoad(newData, safeData);
    this.PK = safeData.PK;
  }

  validate(): string[] {
    const e = super.validate();
    if (this.iE(this.administratorsIds)) e.push('administratorsIds');
    return e;
  }
}
