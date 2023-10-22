import { epochISOString, Resource } from 'idea-toolbox';

import { Topic } from './topic.model';
import { Subject } from './subject.model';
import { FAVORITE_TIMEZONE, getDateStringInFavoriteTimezone } from './favoriteTimezone.const';

/**
 * A message (question or appreciation) in a live topic.
 */
export class Message extends Resource {
  /**
   * The ID of the topic to which the message is related.
   */
  topicId: string;
  /**
   * The ID of the message: the concatenation of the timestamp (timezone-independent) of creation and `userId`.
   */
  messageId: string;
  /**
   * The type of message.
   */
  type: MessageTypes;
  /**
   * A brief text summarizing the message.
   * Max 100 characters.
   * Only for `MessageTypes.QUESTION`.
   */
  summary?: string;
  /**
   * The full text of the message.
   */
  text: string;
  /**
   * The creator of the message or `null`, if anonymus.
   */
  creator: Subject | null;
  /**
   * The timestamp of creation.
   */
  createdAt: epochISOString;
  /**
   * The number of upvotes for the message.
   */
  numOfUpvotes: number;

  static getPK(userId: string): string {
    const timestamp = getDateStringInFavoriteTimezone(new Date(), FAVORITE_TIMEZONE, true);
    return [timestamp, userId].join('_');
  }

  load(x: any): void {
    super.load(x);
    this.topicId = this.clean(x.topicId, String);
    this.messageId = this.clean(x.messageId, String);
    this.type = this.clean(x.type, String);
    if (x.summary) this.summary = this.clean(x.summary, String)?.slice(0, 100);
    this.text = this.clean(x.text, String);
    this.creator = x.creator ? new Subject(x.creator) : null;
    this.createdAt = this.clean(x.createdAt, d => new Date(d).toISOString(), new Date().toISOString());
    this.numOfUpvotes = this.clean(x.numOfUpvotes, Number, 0);
  }

  safeLoad(newData: any, safeData: any): void {
    super.safeLoad(newData, safeData);
    this.topicId = safeData.topicId;
    this.type = safeData.type;
    this.messageId = safeData.messageId;
    this.creator = safeData.creator;
    this.createdAt = safeData.createdAt;
    this.numOfUpvotes = safeData.numOfUpvotes;
  }

  validate(topic: Topic): string[] {
    const e = super.validate();
    if (!Object.values(MessageTypes).includes(this.type)) e.push('type');
    if (this.type === MessageTypes.QUESTION && this.iE(this.summary)) e.push('summary');
    if (this.type === MessageTypes.APPRECIATION && this.iE(this.text)) e.push('text');
    if (this.type === MessageTypes.QUESTION && topic.mustBeSigned && this.creator.validate().length) e.push('creator');
    return e;
  }
}

/**
 * The act of upvoting a message.
 */
export class MessageUpvote extends Resource {
  /**
   * The ID of the message.
   */
  messageId: string;
  /**
   * The ID of the user who upvoted.
   */
  userId: string;
  /**
   * The data of the user who upvoted.
   */
  creator: Subject;
  /**
   * The timestamp of creation of the upvote.
   */
  createdAt: epochISOString;

  load(x: any): void {
    super.load(x);
    this.messageId = this.clean(x.messageId, String);
    this.userId = this.clean(x.userId, String);
    this.creator = new Subject(x.creator);
    this.createdAt = this.clean(x.createdAt, d => new Date(d).toISOString(), new Date().toISOString());
  }
}

/**
 * The type of messages in a live topic.
 */
export enum MessageTypes {
  QUESTION = 'QUESTION',
  APPRECIATION = 'APPRECIATION'
}
