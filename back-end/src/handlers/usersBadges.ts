///
/// IMPORTS
///

import { DynamoDB, HandledError, ResourceController } from 'idea-aws';

import { User } from '../models/user.model';
import { Badge, UserBadge } from '../models/badge.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const DDB_TABLES = { badges: process.env.DDB_TABLE_badges, usersBadges: process.env.DDB_TABLE_usersBadges };
const ddb = new DynamoDB();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new UsersBadgesRC(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class UsersBadgesRC extends ResourceController {
  galaxyUser: User;
  userBadge: UserBadge;

  constructor(event: any, callback: any) {
    super(event, callback, { resourceId: 'badge' });
    this.galaxyUser = new User(event.requestContext.authorizer.lambda.user);
  }

  protected async getResources(): Promise<UserBadge[]> {
    const userId =
      this.queryParams.userId && this.galaxyUser.isAdministrator ? this.queryParams.userId : this.galaxyUser.userId;
    let usersBadges: UserBadge[] = await ddb.query({
      TableName: DDB_TABLES.usersBadges,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    });
    usersBadges = usersBadges.map(x => new UserBadge(x));
    return usersBadges.sort((a, b): number => b.earnedAt.localeCompare(a.earnedAt));
  }

  protected async getResource(): Promise<UserBadge> {
    try {
      this.userBadge = new UserBadge(
        await ddb.get({
          TableName: DDB_TABLES.usersBadges,
          Key: { userId: this.galaxyUser.userId, badge: this.resourceId }
        })
      );
    } catch (err) {
      throw new HandledError('Badge not found');
    }

    if (!this.userBadge.firstSeenAt) {
      this.userBadge.firstSeenAt = new Date().toISOString();
      await ddb.update({
        TableName: DDB_TABLES.usersBadges,
        Key: { userId: this.galaxyUser.userId, badge: this.resourceId },
        UpdateExpression: 'SET firstSeenAt = :firstSeenAt',
        ExpressionAttributeValues: { ':firstSeenAt': this.userBadge.firstSeenAt }
      });
    }
    return this.userBadge;
  }

  protected async postResource(): Promise<void> {
    if (!this.galaxyUser.isAdministrator) throw new HandledError('Unauthorized');

    const { userId } = this.queryParams;
    const badge = this.resourceId;

    if (!userId) throw new HandledError('No target user');
    if (!badge) throw new HandledError('No target badge');

    if (!Badge.isBuiltIn(badge)) {
      try {
        await ddb.get({ TableName: DDB_TABLES.badges, Key: { badgeId: badge } });
      } catch (error) {
        throw new HandledError('Target badge not found');
      }
    }

    await addBadgeToUser(ddb, userId, badge);
  }

  protected async deleteResource(): Promise<void> {
    if (!this.galaxyUser.isAdministrator) throw new HandledError('Unauthorized');

    const { userId } = this.queryParams;
    const badge = this.resourceId;

    if (!userId) throw new HandledError('No target user');

    await ddb.delete({ TableName: DDB_TABLES.usersBadges, Key: { userId, badge } });
  }
}

export const addBadgeToUser = async (ddb: DynamoDB, userId: string, badge: string): Promise<void> => {
  try {
    const userBadge = new UserBadge({ userId, badge });
    await ddb.put({
      TableName: DDB_TABLES.usersBadges,
      Item: userBadge,
      ConditionExpression: 'attribute_not_exists(userId) AND attribute_not_exists(badge)'
    });
  } catch (error) {
    // user already has the badge
  }
};
