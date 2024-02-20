import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

import { Topic, TopicTypes } from '@models/topic.model';
import { Application } from '@models/application.model';
import { Opportunity } from '@models/opportunity.model';
import { GAEventAttached } from '@models/event.model';
import { TopicCategoryAttached } from '@models/category.model';

@Injectable({ providedIn: 'root' })
export class TopicsService {
  private topics: Topic[];
  private archivedTopics: Topic[];

  /**
   * The number of topics to consider for the pagination, when active.
   */
  MAX_PAGE_SIZE = 24;

  constructor(private api: IDEAApiService) {}

  /**
   * Load the active topics from the back-end.
   */
  private async loadActiveList(): Promise<void> {
    const topics: Topic[] = await this.api.getResource('topics', { params: { archived: false } });
    this.topics = topics.map(x => new Topic(x));
  }
  /**
   * Get (and optionally filter) the list of active topics.
   * Note: it's a slice of the array.
   */
  async getActiveList(
    options: {
      force?: boolean;
      search?: string;
      categoryId?: string;
      eventId?: string;
      status?: TopicsFilterByStatus;
      type?: TopicTypes;
      withPagination?: boolean;
      startPaginationAfterId?: string;
      sortBy?: TopicsSortBy;
    } = { sortBy: TopicsSortBy.CREATED_DATE_DESC }
  ): Promise<Topic[]> {
    if (!this.topics || options.force) await this.loadActiveList();
    if (!this.topics) return null;

    options.search = options.search ? String(options.search).toLowerCase() : '';

    let filteredList = this.topics.slice();

    if (options.search)
      filteredList = filteredList.filter(x =>
        options.search
          .split(' ')
          .every(searchTerm =>
            [x.name, x.content, x.category.name, x.event.name, ...x.subjects.map(s => s.name)]
              .filter(f => f)
              .some(f => f.toLowerCase().includes(searchTerm))
          )
      );

    if (options.categoryId) filteredList = filteredList.filter(x => x.category.categoryId === options.categoryId);

    if (options.eventId) filteredList = filteredList.filter(x => x.event.eventId === options.eventId);

    switch (options.status) {
      case TopicsFilterByStatus.DRAFT:
        filteredList = filteredList.filter(x => !x.publishedSince);
        break;
      case TopicsFilterByStatus.OPEN:
        filteredList = filteredList.filter(x => !x.closedAt && !!x.publishedSince);
        break;
      case TopicsFilterByStatus.CLOSED:
        filteredList = filteredList.filter(x => x.closedAt && !!x.publishedSince);
        break;
    }
    if (options.type) filteredList = filteredList.filter(x => options.type === x.type);

    switch (options.sortBy) {
      case TopicsSortBy.CREATED_DATE_ASC:
        filteredList = filteredList.sort((a, b): number => a.createdAt.localeCompare(b.createdAt));
        break;
      case TopicsSortBy.CREATED_DATE_DESC:
        filteredList = filteredList.sort((a, b): number => b.createdAt.localeCompare(a.createdAt));
        break;
      case TopicsSortBy.ACTIVITY_ASC:
        filteredList = filteredList.sort((a, b): number => {
          const liveA = a.type === TopicTypes.LIVE ? (a.isClosed() ? -1 : 1) : 0;
          const liveB = b.type === TopicTypes.LIVE ? (b.isClosed() ? -1 : 1) : 0;
          return liveA - liveB || a.numOfQuestions - b.numOfQuestions;
        });
        break;
      case TopicsSortBy.ACTIVITY_DESC:
        filteredList = filteredList.sort((a, b): number => {
          const liveA = a.type === TopicTypes.LIVE ? (a.isClosed() ? -1 : 1) : 0;
          const liveB = b.type === TopicTypes.LIVE ? (b.isClosed() ? -1 : 1) : 0;
          return liveB - liveA || b.numOfQuestions - a.numOfQuestions;
        });
        break;
    }

    if (options.withPagination && filteredList.length > this.MAX_PAGE_SIZE) {
      let indexOfLastOfPreviousPage = 0;
      if (options.startPaginationAfterId)
        indexOfLastOfPreviousPage = filteredList.findIndex(x => x.topicId === options.startPaginationAfterId) || 0;
      filteredList = filteredList.slice(0, indexOfLastOfPreviousPage + this.MAX_PAGE_SIZE);
    }

    return filteredList;
  }

  /**
   * Load the archived topics from the back-end.
   */
  private async loadArchivedList(categoryId?: string, eventId?: string): Promise<void> {
    const params: any = { archived: true };
    if (categoryId) params.categoryId = categoryId;
    if (eventId) params.eventId = eventId;
    const topics: Topic[] = await this.api.getResource('topics', { params });
    this.archivedTopics = topics.map(x => new Topic(x));
  }
  /**
   * Get (and optionally filter) the list of archived topics.
   * Note: it's a slice of the array.
   */
  async getArchivedList(
    options: {
      force?: boolean;
      categoryId?: string;
      eventId?: string;
      withPagination?: boolean;
      startPaginationAfterId?: string;
      sortBy?: TopicsSortBy;
    } = { sortBy: TopicsSortBy.CREATED_DATE_DESC }
  ): Promise<Topic[]> {
    if (!this.archivedTopics || options.force) await this.loadArchivedList(options.categoryId, options.eventId);
    if (!this.archivedTopics) return null;

    let filteredList = this.archivedTopics.slice();

    switch (options.sortBy) {
      case TopicsSortBy.CREATED_DATE_ASC:
        filteredList = filteredList.sort((a, b): number => a.createdAt.localeCompare(b.createdAt));
        break;
      case TopicsSortBy.CREATED_DATE_DESC:
        filteredList = filteredList.sort((a, b): number => b.createdAt.localeCompare(a.createdAt));
        break;
      case TopicsSortBy.ACTIVITY_ASC:
        filteredList = filteredList.sort((a, b): number => a.numOfQuestions - b.numOfQuestions);
        break;
      case TopicsSortBy.ACTIVITY_DESC:
        filteredList = filteredList.sort((a, b): number => b.numOfQuestions - a.numOfQuestions);
        break;
    }

    if (options.withPagination && filteredList.length > this.MAX_PAGE_SIZE) {
      let indexOfLastOfPreviousPage = 0;
      if (options.startPaginationAfterId)
        indexOfLastOfPreviousPage = filteredList.findIndex(x => x.topicId === options.startPaginationAfterId) || 0;
      filteredList = filteredList.slice(0, indexOfLastOfPreviousPage + this.MAX_PAGE_SIZE);
    }

    return filteredList;
  }

  /**
   * Get a topic by its id.
   */
  async getById(topicId: string): Promise<Topic> {
    return new Topic(await this.api.getResource(['topics', topicId]));
  }

  /**
   * Insert a topic.
   */
  async insert(topic: Topic): Promise<Topic> {
    return new Topic(await this.api.postResource('topics', { body: topic }));
  }
  /**
   * Insert a topic from an opportunity's application.
   */
  async insertFromApplicationToOpportunity(
    opportunity: Opportunity,
    application: Application,
    category: TopicCategoryAttached,
    event: GAEventAttached
  ): Promise<Topic> {
    const body = { action: 'INSERT_FROM_APPLICATION', opportunity, application, category, event };
    return new Topic(await this.api.patchResource('topics', { body }));
  }

  /**
   * Update a topic.
   */
  async update(topic: Topic): Promise<Topic> {
    return new Topic(await this.api.putResource(['topics', topic.topicId], { body: topic }));
  }

  /**
   * Open a topic.
   */
  async open(topic: Topic): Promise<void> {
    await this.api.patchResource(['topics', topic.topicId], { body: { action: 'OPEN' } });
  }
  /**
   * Close a topic.
   */
  async close(topic: Topic): Promise<void> {
    await this.api.patchResource(['topics', topic.topicId], { body: { action: 'CLOSE' } });
  }

  /**
   * Archive a topic.
   */
  async archive(topic: Topic): Promise<void> {
    await this.api.patchResource(['topics', topic.topicId], { body: { action: 'ARCHIVE' } });
  }
  /**
   * Unarchive a topic.
   */
  async unarchive(topic: Topic): Promise<void> {
    await this.api.patchResource(['topics', topic.topicId], { body: { action: 'UNARCHIVE' } });
  }

  /**
   * Delete a topic.
   */
  async delete(topic: Topic): Promise<void> {
    await this.api.deleteResource(['topics', topic.topicId]);
  }

  /**
   * Get the related topics.
   */
  async getRelated(topic: Topic): Promise<Topic[]> {
    const topics: Topic[] = await this.api.getResource(['topics', topic.topicId, 'related']);
    return topics.map(x => new Topic(x));
  }
  /**
   * Link two topics together.
   */
  async linkByIds(topicA: string, topicB: string): Promise<void> {
    await this.api.postResource(['topics', topicA, 'related', topicB]);
  }
  /**
   * Unlink two topics together.
   */
  async unlinkByIds(topicA: string, topicB: string): Promise<void> {
    await this.api.deleteResource(['topics', topicA, 'related', topicB]);
  }

  /**
   * Get the messages of the live topic that the user upvoted.
   */
  async userMessagesUpvotesForTopic(topic: Topic): Promise<{ [messageId: string]: boolean }> {
    const path = ['topics', topic.topicId];
    const answersIds: string[] = await this.api.patchResource(path, { body: { action: 'MESSAGES_UPVOTES' } });
    const upvoteMap = {};
    answersIds.forEach(a => (upvoteMap[a] = true));
    return upvoteMap;
  }
}

/**
 * The possible sorting mechanisms for the topics.
 */
export enum TopicsSortBy {
  CREATED_DATE_ASC = 'CREATED_DATE_ASC',
  CREATED_DATE_DESC = 'CREATED_DATE_DESC',
  ACTIVITY_ASC = 'ACTIVITY_ASC',
  ACTIVITY_DESC = 'ACTIVITY_DESC'
}

export enum TopicsFilterByStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED'
}
