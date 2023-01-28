import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { BooksRoutingModule } from './books-routing.module';
import { BookPage } from './book.page';
import { BooksPage } from './books.page';

import { BookModule } from './book.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, BooksRoutingModule, IDEATranslationsModule, BookModule],
  declarations: [BooksPage, BookPage]
})
export class BooksModule {}
