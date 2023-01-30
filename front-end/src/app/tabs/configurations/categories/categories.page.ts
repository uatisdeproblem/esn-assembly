import { Component } from '@angular/core';
import { IonInfiniteScroll } from '@ionic/angular';

import { AppService } from '@app/app.service';
import { TopicCategoryService } from './categories.service';

import { TopicCategory } from '@models/category.model';

@Component({
  selector: 'categories',
  templateUrl: 'categories.page.html',
  styleUrls: ['categories.page.scss']
})
export class CategoriesPage {
  categories: TopicCategory[];

  constructor(private _categories: TopicCategoryService, public app: AppService) {}
  async ionViewDidEnter(): Promise<void> {
    this.categories = await this._categories.getList({ force: true, withPagination: true });
  }

  async paginate(scrollToNextPage?: IonInfiniteScroll): Promise<void> {
    let startPaginationAfterId = null;
    if (scrollToNextPage && this.categories?.length)
      startPaginationAfterId = this.categories[this.categories.length - 1].categoryId;

    this.categories = await this._categories.getList({ withPagination: true, startPaginationAfterId });

    if (scrollToNextPage) setTimeout((): Promise<void> => scrollToNextPage.complete(), 100);
  }

  addCategory(): void {
    this.app.goToInTabs(['configurations', 'categories', 'new']);
  }
  openCategory(category: TopicCategory): void {
    this.app.goToInTabs(['configurations', 'categories', category.categoryId]);
  }
}
