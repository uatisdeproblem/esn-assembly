///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController } from 'idea-aws';

import { User } from '../models/user.model';
import { UserBadge, Badges } from '../models/userBadge.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const DDB_TABLES = { usersBadges: process.env.DDB_TABLE_usersBadges };
const ddb = new DynamoDB();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new BadgesRC(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class BadgesRC extends ResourceController {
  galaxyUser: User;
  userBadge: UserBadge;

  constructor(event: any, callback: any) {
    super(event, callback, { resourceId: 'badge' });
    this.galaxyUser = new User(event.requestContext.authorizer.lambda.user);
  }

  protected async checkAuthBeforeRequest(): Promise<void> {
    if (!this.resourceId) return;

    try {
      this.userBadge = new UserBadge(
        await ddb.get({
          TableName: DDB_TABLES.usersBadges,
          Key: { userId: this.galaxyUser.userId, badge: this.resourceId }
        })
      );
    } catch (err) {
      throw new RCError('Badge not found');
    }
  }

  protected async getResources(): Promise<UserBadge[]> {
    let usersBadges: UserBadge[] = await ddb.query({
      TableName: DDB_TABLES.usersBadges,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': this.galaxyUser.userId }
    });
    usersBadges = usersBadges.map(x => new UserBadge(x));
    return usersBadges.sort((a, b): number => b.earnedAt.localeCompare(a.earnedAt));
  }

  protected async getResource(): Promise<UserBadge> {
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
}

export const addBadgeToUser = async (ddb: DynamoDB, user: User, badge: Badges): Promise<void> => {
  try {
    const userBadge = new UserBadge({ userId: user.userId, badge });
    await ddb.put({
      TableName: DDB_TABLES.usersBadges,
      Item: userBadge,
      ConditionExpression: 'attribute_not_exists(userId) AND attribute_not_exists(badge)'
    });
  } catch (error) {
    // user already has the badge
  }
};
