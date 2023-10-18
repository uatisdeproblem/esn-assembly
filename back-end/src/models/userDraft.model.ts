import { Resource, epochISOString } from 'idea-toolbox';
import { Question } from './question.model';
import { Answer } from './answer.model';

/**
 * The draft of a user for a question or an answer.
 */
export class UserDraft extends Resource {
  /**
   * The ID of the user owning the draft.
   */
  userId: string;
  /**
   * The ID of the draft, which equals its timestamp of creation.
   */
  draftId: epochISOString;
  /**
   * The type of draft.
   */
  type: DraftTypes;
  /**
   * In case of `DraftTypes.QUESTION`, it equals the topicId.
   * In case of `DraftTypes.ANSWER`, it equals the questionId.
   */
  refId: string;
  /**
   * The timestamp, in seconds, when the draft will expire and be automatically deleted (to clean up).
   */
  expiresAt: number;
  /**
   * A brief text summarizing the draft (if applicable).
   * Only for `DraftTypes.QUESTION`.
   * Max 100 characters.
   */
  summary?: string;
  /**
   * The full text of the draft.
   */
  text: string;

  /**
   * Create the draft for a question.
   */
  static fromQuestion(question: Question, existingDraft?: UserDraft): UserDraft {
    if (existingDraft) {
      existingDraft.summary = question.summary;
      existingDraft.text = question.text;
      return existingDraft;
    } else
      return new UserDraft({
        type: DraftTypes.QUESTION,
        refId: question.topicId,
        summary: question.summary,
        text: question.text
      });
  }
  /**
   * Create the draft for an answer.
   */
  static fromAnswer(answer: Answer, existingDraft?: UserDraft): UserDraft {
    if (existingDraft) {
      existingDraft.text = answer.text;
      return existingDraft;
    } else return new UserDraft({ type: DraftTypes.ANSWER, refId: answer.questionId, text: answer.text });
  }

  load(x: any): void {
    super.load(x);
    this.userId = this.clean(x.userId, String);
    this.draftId = this.clean(x.draftId, t => new Date(t).toISOString());
    this.type = this.clean(x.type, String);
    this.refId = this.clean(x.refId, String);
    this.expiresAt = this.clean(x.expiresAt, Number);
    if (x.summary) this.summary = this.clean(x.summary, String);
    this.text = this.clean(x.text, String);
  }

  safeLoad(newData: any, safeData: any): void {
    super.safeLoad(newData, safeData);
    this.userId = safeData.userId;
    this.draftId = safeData.draftId;
    this.type = safeData.type;
    this.refId = safeData.refId;
    this.expiresAt = safeData.expiresAt;
  }

  validate(): string[] {
    const e = super.validate();
    if (!Object.keys(DraftTypes).includes(this.type)) e.push('type');
    if (this.iE(this.refId)) e.push('refId');
    if (this.type === DraftTypes.QUESTION && this.iE(this.summary)) e.push('summary');
    if (this.iE(this.text)) e.push('text');
    return e;
  }
}

/**
 * The types of draft.
 */
export enum DraftTypes {
  QUESTION = 'QUESTION',
  ANSWER = 'ANSWER'
}
