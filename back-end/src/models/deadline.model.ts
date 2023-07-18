import { epochISOString, Resource } from 'idea-toolbox';

/**
 * A deadline to let the users know of what they should do next.
 */
export class Deadline extends Resource {
  /**
   * The ID of the deadline.
   */
  deadlineId: string;
  /**
   * The title of the deadline.
   */
  name: string;
  /**
   * The date and time for the deadline.
   */
  at: epochISOString;

  load(x: any): void {
    super.load(x);
    this.deadlineId = this.clean(x.deadlineId, String);
    this.name = this.clean(x.name, String);
    this.at = this.clean(x.at, d => new Date(d).toISOString());
  }

  safeLoad(newData: any, safeData: any): void {
    super.safeLoad(newData, safeData);
    this.deadlineId = safeData.deadlineId;
  }

  validate(): string[] {
    const e = super.validate();
    if (this.iE(this.name)) e.push('name');
    if (this.iE(this.at, 'date')) e.push('at');
    return e;
  }
}
