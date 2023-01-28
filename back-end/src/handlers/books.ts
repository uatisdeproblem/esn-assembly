///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController, S3 } from 'idea-aws';
import { SignedURL } from 'idea-toolbox';

import { Book, BookSummary } from '../models/book.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const PROJECT = process.env.PROJECT;
const TOP_BOOKS_NUM = 10;

const DDB_TABLES = { books: process.env.DDB_TABLE_books, ratings: process.env.DDB_TABLE_ratings };
const DDB_BOOKS_PAGINATION_LIMIT = 50;

const S3_BUCKET_MEDIA = process.env.S3_BUCKET_MEDIA;
const S3_IMAGES_FOLDER = process.env.S3_IMAGES_FOLDER;

const ddb = new DynamoDB();
const s3 = new S3();

export const handler = (ev: any, _: any, cb: any) => new Books(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class Books extends ResourceController {
  book: Book;

  constructor(event: any, callback: any) {
    super(event, callback, { resourceId: 'bookId' });
  }

  protected async checkAuthBeforeRequest(): Promise<void> {
    if (!this.resourceId) return;

    try {
      this.book = new Book(await ddb.get({ TableName: DDB_TABLES.books, Key: { bookId: this.resourceId } }));
    } catch (err) {
      throw new RCError('Book not found');
    }
  }

  protected async getResources(): Promise<(BookSummary | Book)[]> {
    if (this.queryParams.top === 'true') return await this.getTopBooks();
    else if (this.queryParams.publisherId) return await this.getBooksOfPublisherId(this.queryParams.publisherId);
    else if (this.queryParams.paginated === 'true')
      return await this.getAllBooksPaginated(this.queryParams.startFromBookId);
    else return await this.getAllBooks();
  }
  private async getAllBooks(): Promise<BookSummary[]> {
    const res: Book[] = await ddb.scan({ TableName: DDB_TABLES.books });
    return res.map(x => new BookSummary(x));
  }
  private async getAllBooksPaginated(startFromBookId?: string): Promise<BookSummary[]> {
    const scanParams: any = { TableName: DDB_TABLES.books, Limit: DDB_BOOKS_PAGINATION_LIMIT };
    if (startFromBookId) scanParams.ExclusiveStartKey = { bookId: startFromBookId };

    const { Items } = await ddb.scanClassic(scanParams);
    return Items.map(x => new BookSummary(x));
  }
  private async getBooksOfPublisherId(publisherId: string): Promise<BookSummary[]> {
    const res: Book[] = await ddb.query({
      TableName: DDB_TABLES.books,
      IndexName: 'publisherId-publishDate-index',
      KeyConditionExpression: 'publisherId = :publisherId',
      ExpressionAttributeValues: { ':publisherId': publisherId },
      ScanIndexForward: false
    });
    return res.map(x => new BookSummary(x));
  }
  private async getTopBooks(): Promise<Book[]> {
    const res = await ddb.queryClassic({
      TableName: DDB_TABLES.books,
      IndexName: 'hasRatings-rating-index',
      KeyConditionExpression: 'hasRatings = :yes',
      ExpressionAttributeValues: { ':yes': 1 },
      ScanIndexForward: false,
      Limit: TOP_BOOKS_NUM
    });
    return res.Items.map(x => new Book(x));
  }

  private async putSafeResource(opts: { noOverwrite: boolean }): Promise<Book> {
    const errors = this.book.validate();
    if (errors.length) throw new RCError(`Invalid fields: ${errors.join(', ')}`);

    const putParams: any = { TableName: DDB_TABLES.books, Item: this.book };
    if (opts.noOverwrite) putParams.ConditionExpression = 'attribute_not_exists(bookId)';
    await ddb.put(putParams);

    return this.book;
  }

  protected async postResources(): Promise<Book> {
    this.book = new Book(this.body);
    this.book.publisherId = this.cognitoUser.userId;
    this.book.bookId = await ddb.IUNID(PROJECT);
    this.book.hasRatings = 0;
    this.book.rating = 0;
    this.book.ratingsCount = 0;

    return await this.putSafeResource({ noOverwrite: true });
  }

  protected async patchResources(): Promise<SignedURL> {
    switch (this.body.action) {
      case 'GET_COVER_UPLOAD_URL':
        return await this.getSignedURLToUploadCover();
      default:
        throw new RCError('Unsupported action');
    }
  }
  private async getSignedURLToUploadCover(): Promise<SignedURL> {
    const imageURI = await ddb.IUNID(PROJECT.concat('-bookCover'));

    const key = `${S3_IMAGES_FOLDER}/${imageURI}.png`;
    const signedURL = s3.signedURLPut(S3_BUCKET_MEDIA, key);
    signedURL.id = imageURI;

    return signedURL;
  }

  protected async getResource(): Promise<Book> {
    return this.book;
  }

  protected async patchResource(): Promise<Book> {
    switch (this.body.action) {
      case 'RATE':
        return await this.rateBook(Number(this.body.rating));
      default:
        throw new RCError('Unsupported action');
    }
  }
  private async rateBook(rating: number): Promise<Book> {
    if (rating < 1 || rating > 5) throw new RCError('Invalid rating');

    await ddb.put({
      TableName: DDB_TABLES.ratings,
      Item: { bookId: this.resourceId, userId: this.cognitoUser.userId, rating }
    });

    return await this.calculateAndSaveBookAvgRating();
  }
  private async calculateAndSaveBookAvgRating(): Promise<Book> {
    const ratingsOfBook = (
      await ddb.query({
        TableName: DDB_TABLES.ratings,
        KeyConditionExpression: 'bookId = :bookId',
        ExpressionAttributeValues: { ':bookId': this.resourceId },
        ProjectionExpression: 'rating'
      })
    ).map(x => x.rating);

    if (ratingsOfBook.length) {
      this.book.ratingsCount = ratingsOfBook.length;
      this.book.hasRatings = ratingsOfBook.length > 0 ? 1 : 0;
      this.book.rating = ratingsOfBook.reduce((tot, acc) => (tot += acc), 0) / ratingsOfBook.length;
    } else {
      this.book.ratingsCount = 0;
      this.book.hasRatings = 0;
      this.book.rating = 0;
    }

    await ddb.update({
      TableName: DDB_TABLES.books,
      Key: { bookId: this.resourceId },
      UpdateExpression: 'SET rating = :r, hasRatings = :hr, ratingsCount = :rc',
      ExpressionAttributeValues: { ':r': this.book.rating, ':hr': this.book.hasRatings, ':rc': this.book.ratingsCount }
    });

    return this.book;
  }

  protected async putResource(): Promise<Book> {
    if (this.book.publisherId !== this.cognitoUser.userId) throw new RCError('Unauthorized');

    const oldBook = new Book(this.book);
    this.book.safeLoad(this.body, oldBook);

    return await this.putSafeResource({ noOverwrite: false });
  }

  protected async deleteResource(): Promise<void> {
    if (this.book.publisherId !== this.cognitoUser.userId) throw new RCError('Unauthorized');

    await ddb.delete({ TableName: DDB_TABLES.books, Key: { bookId: this.resourceId } });
  }
}
