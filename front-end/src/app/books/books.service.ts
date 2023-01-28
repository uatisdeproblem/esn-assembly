import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

import { Book, BookSummary } from '@models/book.model';

@Injectable({ providedIn: 'root' })
export class BooksService {
  private books: BookSummary[] = null;

  /**
   * The number of books to consider for the pagination, when active.
   */
  MAX_PAGE_SIZE = 24;

  constructor(private api: IDEAApiService) {}

  /**
   * Load the list of books from the back-end.
   */
  private async loadList(): Promise<void> {
    const res: BookSummary[] = await this.api.getResource('books');
    this.books = res.map(x => new BookSummary(x));
  }

  /**
   * Get (and optionally filter) the list of books.
   * Note: it can be paginated.
   * Note: it's a slice of the array.
   */
  async getList(
    options: { search?: string; startPaginationAfterId?: string; force?: boolean } = {}
  ): Promise<BookSummary[]> {
    if (!this.books || options.force) await this.loadList();
    if (!this.books) return null;

    options.search = options.search ? String(options.search).toLowerCase() : '';

    let filteredList = this.books.slice();

    if (options.search)
      filteredList = filteredList.filter(x =>
        options.search
          .split(' ')
          .every(searchTerm =>
            [x.bookId, x.title, x.genre, x.author].filter(f => f).some(f => f.toLowerCase().includes(searchTerm))
          )
      );

    if (options.startPaginationAfterId !== undefined && filteredList.length > this.MAX_PAGE_SIZE) {
      let indexOfLastOfPreviousPage = 0;
      if (options.startPaginationAfterId)
        indexOfLastOfPreviousPage = filteredList.findIndex(x => x.bookId === options.startPaginationAfterId) || 0;
      filteredList = filteredList.slice(0, indexOfLastOfPreviousPage + this.MAX_PAGE_SIZE);
    }

    return filteredList;
  }

  /**
   * Get the list of top books from the back-end.
   */
  async getTopList(): Promise<Book[]> {
    const res: Book[] = await this.api.getResource('books', { params: { top: true } });
    return res.map(x => new Book(x));
  }

  /**
   * Get the full details of a book by its id.
   */
  async getById(id: string): Promise<Book> {
    return new Book(await this.api.getResource(['books', id]));
  }

  /**
   * Insert a new book.
   */
  async insert(book: Book): Promise<Book> {
    return new Book(await this.api.postResource('books', { body: book }));
  }
  /**
   * Update an existing book.
   */
  async update(book: Book): Promise<Book> {
    return new Book(await this.api.putResource(['books', book.bookId], { body: book }));
  }
  /**
   * Delete a book.
   */
  async delete(book: Book): Promise<void> {
    await this.api.deleteResource(['books', book.bookId]);
  }

  /**
   * Upload a cover to attach to a book.
   */
  async uploadCoverAndGetURI(file: File): Promise<string> {
    const { url, id } = await this.api.patchResource('books', { body: { action: 'GET_COVER_UPLOAD_URL' } });
    await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });

    return id;
  }

  /**
   * Give the book a rating.
   */
  async rate(book: Book, rating: number): Promise<Book> {
    const body = { action: 'RATE', rating };
    return new Book(await this.api.patchResource(['books', book.bookId], { body }));
  }
}
