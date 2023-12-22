///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController } from 'idea-aws';

import { GAEventAttached } from '../models/event.model';
import { VotingSession } from '../models/votingSession.model';
import { User } from '../models/user.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const PROJECT = process.env.PROJECT;
const DDB_TABLES = {
  votingSessions: process.env.DDB_TABLE_votingSessions,
  events: process.env.DDB_TABLE_events
};
const ddb = new DynamoDB();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new VotingSessionsRC(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class VotingSessionsRC extends ResourceController {
  galaxyUser: User;
  votingSession: VotingSession;

  constructor(event: any, callback: any) {
    super(event, callback, { resourceId: 'sessionId' });
    this.galaxyUser = new User(event.requestContext.authorizer.lambda.user);
  }

  protected async checkAuthBeforeRequest(): Promise<void> {
    if (!this.resourceId) return;

    try {
      this.votingSession = new VotingSession(
        await ddb.get({ TableName: DDB_TABLES.votingSessions, Key: { sessionId: this.resourceId } })
      );
    } catch (err) {
      throw new RCError('Voting session not found');
    }
  }

  protected async getResources(): Promise<VotingSession[]> {
    let votingSessions: VotingSession[] = await ddb.scan({ TableName: DDB_TABLES.votingSessions });
    votingSessions = votingSessions.map(x => new VotingSession(x));

    if (!this.galaxyUser.isAdministrator)
      votingSessions = votingSessions.filter(x => !x.isDraft() || x.canUserManage(this.galaxyUser));

    if (this.queryParams.archived !== undefined) {
      const archived = this.queryParams.archived !== 'false';
      votingSessions = votingSessions.filter(x => (archived ? x.isArchived() : !x.isArchived()));
    }
    if (this.queryParams.eventId)
      votingSessions = votingSessions.filter(x => x.event.eventId === this.queryParams.eventId);

    votingSessions = votingSessions.sort((a, b): number => b.createdAt.localeCompare(a.createdAt));

    return votingSessions;
  }

  private async putSafeResource(opts: { noOverwrite: boolean }): Promise<VotingSession> {
    const errors = this.votingSession.validate();
    if (errors.length) throw new RCError(`Invalid fields: ${errors.join(', ')}`);

    if (this.votingSession.event?.eventId) {
      try {
        this.votingSession.event = new GAEventAttached(
          await ddb.get({ TableName: DDB_TABLES.events, Key: { eventId: this.votingSession.event.eventId } })
        );
      } catch (error) {
        throw new RCError('Event not found');
      }
    }

    const putParams: any = { TableName: DDB_TABLES.votingSessions, Item: this.votingSession };
    if (opts.noOverwrite) putParams.ConditionExpression = 'attribute_not_exists(sessionId)';
    else this.votingSession.updatedAt = new Date().toISOString();

    await ddb.put(putParams);

    return this.votingSession;
  }

  protected async postResources(): Promise<VotingSession> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    this.votingSession = new VotingSession(this.body);
    this.votingSession.sessionId = await ddb.IUNID(PROJECT);

    await this.putSafeResource({ noOverwrite: true });

    return this.votingSession;
  }

  protected async getResource(): Promise<VotingSession> {
    if (this.votingSession.isDraft() && !this.votingSession.canUserManage(this.galaxyUser))
      throw new RCError('Unauthorized');

    return this.votingSession;
  }

  protected async putResource(): Promise<VotingSession> {
    if (!this.votingSession.canUserManage(this.galaxyUser)) throw new RCError('Unauthorized');

    const oldSession = new VotingSession(this.votingSession);
    this.votingSession.safeLoad(this.body, oldSession);

    return await this.putSafeResource({ noOverwrite: false });
  }

  protected async patchResource(): Promise<VotingSession | string[]> {
    switch (this.body.action) {
      case 'ARCHIVE':
        return await this.manageArchive(true);
      case 'UNARCHIVE':
        return await this.manageArchive(false);
      default:
        throw new RCError('Unsupported action');
    }
  }
  private async manageArchive(archive: boolean): Promise<VotingSession> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');
    if (this.votingSession.isInProgress()) throw new RCError('In progress');

    if (archive) {
      this.votingSession.archivedAt = new Date().toISOString();
    } else delete this.votingSession.archivedAt;

    await ddb.put({ TableName: DDB_TABLES.votingSessions, Item: this.votingSession });
    return this.votingSession;
  }

  protected async deleteResource(): Promise<void> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    await ddb.delete({ TableName: DDB_TABLES.votingSessions, Key: { sessionId: this.votingSession.sessionId } });
  }
}
