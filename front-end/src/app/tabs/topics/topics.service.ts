import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

import { Topic } from '@models/topic.model';

@Injectable({ providedIn: 'root' })
export class TopicsService {
  private topics: Topic[];

  /**
   * The number of topics to consider for the pagination, when active.
   */
  MAX_PAGE_SIZE = 24;

  constructor(private api: IDEAApiService) {}

  /**
   * Load the tems from the back-end.
   */
  private async loadList(): Promise<void> {
    const topics: Topic[] = await this.api.getResource('topics');
    this.topics = topics.map(x => new Topic(x));
  }
  /**
   * Get (and optionally filter) the list of topics.
   * Note: it's a slice of the array.
   */
  async getList(
    options: {
      force?: boolean;
      search?: string;
      withPagination?: boolean;
      startPaginationAfterId?: string;
    } = {}
  ): Promise<Topic[]> {
    if (!this.topics || options.force) await this.loadList();
    if (!this.topics) return null;

    options.search = options.search ? String(options.search).toLowerCase() : '';

    let filteredList = this.topics.slice();

    if (options.search)
      filteredList = filteredList.filter(x =>
        options.search
          .split(' ')
          .every(searchTerm => [x.name].filter(f => f).some(f => f.toLowerCase().includes(searchTerm)))
      );

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
   * Update a topic.
   */
  async update(topic: Topic): Promise<Topic> {
    return new Topic(await this.api.putResource(['topics', topic.topicId], { body: topic }));
  }

  /**
   * Archive a topic.
   */
  async archive(topic: Topic): Promise<void> {
    await this.api.deleteResource(['topics', topic.topicId]);
  }
}
