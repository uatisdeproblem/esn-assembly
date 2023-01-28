import { Resource } from 'idea-toolbox';

/**
 * A Book in a gallery.
 */
export class Book extends Resource {
  /**
   * The id of the book.
   */
  bookId: string;
  /**
   * The id of the book's publisher.
   */
  publisherId: string;
  /**
   * The title of the book.
   */
  title: string;
  /**
   * The genre of the book.
   */
  genre: string;
  /**
   * The author of the book.
   */
  author: string;
  /**
   * The book's synopsis.
   */
  description: string;
  /**
   * The book's date of publication.
   */
  publishDate: string;
  /**
   * The book's year of publication.
   */
  publishYear: number;
  /**
   * The book's average rating.
   */
  rating: number;
  /**
   * The book's number of ratings.
   */
  ratingsCount: number;
  /**
   * Whether the book has been rated.
   */
  hasRatings: 1 | 0;
  /**
   * The URL to the book's cover image.
   */
  coverURI: string;

  load(x: any): void {
    super.load(x);
    this.bookId = this.clean(x.bookId, String);
    this.publisherId = this.clean(x.publisherId, String);
    this.title = this.clean(x.title, String);
    this.genre = this.clean(x.genre, String);
    this.author = this.clean(x.author, String);
    this.description = this.clean(x.description, String);
    this.publishDate = this.clean(x.publishDate, d => new Date(d).toISOString(), new Date().toISOString());
    this.publishYear = new Date(this.publishDate).getFullYear();
    this.rating = this.clean(x.rating, Number, 0);
    this.ratingsCount = this.clean(x.ratingsCount, Number, 0);
    this.hasRatings = this.ratingsCount > 0 ? 1 : 0;
    this.coverURI = this.clean(x.coverURI, String);
  }

  safeLoad(newData: any, safeData: any): void {
    super.safeLoad(newData, safeData);
    this.bookId = safeData.bookId;
    this.publisherId = safeData.publisherId;
    this.rating = safeData.rating;
    this.ratingsCount = safeData.ratingsCount;
  }

  validate(): string[] {
    const e = super.validate();
    if (this.iE(this.title)) e.push('title');
    if (!BOOK_GENRES.includes(this.genre)) e.push('genre');
    if (this.iE(this.author)) e.push('author');
    if (this.iE(this.publishDate, 'date')) e.push('publishDate');
    return e;
  }
}
/**
 * The summary of a Book in a gallery.
 */
export class BookSummary extends Resource {
  bookId: string;
  publisherId: string;
  title: string;
  genre: string;
  author: string;
  publishDate: string;
  rating: number;
  ratingsCount: number;

  load(x: any): void {
    super.load(x);
    this.bookId = this.clean(x.bookId, String);
    this.publisherId = this.clean(x.publisherId, String);
    this.title = this.clean(x.title, String);
    this.genre = this.clean(x.genre, String);
    this.author = this.clean(x.author, String);
    this.publishDate = this.clean(x.publishDate, d => new Date(d).toISOString());
    this.rating = this.clean(x.rating, Number);
    this.ratingsCount = this.clean(x.ratingsCount, Number);
  }
}

export const BOOK_GENRES = ['Action', 'Adventure', 'Drama', 'Fantasy'];
