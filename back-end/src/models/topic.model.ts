import { Attachment, epochISOString, Resource } from 'idea-toolbox';

import { TopicCategoryAttached } from './category.model';
import { TopicEventAttached } from './event.model';
import { Subject } from './subject.model';

/**
 * A topic for a Q&A set.
 */
export class Topic extends Resource {
  /**
   * The ID of the topic.
   */
  topicId: string;
  /**
   * A brief description (title) of the topic.
   */
  name: string;
  /**
   * A full-length description of the topic (content).
   */
  description: string;
  /**
   * The event for which the topic is discussed.
   */
  event: TopicEventAttached;
  /**
   * The category that classifies the topic.
   */
  category: TopicCategoryAttached;
  /**
   * The subjects target of the topic.
   */
  subjects: Subject[];
  /**
   * The current total number of questions about this topic.
   */
  numOfQuestions: number;
  /**
   * The timestamp of creation.
   */
  createdAt: epochISOString;
  /**
   * The timestamp of last update.
   */
  updatedAt?: epochISOString;
  /**
   * The timestamp when the topic was closed.
   */
  closedAt?: epochISOString;
  /**
   * The timestamp when the topic was archived.
   */
  archivedAt?: epochISOString;
  /**
   * The attachments to the topic.
   */
  attachments: Attachment[];

  load(x: any): void {
    super.load(x);
    this.topicId = this.clean(x.topicId, String);
    this.name = this.clean(x.name, String);
    this.description = this.clean(x.description, String);
    this.event = new TopicEventAttached(x.event);
    this.category = new TopicCategoryAttached(x.category);
    this.subjects = this.cleanArray(x.subjects, s => new Subject(s));
    this.numOfQuestions = this.clean(x.numOfQuestions, Number, 0);
    this.createdAt = this.clean(x.createdAt, d => new Date(d).toISOString(), new Date().toISOString());
    if (x.updatedAt) this.updatedAt = this.clean(x.updatedAt, d => new Date(d).toISOString());
    if (x.closedAt) this.closedAt = this.clean(x.closedAt, d => new Date(d).toISOString());
    if (x.archivedAt) this.archivedAt = this.clean(x.archivedAt, d => new Date(d).toISOString());
    this.attachments = this.cleanArray(x.attachments, a => new Attachment(a));
  }

  safeLoad(newData: any, safeData: any): void {
    super.safeLoad(newData, safeData);
    this.topicId = safeData.topicId;
    this.numOfQuestions = safeData.numOfQuestions;
    this.createdAt = safeData.createdAt;
    if (safeData.updatedAt) this.updatedAt = safeData.updatedAt;
    if (safeData.closedAt) this.closedAt = safeData.closedAt;
    if (safeData.archivedAt) this.archivedAt = safeData.archivedAt;
  }

  validate(): string[] {
    const e = super.validate();
    if (this.iE(this.name)) e.push('name');
    if (this.iE(this.event?.eventId)) e.push('event');
    if (this.iE(this.category?.categoryId)) e.push('category');
    if (this.iE(this.subjects)) e.push('subjects');
    this.subjects.forEach((s, index): void => s.validate().forEach(ea => e.push(`subjects[${index}].${ea}`)));
    return e;
  }
}
