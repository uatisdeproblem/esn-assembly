import { Attachment, epochISOString, Resource } from 'idea-toolbox';

import { TopicCategoryAttached } from './category.model';
import { TopicEventAttached } from './event.model';
import { FAVORITE_TIMEZONE, dateStringIsFuture, dateStringIsPast } from './favoriteTimezone.const';
import { Subject } from './subject.model';
import { User, UserRoles } from './user.model';

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
  content: string;
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
   * The timestamp since when the topic is considered published.
   * If not set, it's a draft; drafts are displayed only to administrators.
   * If set in the future, it means the publishing has been scheduled.
   */
  publishedSince?: string;
  /**
   * The timestamp when the topic will close. Note: it's a sparse index for queries.
   */
  willCloseAt?: epochISOString;
  /**
   * The timestamp when the topic was closed. A topic which is closed cannot accept new questions.
   */
  closedAt?: epochISOString;
  /**
   * The timestamp until answers can still be posted (if allowed).
   * If not set, answers can be created until the topic is archived.
   */
  acceptAnswersUntil?: epochISOString;
  /**
   * The timestamp when the topic was archived. A topic archived is also closed.
   */
  archivedAt?: epochISOString;
  /**
   * The attachments to the topic.
   */
  attachments: Attachment[];
  /**
   * To be able to ask questions, a user must have at least a role (ESN Accounts) included in this list.
   * An empty string means that any user (regardless the role) can ask questions.
   */
  rolesAbleToAskQuestions: UserRoles[];

  load(x: any): void {
    super.load(x);
    this.topicId = this.clean(x.topicId, String);
    this.name = this.clean(x.name, String);
    this.content = this.clean(x.content, String);
    this.event = new TopicEventAttached(x.event);
    this.category = new TopicCategoryAttached(x.category);
    this.subjects = this.cleanArray(x.subjects, s => new Subject(s));
    this.numOfQuestions = this.clean(x.numOfQuestions, Number, 0);
    this.createdAt = this.clean(x.createdAt, d => new Date(d).toISOString(), new Date().toISOString());
    if (x.updatedAt) this.updatedAt = this.clean(x.updatedAt, d => new Date(d).toISOString());
    if (x.publishedSince) this.publishedSince = this.clean(x.publishedSince, d => new Date(d).toISOString());
    else delete this.publishedSince;
    if (x.willCloseAt) this.willCloseAt = this.clean(x.willCloseAt, d => new Date(d).toISOString());
    else delete this.willCloseAt;
    if (x.acceptAnswersUntil)
      this.acceptAnswersUntil = this.clean(x.acceptAnswersUntil, d => new Date(d).toISOString());
    else delete this.acceptAnswersUntil;
    if (x.closedAt) this.closedAt = this.clean(x.closedAt, d => new Date(d).toISOString());
    if (x.archivedAt) this.archivedAt = this.clean(x.archivedAt, d => new Date(d).toISOString());
    this.attachments = this.cleanArray(x.attachments, a => new Attachment(a));
    this.rolesAbleToAskQuestions = this.cleanArray(x.rolesAbleToAskQuestions, String);
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
    if (this.publishedSince && this.iE(this.publishedSince, 'date')) e.push('publishedSince');
    if (this.willCloseAt && (this.iE(this.willCloseAt, 'date') || this.willCloseAt < new Date().toISOString()))
      e.push('willCloseAt');
    if (
      this.acceptAnswersUntil &&
      (this.iE(this.acceptAnswersUntil, 'date') || (this.willCloseAt && this.acceptAnswersUntil < this.willCloseAt))
    )
      e.push('acceptAnswersUntil');
    if (this.iE(this.subjects)) e.push('subjects');
    this.subjects.forEach((s, index): void => s.validate().forEach(ea => e.push(`subjects[${index}].${ea}`)));
    return e;
  }

  /**
   * Whether the user is allowed to ask questions on the topic.
   */
  canUserAskQuestions(user: User): boolean {
    if (this.isClosed()) return false;
    if (!this.rolesAbleToAskQuestions.length) return true;
    return User.isAllowedBasedOnRoles(user, this.rolesAbleToAskQuestions);
  }
  /**
   * Whether the user is allowed to answer questions on the topic.
   */
  canUserAnswerQuestions(user: User, excludeAdmin = false): boolean {
    const timeCheck = !this.acceptAnswersUntil || dateStringIsFuture(this.acceptAnswersUntil, FAVORITE_TIMEZONE);
    const adminCheck = user.isAdministrator && !excludeAdmin;
    const subjectCheck = this.subjects.some(s => s.id === user.userId);
    return !this.isArchived() && timeCheck && (adminCheck || subjectCheck);
  }

  /**
   * Whether the topic is a draft (hence visible only to administrators); otherwise, it's considered published.
   */
  isDraft(): boolean {
    return !this.publishedSince || dateStringIsFuture(this.publishedSince, FAVORITE_TIMEZONE);
  }

  /**
   * Whether the topic is closed (extra check since this operation could be automated).
   */
  isClosed(): boolean {
    if (this.isArchived()) return true;
    return !!this.closedAt || (this.willCloseAt && dateStringIsPast(this.willCloseAt, FAVORITE_TIMEZONE));
  }
  /**
   * Whether the topic is archived.
   */
  isArchived(): boolean {
    return !!this.archivedAt;
  }
}

/**
 * A link between two topics. Note: there are always two rows representing the relation (two-way).
 */
export interface RelatedTopic {
  topicA: string;
  topicB: string;
  relation: RelatedTopicRelations;
}

/**
 * The possible relations between topics.
 */
export enum RelatedTopicRelations {
  LINK = 'LINK'
}
