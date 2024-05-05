import { Attachment, epochISOString, Resource } from 'idea-toolbox';

import { TopicCategoryAttached } from './category.model';
import { GAEventAttached } from './event.model';
import { Subject } from './subject.model';
import { User, UserRoles } from './user.model';

/**
 * A topic for a Q&A set. It could be standard or live.
 */
export class Topic extends Resource {
  /**
   * The ID of the topic.
   */
  topicId: string;
  /**
   * The type of topic.
   */
  type: TopicTypes;
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
  event: GAEventAttached;
  /**
   * The category that classifies the topic.
   */
  category: TopicCategoryAttached;
  /**
   * The subjects target of the topic.
   */
  subjects: Subject[];
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
   * The timestamp when the topic was closed. A topic which is closed cannot accept new interactions.
   * Note: `TopicTypes.LIVE` topics are closed when they are created and opened when needed.
   */
  closedAt?: epochISOString;
  /**
   * The timestamp when the topic was archived. A topic archived is also closed.
   */
  archivedAt?: epochISOString;
  /**
   * The attachments to the topic.
   */
  attachments: Attachment[];
  /**
   * To be able to interact, a user must have at least a role (ESN Accounts) included in this list.
   * An empty string means that any user (regardless the role) can interact.
   */
  rolesAbleToInteract: UserRoles[];

  /**
   * The current total number of standard questions about this topic.
   * Only for `TopicTypes.STANDARD`.
   */
  numOfQuestions?: number;
  /**
   * The timestamp until answers to standard questions can still be posted (if allowed).
   * If not set, answers can be created until the topic is archived.
   * Only for `TopicTypes.STANDARD`.
   */
  acceptAnswersUntil?: epochISOString;

  /**
   * Whether messages (`MessageTypes.QUESTION`) for this topic must be signed.
   * Only for `TopicTypes.LIVE`.
   */
  mustBeSigned?: boolean;
  /**
   * Whether to enable live appreciations for this topic.
   * Only for `TopicTypes.LIVE`.
   */
  appreciations?: boolean;
  /**
   * The timestamp when the topic should be live. It's a reference date for sortings, but not used as a mechanism.
   * Only for `TopicTypes.LIVE`.
   */
  shouldBeLiveAt?: epochISOString;

  load(x: any): void {
    super.load(x);
    this.topicId = this.clean(x.topicId, String);
    this.type = this.clean(x.type, String, TopicTypes.STANDARD);
    this.name = this.clean(x.name, String);
    this.content = this.clean(x.content, String);
    this.event = new GAEventAttached(x.event);
    this.category = new TopicCategoryAttached(x.category);
    this.subjects = this.cleanArray(x.subjects, s => new Subject(s));
    this.createdAt = this.clean(x.createdAt, d => new Date(d).toISOString(), new Date().toISOString());
    if (x.updatedAt) this.updatedAt = this.clean(x.updatedAt, d => new Date(d).toISOString());
    if (x.publishedSince) this.publishedSince = this.clean(x.publishedSince, d => new Date(d).toISOString());
    else delete this.publishedSince;
    if (x.willCloseAt) this.willCloseAt = this.clean(x.willCloseAt, d => new Date(d).toISOString());
    else delete this.willCloseAt;
    if (x.closedAt) this.closedAt = this.clean(x.closedAt, d => new Date(d).toISOString());
    if (x.archivedAt) this.archivedAt = this.clean(x.archivedAt, d => new Date(d).toISOString());
    this.attachments = this.cleanArray(x.attachments, a => new Attachment(a));
    this.rolesAbleToInteract = this.cleanArray(x.rolesAbleToInteract, String);

    if (this.type === TopicTypes.STANDARD) {
      this.numOfQuestions = this.clean(x.numOfQuestions, Number, 0);
      if (x.acceptAnswersUntil)
        this.acceptAnswersUntil = this.clean(x.acceptAnswersUntil, d => new Date(d).toISOString());
      else delete this.acceptAnswersUntil;
    } else if (this.type === TopicTypes.LIVE) {
      this.mustBeSigned = this.clean(x.mustBeSigned, Boolean, true);
      this.appreciations = this.clean(x.appreciations, Boolean);
      this.shouldBeLiveAt = this.clean(x.shouldBeLiveAt, d => new Date(d).toISOString());
    }
  }

  safeLoad(newData: any, safeData: any): void {
    super.safeLoad(newData, safeData);
    this.topicId = safeData.topicId;
    this.type = safeData.type;
    this.createdAt = safeData.createdAt;
    if (safeData.updatedAt) this.updatedAt = safeData.updatedAt;
    if (safeData.closedAt) this.closedAt = safeData.closedAt;
    if (safeData.archivedAt) this.archivedAt = safeData.archivedAt;

    this.numOfQuestions = safeData.numOfQuestions;
  }

  validate(): string[] {
    const e = super.validate();
    if (this.iE(this.name)) e.push('name');
    if (!Object.values(TopicTypes).includes(this.type)) e.push('type');
    if (this.iE(this.event?.eventId)) e.push('event');
    if (this.iE(this.category?.categoryId)) e.push('category');
    if (this.type === TopicTypes.STANDARD && this.iE(this.subjects)) e.push('subjects');
    this.subjects.forEach((s, index): void => s.validate().forEach(ea => e.push(`subjects[${index}].${ea}`)));
    if (this.publishedSince && this.iE(this.publishedSince, 'date')) e.push('publishedSince');
    if (this.willCloseAt && (this.iE(this.willCloseAt, 'date') || this.willCloseAt < new Date().toISOString()))
      e.push('willCloseAt');

    if (this.type === TopicTypes.STANDARD) {
      if (
        this.acceptAnswersUntil &&
        (this.iE(this.acceptAnswersUntil, 'date') || (this.willCloseAt && this.acceptAnswersUntil < this.willCloseAt))
      )
        e.push('acceptAnswersUntil');
    }

    return e;
  }

  /**
   * Whether the user is allowed to ask questions/post messages on the topic.
   */
  canUserInteract(user: User): boolean {
    if (this.isClosed()) return false;
    if (!this.rolesAbleToInteract.length) return true;
    return User.isAllowedBasedOnRoles(user, this.rolesAbleToInteract);
  }
  /**
   * Whether the user is allowed to answer questions on the topic.
   * Only for `TopicTypes.STANDARD`.
   */
  canUserAnswerStandardQuestions(user: User, excludeAdmin = false): boolean {
    if (this.type !== TopicTypes.STANDARD) return false;

    const timeCheck = !this.acceptAnswersUntil || this.acceptAnswersUntil > new Date().toISOString();
    const adminCheck = user.isAdministrator && !excludeAdmin;
    const subjectCheck = this.subjects.some(s => s.id === user.userId);
    return !this.isArchived() && timeCheck && (adminCheck || subjectCheck);
  }

  /**
   * Whether the topic is a draft (hence visible only to administrators); otherwise, it's considered published.
   */
  isDraft(): boolean {
    return !this.publishedSince || this.publishedSince > new Date().toISOString();
  }

  /**
   * Whether the topic is closed (extra check since this operation could be automated).
   */
  isClosed(): boolean {
    if (this.isArchived()) return true;
    return !!this.closedAt || (this.willCloseAt && this.willCloseAt < new Date().toISOString());
  }
  /**
   * Whether the topic is archived.
   */
  isArchived(): boolean {
    return !!this.archivedAt;
  }

  /**
   * Whether the topic will be live in the future or is live today.
   * Only for `TopicTypes.STANDARD`.
   */
  isLiveTodayOrInFuture(): boolean {
    if (this.type !== TopicTypes.LIVE) return false;
    return this.shouldBeLiveAt && this.shouldBeLiveAt.slice(0, 10) >= new Date().toISOString().slice(0, 10);
  }
}

/**
 * The types of topic.
 */
export enum TopicTypes {
  STANDARD = 'STANDARD',
  LIVE = 'LIVE'
}

/**
 * A summary, exportable version for a standard topic (and its questions and answers).
 */
export interface StandardTopicQuestionsExportable {
  Topic: string;
  Category: string;
  Subjects: string;
  Summary: string;
  Question: string;
  Creator: string;
  Answers: string;
}
