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

  load(x: any): void {
    super.load(x);
    this.PK = this.clean(x.PK, String);
    this.administratorsIds = this.cleanArray(x.administratorsIds, String);
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
