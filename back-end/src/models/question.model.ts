import { epochISOString, Resource } from 'idea-toolbox';

import { Subject } from './subject.model';

/**
 * A question regarding a topic.
 */
export class Question extends Resource {
  /**
   * The ID of the topic to which the question is related.
   */
  topicId: string;
  /**
   * The ID of the question.
   */
  questionId: string;
  /**
   * A brief text summarizing the question.
   * Max 100 characters.
   */
  summary: string;
  /**
   * The full text representing the question.
   */
  text: string;
  /**
   * The creator of the question.
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
  /**
   * The total number of messages for the question.
   */
  numOfMessages: number;
  /**
   * The number of upvotes for the question.
   */
  numOfUpvotes: number;

  load(x: any): void {
    super.load(x);
    this.topicId = this.clean(x.topicId, String);
    this.questionId = this.clean(x.questionId, String);
    this.summary = this.clean(x.summary, String)?.slice(0, 100);
    this.text = this.clean(x.text, String);
    this.creator = new Subject(x.creator);
    this.createdAt = this.clean(x.createdAt, d => new Date(d).toISOString(), new Date().toISOString());
    if (x.updatedAt) this.updatedAt = this.clean(x.updatedAt, d => new Date(d).toISOString());
    this.numOfMessages = this.clean(x.numOfMessages, Number, 0);
    this.numOfUpvotes = this.clean(x.numOfUpvotes, Number, 0);
  }

  safeLoad(newData: any, safeData: any): void {
    super.safeLoad(newData, safeData);
    this.topicId = safeData.topicId;
    this.questionId = safeData.questionId;
    this.creator = safeData.creator;
    this.createdAt = safeData.createdAt;
    if (safeData.updatedAt) this.updatedAt = safeData.updatedAt;
    this.numOfMessages = safeData.numOfMessages;
    this.numOfUpvotes = safeData.numOfUpvotes;
  }

  validate(): string[] {
    const e = super.validate();
    if (this.iE(this.summary)) e.push('summary');
    if (this.creator.validate().length) e.push('creator');
    return e;
  }
}

/**
 * A message (answer, comment, etc.) related to a question.
 */
export class QuestionMessage extends Resource {
  /**
   * The ID of the question to which the message is related.
   */
  questionId: string;
  /**
   * The ID of the message.
   */
  messageId: string;
  /**
   * The full text of the message.
   */
  text: string;
  /**
   * The creator of the message.
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
    this.messageId = this.clean(x.messageId, String);
    this.text = this.clean(x.text, String);
    this.creator = new Subject(x.creator);
    this.createdAt = this.clean(x.createdAt, d => new Date(d).toISOString(), new Date().toISOString());
    if (x.updatedAt) this.updatedAt = this.clean(x.updatedAt, d => new Date(d).toISOString());
  }

  safeLoad(newData: any, safeData: any): void {
    super.safeLoad(newData, safeData);
    this.questionId = safeData.questionId;
    this.messageId = safeData.messageId;
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
}
