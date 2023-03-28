import { epochISOString, Resource } from 'idea-toolbox';

import { FAVORITE_TIMEZONE, dateStringIsFuture } from './favoriteTimezone.const';
import { Subject } from './subject.model';
import { Topic } from './topic.model';
import { User } from './user.model';

/**
 * An answer to a question.
 */
export class Answer extends Resource {
  /**
   * The ID of the question to which the answer is related.
   */
  questionId: string;
  /**
   * The ID of the answer.
   */
  answerId: string;
  /**
   * The full text of the answer.
   */
  text: string;
  /**
   * The creator of the answer.
   */
  creator: Subject;
  /**
   * The timestamp of creation.
   */
  createdAt: epochISOString;
  /**
   * The timestamp of last update.
   */
  updatedAt?: epochISOString;

  load(x: any): void {
    super.load(x);
    this.questionId = this.clean(x.questionId, String);
    this.answerId = this.clean(x.answerId, String);
    this.text = this.clean(x.text, String);
    this.creator = new Subject(x.creator);
    this.createdAt = this.clean(x.createdAt, d => new Date(d).toISOString(), new Date().toISOString());
    if (x.updatedAt) this.updatedAt = this.clean(x.updatedAt, d => new Date(d).toISOString());
  }

  safeLoad(newData: any, safeData: any): void {
    super.safeLoad(newData, safeData);
    this.questionId = safeData.questionId;
    this.answerId = safeData.answerId;
    this.creator = safeData.creator;
    this.createdAt = safeData.createdAt;
    if (safeData.updatedAt) this.updatedAt = safeData.updatedAt;
  }

  validate(): string[] {
    const e = super.validate();
    if (this.iE(this.text)) e.push('text');
    if (this.creator.validate().length) e.push('creator');
    return e;
  }

  /**
   * Whether the user is allowed to edit the answer.
   */
  canUserEdit(topic: Topic, user: User, excludeAdmin = false): boolean {
    const timeCheck = !topic.acceptAnswersUntil || dateStringIsFuture(topic.acceptAnswersUntil, FAVORITE_TIMEZONE);
    const adminCheck = user.isAdministrator && !excludeAdmin;
    const creatorCheck = user.userId === this.creator.id;
    return !topic.isArchived() && timeCheck && (adminCheck || creatorCheck);
  }
}
