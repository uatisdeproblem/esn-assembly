///
/// IMPORTS
///

import { stripHtml } from 'string-strip-html';
import { utils, write } from 'xlsx';
import { DynamoDB, RCError, ResourceController, S3 } from 'idea-aws';
import { SignedURL } from 'idea-toolbox';

import { GAEvent } from '../models/event.model';
import { Topic, StandardTopicQuestionsExportable, TopicTypes } from '../models/topic.model';
import { User } from '../models/user.model';
import { Question } from '../models/question.model';
import { Answer } from '../models/answer.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const PROJECT = process.env.PROJECT;
const DDB_TABLES = {
  events: process.env.DDB_TABLE_events,
  topics: process.env.DDB_TABLE_topics,
  questions: process.env.DDB_TABLE_questions,
  answers: process.env.DDB_TABLE_answers
};
const ddb = new DynamoDB();

const S3_BUCKET_MEDIA = process.env.S3_BUCKET_MEDIA;
const S3_DOWNLOADS_FOLDER = process.env.S3_DOWNLOADS_FOLDER;
const s3 = new S3();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new GAEvents(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class GAEvents extends ResourceController {
  galaxyUser: User;
  gaEvent: GAEvent;

  constructor(event: any, callback: any) {
    super(event, callback, { resourceId: 'eventId' });
    this.galaxyUser = new User(event.requestContext.authorizer.lambda.user);
  }

  protected async checkAuthBeforeRequest(): Promise<void> {
    if (!this.resourceId) return;

    try {
      this.gaEvent = new GAEvent(await ddb.get({ TableName: DDB_TABLES.events, Key: { eventId: this.resourceId } }));
    } catch (err) {
      throw new RCError('Event not found');
    }
  }

  protected async getResources(): Promise<GAEvent[]> {
    let events: GAEvent[] = await ddb.scan({ TableName: DDB_TABLES.events });
    events = events.map(x => new GAEvent(x));
    if (!this.queryParams.all) events = events.filter(x => !x.archivedAt);
    return events.sort((a, b): number => a.name.localeCompare(b.name));
  }

  private async putSafeResource(opts: { noOverwrite: boolean }): Promise<GAEvent> {
    const errors = this.gaEvent.validate();
    if (errors.length) throw new RCError(`Invalid fields: ${errors.join(', ')}`);

    const putParams: any = { TableName: DDB_TABLES.events, Item: this.gaEvent };
    if (opts.noOverwrite) putParams.ConditionExpression = 'attribute_not_exists(eventId)';
    await ddb.put(putParams);

    return this.gaEvent;
  }

  protected async postResources(): Promise<GAEvent> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    this.gaEvent = new GAEvent(this.body);
    this.gaEvent.eventId = await ddb.IUNID(PROJECT);

    return await this.putSafeResource({ noOverwrite: true });
  }

  protected async getResource(): Promise<GAEvent | SignedURL> {
    if (this.queryParams.summarySpreadsheet) return await this.getSummarySpreadsheet();
    else return this.gaEvent;
  }
  private async getSummarySpreadsheet(): Promise<SignedURL> {
    // @todo to optimise with indexes
    const topics: Topic[] = await ddb.scan({ TableName: DDB_TABLES.topics });
    const questions: Question[] = await ddb.scan({ TableName: DDB_TABLES.questions });
    const answers: Answer[] = await ddb.scan({ TableName: DDB_TABLES.answers });

    const topicsExportable: StandardTopicQuestionsExportable[] = [];
    topics
      .map(t => new Topic(t))
      .filter(t => t.type === TopicTypes.STANDARD)
      .filter(t => t.event.eventId === this.gaEvent.eventId)
      .filter(t => !t.isDraft())
      .sort((a, b): number => b.createdAt.localeCompare(a.createdAt))
      .forEach(t => {
        questions
          .filter(q => q.topicId === t.topicId)
          .sort((a, b): number => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
          .forEach(q => {
            const Answers = answers
              .filter(a => a.questionId === q.questionId)
              .sort((a, b): number => a.createdAt.localeCompare(b.createdAt))
              .map(a => `[${a.creator.name}]\n\n${stripHtml(a.text).result}`)
              .join('\n\n======\n\n');
            topicsExportable.push({
              Topic: t.name,
              Category: t.category.name,
              Subjects: t.subjects.map(s => s.name).join(', '),
              Summary: q.summary,
              Question: stripHtml(q.text).result,
              Creator: q.creator.name,
              Answers
            });
          });
      });

    const workbook: any = { SheetNames: [], Sheets: {}, Props: { Title: PROJECT, Author: PROJECT } };
    utils.book_append_sheet(workbook, utils.json_to_sheet(topicsExportable), '1');
    const buffer = Buffer.from(write(workbook, { bookType: 'xlsx', type: 'buffer' }));

    return await s3.createDownloadURLFromData(buffer, {
      bucket: S3_BUCKET_MEDIA,
      prefix: S3_DOWNLOADS_FOLDER,
      key: `${this.gaEvent.name}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  protected async putResource(): Promise<GAEvent> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    const oldEvent = new GAEvent(this.gaEvent);
    this.gaEvent.safeLoad(this.body, oldEvent);

    return await this.putSafeResource({ noOverwrite: false });
  }

  protected async patchResource(): Promise<GAEvent> {
    switch (this.body.action) {
      case 'ARCHIVE':
        return await this.manageArchive(true);
      case 'UNARCHIVE':
        return await this.manageArchive(false);
      default:
        throw new RCError('Unsupported action');
    }
  }
  private async manageArchive(archive: boolean): Promise<GAEvent> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    if (archive) this.gaEvent.archivedAt = new Date().toISOString();
    else delete this.gaEvent.archivedAt;

    await ddb.put({ TableName: DDB_TABLES.events, Item: this.gaEvent });
    return this.gaEvent;
  }

  protected async deleteResource(): Promise<void> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    const topics: Topic[] = await ddb.scan({ TableName: DDB_TABLES.topics, IndexName: 'topicId-meta-index' });
    const topicsWithEvent = topics.filter(x => x.event.eventId === this.gaEvent.eventId);
    if (topicsWithEvent.length > 0) throw new RCError('Event is used');

    await ddb.delete({ TableName: DDB_TABLES.events, Key: { eventId: this.gaEvent.eventId } });
  }
}
