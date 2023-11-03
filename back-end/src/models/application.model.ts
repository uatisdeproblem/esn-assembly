import { Attachment, epochISOString, Resource } from 'idea-toolbox';

import { Opportunity } from './opportunity.model';
import { Subject } from './subject.model';

/**
 * The application of a user to an opportunity (open call).
 */
export class Application extends Resource {
  /**
   * The ID of the opportunity.
   */
  opportunityId: string;
  /**
   * The ID of the application.
   */
  applicationId: string;
  /**
   * The user applying.
   */
  subject: Subject;
  /**
   * A brief motivation of the user to apply.
   */
  motivation: string;
  /**
   * The timestamp of creation.
   */
  createdAt: epochISOString;
  /**
   * The timestamp of last update.
   */
  updatedAt?: epochISOString;
  /**
   * The attachments to the application, based on the expected attachments.
   */
  attachments: Record<string, Attachment>;
  /**
   * The timestamp when the application was approved by a manager (if so).
   */
  approvedAt?: epochISOString;
  /**
   * The timestamp when the application was rejected by a manager (if so).
   */
  rejectedAt?: epochISOString;

  load(x: any): void {
    super.load(x);
    this.opportunityId = this.clean(x.opportunityId, String);
    this.applicationId = this.clean(x.applicationId, String);
    this.subject = new Subject(x.subject);
    this.motivation = this.clean(x.motivation, String);
    this.createdAt = this.clean(x.createdAt, d => new Date(d).toISOString(), new Date().toISOString());
    if (x.updatedAt) this.updatedAt = this.clean(x.updatedAt, d => new Date(d).toISOString());
    this.attachments = {};
    if (x.attachments) for (const name in x.attachments) this.attachments[name] = new Attachment(x.attachments[name]);
    if (x.approvedAt) this.approvedAt = this.clean(x.approvedAt, d => new Date(d).toISOString());
    if (x.rejectedAt) this.rejectedAt = this.clean(x.rejectedAt, d => new Date(d).toISOString());
  }

  safeLoad(newData: any, safeData: any): void {
    super.safeLoad(newData, safeData);
    this.opportunityId = safeData.opportunityId;
    this.applicationId = safeData.applicationId;
    this.subject = safeData.subject;
    this.createdAt = safeData.createdAt;
    if (safeData.updatedAt) this.updatedAt = safeData.updatedAt;
    if (safeData.approvedAt) this.approvedAt = safeData.approvedAt;
    if (safeData.rejectedAt) this.rejectedAt = safeData.rejectedAt;
  }

  validate(opportunity: Opportunity): string[] {
    const e = super.validate();
    if (this.iE(this.motivation)) e.push('motivation');
    opportunity.expectedAttachments
      .filter(ea => ea.required)
      .forEach(ea => {
        if (!this.attachments[ea.name] || this.attachments[ea.name].validate().length)
          e.push(`attachments[${ea.name}]`);
      });
    return e;
  }

  /**
   * Get the status of an application.
   */
  getStatus(): ApplicationStatuses {
    if (this.approvedAt) return ApplicationStatuses.APPROVED;
    else if (this.rejectedAt) return ApplicationStatuses.REJECTED;
    else return ApplicationStatuses.PENDING;
  }
}

/**
 * The possible statuses for an application.
 */
export enum ApplicationStatuses {
  REJECTED = -1,
  PENDING = 0,
  APPROVED = 1
}
