import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController } from '@ionic/angular';
import {
  IDEAActionSheetController,
  IDEALoadingService,
  IDEAMessageService,
  IDEATranslationsService
} from '@idea-ionic/common';

import { AppService } from '../app.service';
import { BooksService } from './books.service';

import { environment as env } from '@env';
import { Book, BOOK_GENRES } from '@models/book.model';

/**
 * A local fallback URL for the book covers.
 */
const COVER_FALLBACK_URL = './assets/imgs/no-cover.jpg';
/**
 * The base URLs where the thumbnails are located.
 */
const COVERS_BASE_URL = `${env.idea.app.mediaUrl}/images/${env.idea.api.stage}/`;

@Component({
  selector: 'book',
  templateUrl: 'book.page.html',
  styleUrls: ['book.page.scss']
})
export class BookPage {
  book: Book;

  editMode = UXMode.VIEW;
  UXMode = UXMode;
  errors = new Set<string>();
  entityBeforeChange: Book;

  bookGenres = BOOK_GENRES;

  constructor(
    private route: ActivatedRoute,
    private alertCtrl: AlertController,
    private actionSheetCtrl: IDEAActionSheetController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private _books: BooksService,
    public app: AppService,
    public t: IDEATranslationsService
  ) {}
  async ionViewWillEnter(): Promise<void> {
    const bookId = this.route.snapshot.paramMap.get('bookId') || 'new';
    if (bookId !== 'new') {
      await this.loadBookById(bookId);
      this.editMode = UXMode.VIEW;
    } else {
      this.book = new Book();
      this.editMode = UXMode.INSERT;
    }
  }
  private async loadBookById(bookId: string): Promise<void> {
    try {
      await this.loading.show();
      this.book = await this._books.getById(bookId);
    } catch (error) {
      this.app.closePage('COMMON.NOT_FOUND');
    } finally {
      this.loading.hide();
    }
  }

  hasFieldAnError(field: string): boolean {
    return this.errors.has(field);
  }

  async save(): Promise<void> {
    this.errors = new Set(this.book.validate());
    if (this.errors.size) return this.message.error('COMMON.FORM_HAS_ERROR_TO_CHECK');

    try {
      await this.loading.show();

      let result: Book;
      if (this.editMode === UXMode.INSERT) result = await this._books.insert(this.book);
      else result = await this._books.update(this.book);

      this.book.load(result);
      this.editMode = UXMode.VIEW;
      this.message.success('COMMON.OPERATION_COMPLETED');
    } catch (err) {
      this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      this.loading.hide();
    }
  }

  async openActions(): Promise<void> {
    const header = this.t._('COMMON.ACTIONS');
    const buttons = [];
    buttons.push({
      text: this.t._('COMMON.DELETE'),
      role: 'destructive',
      icon: 'trash',
      handler: () => this.delete()
    });
    buttons.push({ text: this.t._('COMMON.CANCEL'), role: 'cancel', icon: 'arrow-undo', handler: () => {} });

    const actions = await this.actionSheetCtrl.create({ header, buttons });
    actions.present();
  }

  getTitle(): string {
    return this.editMode === UXMode.INSERT ? this.t._('BOOKS.NEW_BOOK') : this.t._('BOOKS.BOOK');
  }
  enterEditMode(): void {
    this.entityBeforeChange = new Book(this.book);
    this.editMode = UXMode.EDIT;
  }
  exitEditMode(): void {
    if (this.editMode === UXMode.INSERT) this.goBackToList();
    else {
      this.book = this.entityBeforeChange;
      this.errors = new Set<string>();
      this.editMode = UXMode.VIEW;
    }
  }

  browseImagesForCover(): void {
    document.getElementById('book-cover').click();
  }
  async uploadCover({ target }): Promise<void> {
    const file = target.files[0];
    if (!file) return;

    try {
      await this.loading.show();
      const coverURI = await this._books.uploadCoverAndGetURI(file);
      await sleepNumSeconds(5);
      this.book.coverURI = coverURI;
    } catch (error) {
      this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      this.loading.hide();
    }
  }
  getCoverURL(book: Book): string {
    return book.coverURI ? COVERS_BASE_URL.concat(book.coverURI, '.png') : COVER_FALLBACK_URL;
  }
  setCoverFallbackURLOnImage(targetImg: any): void {
    if (targetImg && targetImg.src !== COVER_FALLBACK_URL) targetImg.src = COVER_FALLBACK_URL;
  }

  async rateBook(rating: number): Promise<void> {
    try {
      await this.loading.show();
      const newBookData = await this._books.rate(this.book, rating);
      this.book.load(newBookData);
    } catch (err) {
      this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      this.loading.hide();
    }
  }

  private async delete(): Promise<void> {
    const doDelete = async (): Promise<void> => {
      try {
        await this.loading.show();
        await this._books.delete(this.book);
        this.message.success('COMMON.OPERATION_COMPLETED');
        this.goBackToList();
      } catch (error) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };

    const header = this.t._('COMMON.ARE_YOU_SURE');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.DELETE'), role: 'destructive', handler: () => doDelete() }
    ];
    const alert = await this.alertCtrl.create({ header, buttons });
    alert.present();
  }

  goBackToList(): void {
    this.app.goTo(['books'], { back: true, queryParams: { fromBookId: this.book.bookId } });
  }

  isMyBookOrNew(): boolean {
    return this.book && (!this.book.bookId || this.book.publisherId === this.app.user.userId);
  }
}

export enum UXMode {
  VIEW,
  INSERT,
  EDIT
}

const sleepNumSeconds = (numSeconds = 1) => new Promise(ok => setTimeout(() => ok(null), 1000 * numSeconds));
