import { Component, EventEmitter, Input, Output } from '@angular/core';

import { BookSummary } from '@models/book.model';

@Component({
  selector: 'app-book',
  templateUrl: 'book.component.html',
  styleUrls: ['book.component.scss']
})
export class BookComponent {
  /**
   * The book to show.
   * If undefined, show a skeleton instead.
   */
  @Input() book?: BookSummary;
  /**
   * Trigger for a book selection.
   */
  @Output() select = new EventEmitter<void>();

  genreColors = BOOK_GENDER_COLORS;

  constructor() {}
}

const BOOK_GENDER_COLORS = {
  Action: 'primary',
  Adventure: 'secondary',
  Drama: 'tertiary',
  Fantasy: 'medium'
};
