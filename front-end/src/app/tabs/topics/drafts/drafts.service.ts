import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

import { UserDraft } from '@models/userDraft.model';
import { Topic } from '@models/topic.model';
import { Question } from '@models/question.model';

@Injectable({ providedIn: 'root' })
export class UserDraftsService {
  constructor(private api: IDEAApiService) {}

  /**
   * Get the user's drafted questions for a topic.
   */
  async getQuestionsOfTopic(topic: Topic): Promise<UserDraft[]> {
    const params = { topicId: topic.topicId };
    const drafts: UserDraft[] = await this.api.getResource('drafts', { params });
    return drafts.map(x => new UserDraft(x));
  }
  /**
   * Get the user's drafted answer for a question.
   */
  async getAnswerOfQuestion(question: Question): Promise<UserDraft> {
    const params = { questionId: question.questionId };
    const drafts: UserDraft[] = await this.api.getResource('drafts', { params });
    return drafts.map(x => new UserDraft(x))[0];
  }

  /**
   * Get a draft by its id.
   */
  async getById(draftId: string): Promise<UserDraft> {
    return new UserDraft(await this.api.getResource(['drafts', draftId]));
  }

  /**
   * Insert a draft.
   */
  async insert(draft: UserDraft): Promise<UserDraft> {
    return new UserDraft(await this.api.postResource('drafts', { body: draft }));
  }

  /**
   * Update a draft.
   */
  async update(draft: UserDraft): Promise<UserDraft> {
    return new UserDraft(await this.api.putResource(['drafts', draft.draftId], { body: draft }));
  }

  /**
   * Delete a draft.
   */
  async delete(draft: UserDraft): Promise<void> {
    await this.api.deleteResource(['drafts', draft.draftId]);
  }
}
