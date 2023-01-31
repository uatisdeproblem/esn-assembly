import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

import { TopicCategory } from '@models/category.model';

@Injectable({ providedIn: 'root' })
export class TopicCategoryService {
  private categories: TopicCategory[];

  /**
   * The number of categories to consider for the pagination, when active.
   */
  MAX_PAGE_SIZE = 24;

  constructor(private api: IDEAApiService) {}

  /**
   * Load the tems from the back-end.
   */
  private async loadList(): Promise<void> {
    const categories: TopicCategory[] = await this.api.getResource('categories');
    this.categories = categories.map(x => new TopicCategory(x));
  }
  /**
   * Get (and optionally filter) the list of categories.
   * Note: it's a slice of the array.
   */
  async getList(
    options: {
      force?: boolean;
      search?: string;
      withPagination?: boolean;
      startPaginationAfterId?: string;
    } = {}
  ): Promise<TopicCategory[]> {
    if (!this.categories || options.force) await this.loadList();
    if (!this.categories) return null;

    options.search = options.search ? String(options.search).toLowerCase() : '';

    let filteredList = this.categories.slice();

    if (options.search)
      filteredList = filteredList.filter(x =>
        options.search
          .split(' ')
          .every(searchTerm => [x.name].filter(f => f).some(f => f.toLowerCase().includes(searchTerm)))
      );

    if (options.withPagination && filteredList.length > this.MAX_PAGE_SIZE) {
      let indexOfLastOfPreviousPage = 0;
      if (options.startPaginationAfterId)
        indexOfLastOfPreviousPage = filteredList.findIndex(x => x.categoryId === options.startPaginationAfterId) || 0;
      filteredList = filteredList.slice(0, indexOfLastOfPreviousPage + this.MAX_PAGE_SIZE);
    }

    return filteredList;
  }

  /**
   * Get a category by its id.
   */
  async getById(categoryId: string): Promise<TopicCategory> {
    return new TopicCategory(await this.api.getResource(['categories', categoryId]));
  }

  /**
   * Insert a category.
   */
  async insert(category: TopicCategory): Promise<TopicCategory> {
    return new TopicCategory(await this.api.postResource('categories', { body: category }));
  }

  /**
   * Update a category.
   */
  async update(category: TopicCategory): Promise<TopicCategory> {
    return new TopicCategory(await this.api.putResource(['categories', category.categoryId], { body: category }));
  }

  /**
   * Archive a category.
   */
  async archive(category: TopicCategory): Promise<void> {
    await this.api.patchResource(['categories', category.categoryId], { body: { action: 'ARCHIVE' } });
  }
  /**
   * Unarchive a category.
   */
  async unarchive(category: TopicCategory): Promise<void> {
    await this.api.patchResource(['categories', category.categoryId], { body: { action: 'UNARCHIVE' } });
  }

  /**
   * Delete a category.
   */
  async delete(category: TopicCategory): Promise<void> {
    await this.api.deleteResource(['categories', category.categoryId]);
  }
}
