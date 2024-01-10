///
/// IMPORTS
///

import { DynamoDB, HandledError, ResourceController } from 'idea-aws';

import { User } from '../models/user.model';
import { UserDraft } from '../models/userDraft.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const DDB_TABLES = { drafts: process.env.DDB_TABLE_usersDrafts };
const ddb = new DynamoDB();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new UserDraftsRC(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class UserDraftsRC extends ResourceController {
  galaxyUser: User;
  draft: UserDraft;

  constructor(event: any, callback: any) {
    super(event, callback, { resourceId: 'draftId' });
    this.galaxyUser = new User(event.requestContext.authorizer.lambda.user);
  }

  protected async checkAuthBeforeRequest(): Promise<void> {
    if (!this.resourceId) return;

    try {
      this.draft = new UserDraft(
        await ddb.get({
          TableName: DDB_TABLES.drafts,
          Key: { userId: this.galaxyUser.userId, draftId: this.resourceId }
        })
      );
    } catch (err) {
      throw new HandledError('Draft not found');
    }
  }

  protected async getResources(): Promise<UserDraft[]> {
    let drafts = (
      await ddb.query({
        TableName: DDB_TABLES.drafts,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': this.galaxyUser.userId }
      })
    ).map(x => new UserDraft(x));
    if (this.queryParams.topicId) drafts = drafts.filter(d => d.refId === this.queryParams.topicId);
    else if (this.queryParams.questionId) drafts = drafts.filter(d => d.refId === this.queryParams.questionId);
    return drafts;
  }

  private async putSafeResource(opts: { noOverwrite: boolean }): Promise<UserDraft> {
    const errors = this.draft.validate();
    if (errors.length) throw new HandledError(`Invalid fields: ${errors.join(', ')}`);

    this.draft.expiresAt = getExpiresAt();

    const putParams: any = { TableName: DDB_TABLES.drafts, Item: this.draft };
    if (opts.noOverwrite) putParams.ConditionExpression = 'attribute_not_exists(draftId)';
    await ddb.put(putParams);

    return this.draft;
  }

  protected async postResources(): Promise<UserDraft> {
    this.draft = new UserDraft({ ...this.body, userId: this.galaxyUser.userId, draftId: new Date().toISOString() });
    return await this.putSafeResource({ noOverwrite: true });
  }

  protected async getResource(): Promise<UserDraft> {
    return this.draft;
  }

  protected async putResource(): Promise<UserDraft> {
    const oldDraft = new UserDraft(this.draft);
    this.draft.safeLoad(this.body, oldDraft);
    return await this.putSafeResource({ noOverwrite: false });
  }

  protected async deleteResource(): Promise<void> {
    await ddb.delete({
      TableName: DDB_TABLES.drafts,
      Key: { userId: this.galaxyUser.userId, draftId: this.draft.draftId }
    });
  }
}

const getExpiresAt = (numDays = 365): number => {
  const d = new Date();
  d.setDate(d.getDate() + numDays);
  return Math.floor(d.getTime() / 1000);
};
