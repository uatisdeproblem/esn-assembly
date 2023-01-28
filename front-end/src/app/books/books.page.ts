import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonInfiniteScroll, IonRefresher, IonSearchbar } from '@ionic/angular';
import { IDEAMessageService, IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from '../app.service';
import { BooksService } from './books.service';

import { environment as env } from '@env';
import { Book, BookSummary } from '@models/book.model';

/**
 * A local fallback URL for the book covers.
 */
const COVER_FALLBACK_URL = './assets/imgs/no-cover.jpg';
/**
 * The base URLs where the thumbnails are located.
 */
const COVERS_BASE_URL = `${env.idea.app.mediaUrl}/images/${env.idea.api.stage}/`;

@Component({
  selector: 'books',
  templateUrl: 'books.page.html',
  styleUrls: ['books.page.scss']
})
export class BooksPage {
  books: BookSummary[];
  topBooks: Book[];

  @ViewChild(IonSearchbar) searchbar: IonSearchbar;

  segment = PageSegments.TOP_10;
  PageSegments = PageSegments;

  constructor(
    private route: ActivatedRoute,
    private message: IDEAMessageService,
    private _books: BooksService,
    public app: AppService,
    public t: IDEATranslationsService
  ) {}
  async ionViewDidEnter(): Promise<void> {
    await this.loadList();

    const shouldUpdateBookId = this.route.snapshot.queryParamMap.get('fromBookId');
    if (shouldUpdateBookId) await this.updateBookDataInList(shouldUpdateBookId);
  }
  async loadList(force = false): Promise<void> {
    try {
      this.topBooks = await this._books.getTopList();
      if (force) this.books = null;
      this.books = await this._books.getList({ force, startPaginationAfterId: null });
    } catch (error) {
      this.message.error('COMMON.COULDNT_LOAD_LIST');
    }
  }
  async doRefresh(event: IonRefresher): Promise<void> {
    if (event) setTimeout(() => event.complete(), 100);
    await this.loadList(true);
  }
  private async updateBookDataInList(bookId: string): Promise<void> {
    try {
      const book = await this._books.getById(bookId);
      const existingBook = this.books.find(x => x.bookId === book.bookId);
      if (existingBook) existingBook.load(book);
      else this.books.unshift(book);
    } catch (error) {
      const deletedBook = this.books.find(x => x.bookId === bookId);
      if (deletedBook) this.books.splice(this.books.indexOf(deletedBook), 1);
    }
  }

  async filter(search = '', scrollToNextPage?: IonInfiniteScroll): Promise<void> {
    let startPaginationAfterId = null;
    if (scrollToNextPage && this.books?.length) startPaginationAfterId = this.books[this.books.length - 1].bookId;

    this.books = await this._books.getList({ search, startPaginationAfterId });

    if (scrollToNextPage) setTimeout(() => scrollToNextPage.complete(), 100);
  }
  trackBy(_: number, book: BookSummary): string {
    return book.bookId;
  }

  newBook(): void {
    this.app.goTo(['books', 'new']);
  }
  openBook(book: BookSummary): void {
    this.app.goTo(['books', book.bookId]);
  }

  getCoverURL(book: Book): string {
    return book.coverURI ? COVERS_BASE_URL.concat(book.coverURI, '.png') : COVER_FALLBACK_URL;
  }
  setCoverFallbackURLOnImage(targetImg: any): void {
    if (targetImg && targetImg.src !== COVER_FALLBACK_URL) targetImg.src = COVER_FALLBACK_URL;
  }
}

enum PageSegments {
  ALL = 'ALL',
  TOP_10 = 'TOP_10'
}
