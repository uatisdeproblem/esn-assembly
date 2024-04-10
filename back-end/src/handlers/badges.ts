///
/// IMPORTS
///

import { DynamoDB, HandledError, ResourceController } from 'idea-aws';

import { User } from '../models/user.model';
import { Badge } from '../models/badge.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const PROJECT = process.env.PROJECT;
const DDB_TABLES = { badges: process.env.DDB_TABLE_badges };
const ddb = new DynamoDB();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new BadgesRC(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class BadgesRC extends ResourceController {
  galaxyUser: User;
  badge: Badge;

  constructor(event: any, callback: any) {
    super(event, callback, { resourceId: 'badge' });
    this.galaxyUser = new User(event.requestContext.authorizer.lambda.user);
  }

  protected async checkAuthBeforeRequest(): Promise<void> {
    if (!this.resourceId) return;

    try {
      this.badge = new Badge(await ddb.get({ TableName: DDB_TABLES.badges, Key: { badgeId: this.resourceId } }));
    } catch (err) {
      throw new HandledError('Badge not found');
    }
  }

  protected async getResources(): Promise<Badge[]> {
    const badges = (await ddb.scan({ TableName: DDB_TABLES.badges })).map(b => new Badge(b));
    return badges.sort((a, b): number => a.name.localeCompare(b.name));
  }

  protected async getResource(): Promise<Badge> {
    return this.badge;
  }

  protected async postResources(): Promise<Badge> {
    if (!this.galaxyUser.isAdministrator) throw new HandledError('Unauthorized');

    this.badge = new Badge(this.body);
    this.badge.badgeId = await ddb.IUNID(PROJECT);

    await this.putSafeResource({ noOverwrite: true });

    return this.badge;
  }

  protected async putResource(): Promise<Badge> {
    if (!this.galaxyUser.isAdministrator) throw new HandledError('Unauthorized');

    const oldBadge = new Badge(this.badge);
    this.badge.safeLoad(this.body, oldBadge);

    return await this.putSafeResource({ noOverwrite: false });
  }

  protected async deleteResource(): Promise<void> {
    if (!this.galaxyUser.isAdministrator) throw new HandledError('Unauthorized');

    await ddb.delete({ TableName: DDB_TABLES.badges, Key: { badgeId: this.resourceId } });
  }

  private async putSafeResource(opts: { noOverwrite: boolean }): Promise<Badge> {
    const errors = this.badge.validate();
    if (errors.length) throw new HandledError(`Invalid fields: ${errors.join(', ')}`);

    const putParams: any = { TableName: DDB_TABLES.badges, Item: this.badge };
    if (opts.noOverwrite) putParams.ConditionExpression = 'attribute_not_exists(badgeId)';
    await ddb.put(putParams);

    return this.badge;
  }
}
