///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController } from 'idea-aws';

import { User } from '../models/user.model';
import { Deadline } from '../models/deadline.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const PROJECT = process.env.PROJECT;
const DDB_TABLES = { deadlines: process.env.DDB_TABLE_deadlines };
const ddb = new DynamoDB();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new Deadlines(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class Deadlines extends ResourceController {
  galaxyUser: User;
  deadline: Deadline;

  constructor(event: any, callback: any) {
    super(event, callback, { resourceId: 'deadlineId' });
    this.galaxyUser = new User(event.requestContext.authorizer.lambda.user);
  }

  protected async checkAuthBeforeRequest(): Promise<void> {
    if (!this.resourceId) return;

    try {
      this.deadline = new Deadline(
        await ddb.get({ TableName: DDB_TABLES.deadlines, Key: { deadlineId: this.resourceId } })
      );
    } catch (err) {
      throw new RCError('Link not found');
    }
  }

  protected async getResources(): Promise<Deadline[]> {
    let deadlines: Deadline[] = await ddb.scan({ TableName: DDB_TABLES.deadlines });
    deadlines = deadlines.map(x => new Deadline(x));
    return deadlines.sort((a, b): number => a.at.localeCompare(b.at)).filter(x => x.at >= new Date().toISOString());
  }

  private async putSafeResource(opts: { noOverwrite: boolean }): Promise<Deadline> {
    const errors = this.deadline.validate();
    if (errors.length) throw new RCError(`Invalid fields: ${errors.join(', ')}`);

    const putParams: any = { TableName: DDB_TABLES.deadlines, Item: this.deadline };
    if (opts.noOverwrite) putParams.ConditionExpression = 'attribute_not_exists(deadlineId)';
    await ddb.put(putParams);

    return this.deadline;
  }

  protected async postResources(): Promise<Deadline> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    this.deadline = new Deadline(this.body);
    this.deadline.deadlineId = await ddb.IUNID(PROJECT);

    return await this.putSafeResource({ noOverwrite: true });
  }

  protected async getResource(): Promise<Deadline> {
    return this.deadline;
  }

  protected async putResource(): Promise<Deadline> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    const oldDeadline = new Deadline(this.deadline);
    this.deadline.safeLoad(this.body, oldDeadline);

    return await this.putSafeResource({ noOverwrite: false });
  }

  protected async deleteResource(): Promise<void> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    await ddb.delete({ TableName: DDB_TABLES.deadlines, Key: { deadlineId: this.deadline.deadlineId } });
  }
}
