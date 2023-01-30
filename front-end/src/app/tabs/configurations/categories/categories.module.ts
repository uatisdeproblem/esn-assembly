import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { CategoriesRoutingModule } from './categories.routing.module';
import { CategoriesPage } from './categories.page';
import { CategoryPage } from './category.page';

import { EditModeButtonsModule } from 'src/app/common/editModeButtons.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IDEATranslationsModule,
    CategoriesRoutingModule,
    EditModeButtonsModule
  ],
  declarations: [CategoriesPage, CategoryPage]
})
export class CategoriesModule {}
