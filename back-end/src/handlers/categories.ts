///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController } from 'idea-aws';

import { TopicCategory } from '../models/category.model';
import { Topic } from '../models/topic.model';
import { User } from '../models/user.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const PROJECT = process.env.PROJECT;
const DDB_TABLES = { categories: process.env.DDB_TABLE_categories, topics: process.env.DDB_TABLE_topics };
const ddb = new DynamoDB();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new TopicCategories(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class TopicCategories extends ResourceController {
  galaxyUser: User;
  topicCategory: TopicCategory;

  constructor(event: any, callback: any) {
    super(event, callback, { resourceId: 'categoryId' });
    this.galaxyUser = new User(event.requestContext.authorizer.lambda.user);
  }

  protected async checkAuthBeforeRequest(): Promise<void> {
    if (!this.resourceId) return;

    try {
      this.topicCategory = new TopicCategory(
        await ddb.get({ TableName: DDB_TABLES.categories, Key: { categoryId: this.resourceId } })
      );
    } catch (err) {
      throw new RCError('Category not found');
    }
  }

  protected async getResources(): Promise<TopicCategory[]> {
    let categories: TopicCategory[] = await ddb.scan({ TableName: DDB_TABLES.categories });
    categories = categories.map(x => new TopicCategory(x));
    if (!this.queryParams.all) categories = categories.filter(x => !x.archivedAt);
    return categories.sort((a, b): number => a.name.localeCompare(b.name));
  }

  private async putSafeResource(opts: { noOverwrite: boolean }): Promise<TopicCategory> {
    const errors = this.topicCategory.validate();
    if (errors.length) throw new RCError(`Invalid fields: ${errors.join(', ')}`);

    const putParams: any = { TableName: DDB_TABLES.categories, Item: this.topicCategory };
    if (opts.noOverwrite) putParams.ConditionExpression = 'attribute_not_exists(categoryId)';
    await ddb.put(putParams);

    return this.topicCategory;
  }

  protected async postResources(): Promise<TopicCategory> {
    if (!this.galaxyUser.isAdministrator()) throw new RCError('Unauthorized');

    this.topicCategory = new TopicCategory(this.body);
    this.topicCategory.categoryId = await ddb.IUNID(PROJECT);

    return await this.putSafeResource({ noOverwrite: true });
  }

  protected async getResource(): Promise<TopicCategory> {
    return this.topicCategory;
  }

  protected async putResource(): Promise<TopicCategory> {
    if (!this.galaxyUser.isAdministrator()) throw new RCError('Unauthorized');

    const oldCategory = new TopicCategory(this.topicCategory);
    this.topicCategory.safeLoad(this.body, oldCategory);

    return await this.putSafeResource({ noOverwrite: false });
  }

  protected async patchResource(): Promise<TopicCategory> {
    switch (this.body.action) {
      case 'ARCHIVE':
        return await this.manageArchive(true);
      case 'UNARCHIVE':
        return await this.manageArchive(false);
      default:
        throw new RCError('Unsupported action');
    }
  }
  private async manageArchive(archive: boolean): Promise<TopicCategory> {
    if (!this.galaxyUser.isAdministrator()) throw new RCError('Unauthorized');

    if (archive) this.topicCategory.archivedAt = new Date().toISOString();
    else delete this.topicCategory.archivedAt;

    await ddb.put({ TableName: DDB_TABLES.categories, Item: this.topicCategory });
    return this.topicCategory;
  }

  protected async deleteResource(): Promise<void> {
    if (!this.galaxyUser.isAdministrator()) throw new RCError('Unauthorized');

    const topics: Topic[] = await ddb.scan({ TableName: DDB_TABLES.topics, IndexName: 'topicId-meta-index' });
    const topicsWithCategory = topics.filter(x => x.category.categoryId === this.topicCategory.categoryId);
    if (topicsWithCategory.length > 0) throw new RCError('Category is used');

    await ddb.delete({ TableName: DDB_TABLES.categories, Key: { categoryId: this.topicCategory.categoryId } });
  }
}
