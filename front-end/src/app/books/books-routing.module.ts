import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BooksPage } from './books.page';
import { BookPage } from './book.page';

const routes: Routes = [
  { path: '', component: BooksPage },
  { path: ':bookId', component: BookPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BooksRoutingModule {}
