import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

import { Topic } from '@models/topic.model';
import { Question } from '@models/question.model';

@Injectable({ providedIn: 'root' })
export class QuestionsService {
  private questions: Question[];

  /**
   * The number of questions to consider for the pagination, when active.
   */
  MAX_PAGE_SIZE = 24;

  constructor(private api: IDEAApiService) {}

  /**
   * Load the questions in a topic from the back-end.
   */
  private async loadListOfTopic(topic: Topic): Promise<void> {
    const questions: Question[] = await this.api.getResource(['topics', topic.topicId, 'questions']);
    this.questions = questions.map(x => new Question(x));
  }
  /**
   * Get (and optionally filter) the list of questions in a topic.
   * Note: it's a slice of the array.
   */
  async getListOfTopic(
    topic: Topic,
    options: {
      force?: boolean;
      search?: string;
      withPagination?: boolean;
      startPaginationAfterId?: string;
    } = {}
  ): Promise<Question[]> {
    if (!this.questions || options.force) await this.loadListOfTopic(topic);
    if (!this.questions) return null;

    options.search = options.search ? String(options.search).toLowerCase() : '';

    let filteredList = this.questions.slice();

    if (options.search)
      filteredList = filteredList.filter(x =>
        options.search
          .split(' ')
          .every(searchTerm =>
            [x.summary, x.text, x.creator.name, x.creator.section, x.creator.country]
              .filter(f => f)
              .some(f => f.toLowerCase().includes(searchTerm))
          )
      );

    if (options.withPagination && filteredList.length > this.MAX_PAGE_SIZE) {
      let indexOfLastOfPreviousPage = 0;
      if (options.startPaginationAfterId)
        indexOfLastOfPreviousPage = filteredList.findIndex(x => x.questionId === options.startPaginationAfterId) || 0;
      filteredList = filteredList.slice(0, indexOfLastOfPreviousPage + this.MAX_PAGE_SIZE);
    }

    return filteredList;
  }

  /**
   * Get a topic's question by its id.
   */
  async getById(topic: Topic, questionId: string): Promise<Question> {
    const path = ['topics', topic.topicId, 'questions', questionId];
    return new Question(await this.api.getResource(path));
  }

  /**
   * Insert a question in a topic.
   */
  async insert(topic: Topic, question: Question): Promise<Question> {
    const path = ['topics', topic.topicId, 'questions'];
    return new Question(await this.api.postResource(path, { body: question }));
  }

  /**
   * Update a question.
   */
  async update(topic: Topic, question: Question): Promise<Question> {
    const path = ['topics', topic.topicId, 'questions', question.questionId];
    return new Question(await this.api.putResource(path, { body: question }));
  }

  /**
   * Upvote a question.
   */
  async upvote(topic: Topic, question: Question): Promise<void> {
    const path = ['topics', topic.topicId, 'questions', question.questionId];
    await this.api.patchResource(path, { body: { action: 'UPVOTE' } });
  }
  /**
   * Cancel the upvote to a question.
   */
  async upvoteCancel(topic: Topic, question: Question): Promise<void> {
    const path = ['topics', topic.topicId, 'questions', question.questionId];
    await this.api.patchResource(path, { body: { action: 'UPVOTE_CANCEL' } });
  }
  /**
   * Whether the current user upvoted the question.
   */
  async userHasUpvoted(topic: Topic, question: Question): Promise<boolean> {
    const path = ['topics', topic.topicId, 'questions', question.questionId];
    const { upvoted } = await this.api.patchResource(path, { body: { action: 'IS_UPVOTED' } });
    return upvoted;
  }

  /**
   * Delete a question.
   */
  async delete(topic: Topic, question: Question): Promise<void> {
    const path = ['topics', topic.topicId, 'questions', question.questionId];
    await this.api.deleteResource(path);
  }
}
