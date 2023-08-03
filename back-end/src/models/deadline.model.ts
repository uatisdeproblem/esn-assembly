import { epochISOString, Resource } from 'idea-toolbox';

import { GAEventAttached } from './event.model';

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
  /**
   * The event to which the deadline refers to (if any).
   */
  event: GAEventAttached | null;
  /**
   * A descriptive field to help users identify the target group/people of the deadline (if any).
   */
  target: string | null;
  /**
   * A descriptive field to help users identify the kind of action related to the deadline (if any).
   */
  action: string | null;
  /**
   * A color to help users visually understand the kind of action related to the deadline (if any).
   */
  actionColor: string | null;

  load(x: any): void {
    super.load(x);
    this.deadlineId = this.clean(x.deadlineId, String);
    this.name = this.clean(x.name, String);
    this.at = this.clean(x.at, d => new Date(d).toISOString());
    this.event = x.event?.eventId ? new GAEventAttached(x.event) : null;
    this.target = this.clean(x.target, String);
    this.action = this.clean(x.action, String);
    this.actionColor = this.clean(x.actionColor, String);
  }

  safeLoad(newData: any, safeData: any): void {
    super.safeLoad(newData, safeData);
    this.deadlineId = safeData.deadlineId;
  }

  validate(): string[] {
    const e = super.validate();
    if (this.iE(this.name)) e.push('name');
    if (this.iE(this.at, 'date') || this.at < new Date().toISOString()) e.push('at');
    return e;
  }
}
