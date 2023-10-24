import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';

import { Topic } from '@models/topic.model';
import { Message, MessageTypes } from '@models/message.model';
import { Subject } from '@models/subject.model';

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private messages: Message[];

  /**
   * The number of messages to consider for the pagination, when active.
   */
  MAX_PAGE_SIZE = 24;

  constructor(private api: IDEAApiService, private app: AppService) {}

  /**
   * Load the messages in a live topic from the back-end.
   */
  private async loadListOfTopic(topic: Topic): Promise<void> {
    const messages: Message[] = await this.api.getResource(['topics', topic.topicId, 'messages']);
    this.messages = messages.map(x => new Message(x));
  }
  /**
   * Get (and optionally filter) the list of messages in a live topic.
   * Note: it's a slice of the array.
   */
  async getListOfTopic(
    topic: Topic,
    options: {
      force?: boolean;
      search?: string;
      filterByType?: MessageTypes;
      sortBy?: MessagesSortBy;
      showCompleted?: boolean;
      withPagination?: boolean;
      startPaginationAfterId?: string;
    } = { sortBy: MessagesSortBy.CREATION_ASC }
  ): Promise<Message[]> {
    if (!this.messages || options.force) await this.loadListOfTopic(topic);
    if (!this.messages) return null;

    options.search = options.search ? String(options.search).toLowerCase() : '';

    let filteredList = this.messages.slice();

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

    if (options.filterByType) filteredList = filteredList.filter(x => x.type === options.filterByType);

    if (options.showCompleted !== undefined)
      filteredList = filteredList.filter(x => (options.showCompleted ? true : !x.completedAt));

    switch (options.sortBy) {
      case MessagesSortBy.CREATION_ASC:
        filteredList = filteredList.sort((a, b): number => a.messageId.localeCompare(b.messageId));
        break;
      case MessagesSortBy.CREATION_DESC:
        filteredList = filteredList.sort((a, b): number => b.messageId.localeCompare(a.messageId));
        break;
      case MessagesSortBy.UPVOTES_ASC:
        filteredList = filteredList.sort(
          (a, b): number => a.numOfUpvotes - b.numOfUpvotes || a.messageId.localeCompare(b.messageId)
        );
        break;
      case MessagesSortBy.UPVOTES_DESC:
        filteredList = filteredList.sort(
          (a, b): number => b.numOfUpvotes - a.numOfUpvotes || a.messageId.localeCompare(b.messageId)
        );
        break;
    }

    if (options.withPagination && filteredList.length > this.MAX_PAGE_SIZE) {
      let indexOfLastOfPreviousPage = 0;
      if (options.startPaginationAfterId)
        indexOfLastOfPreviousPage = filteredList.findIndex(x => x.messageId === options.startPaginationAfterId) || 0;
      filteredList = filteredList.slice(0, indexOfLastOfPreviousPage + this.MAX_PAGE_SIZE);
    }

    return filteredList;
  }

  /**
   * Insert a message in a topic.
   */
  async insert(topic: Topic, message: Message): Promise<Message> {
    const path = ['topics', topic.topicId, 'messages'];
    return new Message(await this.api.postResource(path, { body: message }));
  }

  /**
   * Upvote a message.
   */
  async upvote(topic: Topic, message: Message): Promise<void> {
    const path = ['topics', topic.topicId, 'messages', message.messageId, 'upvotes'];
    await this.api.postResource(path);
  }
  /**
   * Cancel the upvote to a message.
   */
  async upvoteCancel(topic: Topic, message: Message): Promise<void> {
    const path = ['topics', topic.topicId, 'messages', message.messageId, 'upvotes'];
    await this.api.deleteResource(path);
  }
  /**
   * Whether the current user upvoted the message.
   */
  async userHasUpvoted(topic: Topic, message: Message): Promise<boolean> {
    const path = ['topics', topic.topicId, 'messages', message.messageId, 'upvotes', this.app.user.userId];
    const { upvoted } = await this.api.getResource(path);
    return upvoted;
  }
  /**
   * Get the users who upvoted the message (latest first).
   */
  async getUpvoters(topic: Topic, message: Message): Promise<Subject[]> {
    const path = ['topics', topic.topicId, 'messages', message.messageId, 'upvotes'];
    const subjects: Subject[] = await this.api.getResource(path);
    return subjects.map(x => new Subject(x));
  }

  /**
   * Delete a message.
   */
  async delete(topic: Topic, message: Message): Promise<void> {
    const path = ['topics', topic.topicId, 'messages', message.messageId];
    await this.api.deleteResource(path);
  }
}

/**
 * The possible sortings for lists of messages.
 */
export enum MessagesSortBy {
  CREATION_DESC = 'CREATION_DESC',
  CREATION_ASC = 'CREATION_ASC',
  UPVOTES_DESC = 'UPVOTES_DESC',
  UPVOTES_ASC = 'UPVOTES_ASC'
}
