import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';

import { Topic } from '@models/topic.model';
import { Question } from '@models/question.model';
import { Subject } from '@models/subject.model';

@Injectable({ providedIn: 'root' })
export class QuestionsService {
  private questions: Question[];

  /**
   * The number of questions to consider for the pagination, when active.
   */
  MAX_PAGE_SIZE = 24;

  constructor(private api: IDEAApiService, private app: AppService) {}

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
    const path = ['topics', topic.topicId, 'questions', question.questionId, 'upvotes'];
    await this.api.postResource(path);
  }
  /**
   * Cancel the upvote to a question.
   */
  async upvoteCancel(topic: Topic, question: Question): Promise<void> {
    const path = ['topics', topic.topicId, 'questions', question.questionId, 'upvotes'];
    await this.api.deleteResource(path);
  }
  /**
   * Whether the current user upvoted the question.
   */
  async userHasUpvoted(topic: Topic, question: Question): Promise<boolean> {
    const path = ['topics', topic.topicId, 'questions', question.questionId, 'upvotes', this.app.user.userId];
    const { upvoted } = await this.api.getResource(path);
    return upvoted;
  }
  /**
   * Get the users who upvoted the question (latest first).
   */
  async getUpvoters(topic: Topic, question: Question): Promise<Subject[]> {
    const path = ['topics', topic.topicId, 'questions', question.questionId, 'upvotes'];
    const subjects: Subject[] = await this.api.getResource(path);
    return subjects.map(x => new Subject(x));
  }
  /**
   * Get the answers (to the question) for which the user clapped.
   */
  async userClaps(topic: Topic, question: Question): Promise<{ [answerId: string]: boolean }> {
    const path = ['topics', topic.topicId, 'questions', question.questionId];
    const answersIds: string[] = await this.api.patchResource(path, { body: { action: 'USER_CLAPS' } });
    const clapMap = {};
    answersIds.forEach(a => (clapMap[a] = true));
    return clapMap;
  }

  /**
   * Delete a question.
   */
  async delete(topic: Topic, question: Question): Promise<void> {
    const path = ['topics', topic.topicId, 'questions', question.questionId];
    await this.api.deleteResource(path);
  }
}
