import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { TopicCategoryService } from '@tabs/configurations/categories/categories.service';

import { TopicCategoryAttached } from '@models/category.model';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslationsModule],
  selector: 'app-categories-picker',
  template: `
    <ion-item [lines]="lines" [color]="color">
      <ion-label position="stacked">
        {{ 'CATEGORIES.CATEGORY' | translate }} <ion-text class="obligatoryDot" *ngIf="obligatory"></ion-text>
      </ion-label>
      <ion-select
        interface="popover"
        [compareWith]="compareWithCategory"
        [(ngModel)]="category"
        (ngModelChange)="categoryChange.emit($event)"
        [disabled]="!editMode || !categories"
      >
        <ion-select-option *ngIf="!obligatory" [value]="null"></ion-select-option>
        <ion-select-option *ngFor="let category of categories" [value]="category">
          {{ category.name }}
        </ion-select-option>
      </ion-select>
    </ion-item>
  `,
  styles: []
})
export class CategoriesPickerComponent implements OnInit {
  /**
   * The category picked.
   */
  @Input() category: TopicCategoryAttached;
  @Output() categoryChange = new EventEmitter<TopicCategoryAttached>();
  /**
   * The color of the item.
   */
  @Input() color: string;
  /**
   * The lines attribute of the item.
   */
  @Input() lines: string;
  /**
   * Whether the component is editable.
   */
  @Input() editMode = false;
  /**
   * Whether picking the category is obligatory.
   */
  @Input() obligatory = false;

  categories: TopicCategoryAttached[];

  constructor(private _categories: TopicCategoryService) {}
  async ngOnInit(): Promise<void> {
    this.categories = await this._categories.getList();
  }

  compareWithCategory(c1: TopicCategoryAttached, c2: TopicCategoryAttached): boolean {
    return c1 && c2 ? c1.categoryId === c2.categoryId : c1 === c2;
  }
}
