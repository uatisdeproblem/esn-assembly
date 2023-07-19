import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';

import { Question } from '@models/question.model';
import { Answer } from '@models/answer.model';

@Injectable({ providedIn: 'root' })
export class AnswersService {
  private answers: Answer[];

  /**
   * The number of answers to consider for the pagination, when active.
   */
  MAX_PAGE_SIZE = 24;

  constructor(private api: IDEAApiService, private app: AppService) {}

  /**
   * Load the answers to a question from the back-end.
   */
  private async loadListOfQuestion(question: Question): Promise<void> {
    const path = ['topics', question.topicId, 'questions', question.questionId, 'answers'];
    const answers: Answer[] = await this.api.getResource(path);
    this.answers = answers.map(x => new Answer(x));
  }
  /**
   * Get (and optionally filter) the list of answers to a question.
   * Note: it's a slice of the array.
   */
  async getListOfQuestion(
    question: Question,
    options: {
      force?: boolean;
      search?: string;
      withPagination?: boolean;
      startPaginationAfterId?: string;
    } = {}
  ): Promise<Answer[]> {
    if (!this.answers || options.force) await this.loadListOfQuestion(question);
    if (!this.answers) return null;

    options.search = options.search ? String(options.search).toLowerCase() : '';

    let filteredList = this.answers.slice();

    if (options.search)
      filteredList = filteredList.filter(x =>
        options.search
          .split(' ')
          .every(searchTerm =>
            [x.text, x.creator.name, x.creator.section, x.creator.country]
              .filter(f => f)
              .some(f => f.toLowerCase().includes(searchTerm))
          )
      );

    if (options.withPagination && filteredList.length > this.MAX_PAGE_SIZE) {
      let indexOfLastOfPreviousPage = 0;
      if (options.startPaginationAfterId)
        indexOfLastOfPreviousPage = filteredList.findIndex(x => x.answerId === options.startPaginationAfterId) || 0;
      filteredList = filteredList.slice(0, indexOfLastOfPreviousPage + this.MAX_PAGE_SIZE);
    }

    return filteredList;
  }

  /**
   * Get a question's answer by its id.
   */
  async getById(question: Question, answerId: string): Promise<Answer> {
    const path = ['topics', question.topicId, 'questions', question.questionId, 'answers', answerId];
    return new Answer(await this.api.getResource(path));
  }

  /**
   * Insert an answer to a question.
   */
  async insert(question: Question, answer: Answer): Promise<Answer> {
    const path = ['topics', question.topicId, 'questions', question.questionId, 'answers'];
    return new Answer(await this.api.postResource(path, { body: answer }));
  }

  /**
   * Update an answer.
   */
  async update(question: Question, answer: Answer): Promise<Answer> {
    const path = ['topics', question.topicId, 'questions', question.questionId, 'answers', answer.answerId];
    return new Answer(await this.api.putResource(path, { body: answer }));
  }

  /**
   * Delete an answer.
   */
  async delete(question: Question, answer: Answer): Promise<void> {
    const path = ['topics', question.topicId, 'questions', question.questionId, 'answers', answer.answerId];
    await this.api.deleteResource(path);
  }

  /*
   * Clap an answer.
   */
  async clap(question: Question, answer: Answer): Promise<void> {
    const path = ['topics', question.topicId, 'questions', question.questionId, 'answers', answer.answerId, 'claps'];
    await this.api.postResource(path);
  }
  /**
   * Cancel the clap to an answer.
   */
  async clapCancel(question: Question, answer: Answer): Promise<void> {
    const path = ['topics', question.topicId, 'questions', question.questionId, 'answers', answer.answerId, 'claps'];
    await this.api.deleteResource(path);
  }
  /**
   * Whether the current user clapped an answer.
   */
  async userHasClapped(question: Question, answer: Answer): Promise<boolean> {
    const path = [
      'topics',
      question.topicId,
      'questions',
      question.questionId,
      'answers',
      answer.answerId,
      'claps',
      this.app.user.userId
    ];
    const { clapped } = await this.api.getResource(path);
    return clapped;
  }
}
