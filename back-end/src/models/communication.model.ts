import { epochISOString, Resource } from 'idea-toolbox';

import { GAEventAttached } from './event.model';

/**
 * A communication intended as news.
 */
export class Communication extends Resource {
  /**
   * The ID of the communication.
   */
  communicationId: string;
  /**
   * The title of the communication.
   */
  name: string;
  /**
   * The subtitle of the communication (brief description).
   */
  brief: string;
  /**
   * The full-length content of the communication.
   */
  content: string;
  /**
   * The date (and time) of the communication.
   */
  date: epochISOString;
  /**
   * The URL to the communication's image (if any).
   */
  imageURL: string | null;
  /**
   * The event to which the communication refers to (if any).
   */
  event: GAEventAttached | null;
  /**
   * The timestamp when the communication was archived (if so).
   */
  archivedAt?: epochISOString;

  load(x: any): void {
    super.load(x);
    this.communicationId = this.clean(x.communicationId, String);
    this.name = this.clean(x.name, String);
    this.brief = this.clean(x.brief, String);
    this.content = this.clean(x.content, String);
    this.date = this.clean(x.date, d => new Date(d).toISOString(), new Date().toISOString());
    this.imageURL = this.clean(x.imageURL, String);
    this.event = x.event?.eventId ? new GAEventAttached(x.event) : null;
    if (x.archivedAt) this.archivedAt = this.clean(x.archivedAt, d => new Date(d).toISOString());
  }

  safeLoad(newData: any, safeData: any): void {
    super.safeLoad(newData, safeData);
    this.communicationId = safeData.communicationId;
    if (safeData.archivedAt) this.archivedAt = safeData.archivedAt;
  }

  validate(): string[] {
    const e = super.validate();
    if (this.iE(this.name)) e.push('name');
    if (this.iE(this.content)) e.push('content');
    if (this.iE(this.date, 'date')) e.push('date');
    return e;
  }

  /**
   * Whether the communication is archived.
   */
  isArchived(): boolean {
    return !!this.archivedAt;
  }
}
