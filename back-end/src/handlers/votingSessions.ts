///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController, SES } from 'idea-aws';
import { epochISOString } from 'idea-toolbox';

import { GAEventAttached } from '../models/event.model';
import { VotingSession } from '../models/votingSession.model';
import { User } from '../models/user.model';
import { VotingTicket } from '../models/votingTicket.model';
import { Configurations } from '../models/configurations.model';
import { VotingResultForBallotOption, VotingResults } from '../models/votingResult.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const PROJECT = process.env.PROJECT;
const STAGE = process.env.STAGE;
const DDB_TABLES = {
  votingSessions: process.env.DDB_TABLE_votingSessions,
  votingTickets: process.env.DDB_TABLE_votingTickets,
  votingResults: process.env.DDB_TABLE_votingResults,
  events: process.env.DDB_TABLE_events,
  configurations: process.env.DDB_TABLE_configurations
};
const ddb = new DynamoDB();

const APP_DOMAIN = process.env.APP_DOMAIN;
const VOTING_BASE_URL = `https://${APP_DOMAIN}/vote`;
const SES_CONFIG = {
  source: process.env.SES_SOURCE_ADDRESS,
  sourceArn: process.env.SES_IDENTITY_ARN,
  region: process.env.SES_REGION
};
const ses = new SES();

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
    this.votingSession.createdAt = new Date().toISOString();
    delete this.votingSession.startsAt;
    delete this.votingSession.endsAt;
    delete this.votingSession.results;
    delete this.votingSession.archivedAt;

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

    if (this.votingSession.hasStarted()) throw new RCError("Can't be changed after start");

    const oldSession = new VotingSession(this.votingSession);
    this.votingSession.safeLoad(this.body, oldSession);

    return await this.putSafeResource({ noOverwrite: false });
  }

  protected async patchResource(): Promise<VotingSession | VotingTicket[] | VotingResults> {
    switch (this.body.action) {
      case 'START':
        return await this.startVotingSession(this.body.endsAt, this.body.timezone);
      case 'TICKETS_STATUS':
        return await this.getVotingSessionTicketsStatus();
      case 'CHECK_EARLY_END':
        return await this.checkWhetherSessionShouldEndEarly();
      case 'GET_RESULTS':
        return await this.getVotingResults();
      case 'PUBLISH_RESULTS':
        return await this.publishVotingResults();
      case 'ARCHIVE':
        return await this.manageArchive(true);
      case 'UNARCHIVE':
        return await this.manageArchive(false);
      default:
        throw new RCError('Unsupported action');
    }
  }
  private async startVotingSession(endsAt: epochISOString, timezone: string): Promise<VotingSession> {
    if (!this.votingSession.canUserManage(this.galaxyUser)) throw new RCError('Unauthorized');

    if (this.votingSession.hasStarted()) throw new RCError("Can't be changed after start");

    this.votingSession.startsAt = new Date().toISOString();
    this.votingSession.endsAt = new Date(endsAt).toISOString();
    this.votingSession.timezone = timezone;

    const errors = this.votingSession.validate();
    if (errors.length) throw new RCError(`Invalid fields: ${errors.join(', ')}`);

    const sumOfWeights = this.votingSession.getTotWeights();
    const balancedWeights: Record<string, number> = {};
    this.votingSession.voters.forEach(
      voter => (balancedWeights[voter.id] = (this.votingSession.isWeighted ? voter.voteWeight : 1) / sumOfWeights)
    );

    const getSecretToken = (length = 7): string => Math.random().toString(36).slice(-length);
    const votingTickets = this.votingSession.voters.map(
      x =>
        new VotingTicket({
          sessionId: this.votingSession.sessionId,
          voterId: x.id,
          voterName: x.name,
          voterEmail: x.email,
          weight: balancedWeights[x.id],
          token: getSecretToken()
        })
    );
    try {
      await ddb.batchPut(DDB_TABLES.votingTickets, votingTickets);
    } catch (error) {
      this.logger.error('Voting ticket generation', error, { ...this.votingSession });
      throw new RCError('Failed voting ticket generation');
    }

    await ddb.put({ TableName: DDB_TABLES.votingSessions, Item: this.votingSession });

    for (const votingTicket of votingTickets) {
      try {
        await this.sendVotingTicketToVoter(votingTicket);
      } catch (error) {
        // it's ok if one email is not sent/received: we can send it again
        this.logger.warn('Voting ticket failed to send', error, { ...votingTicket });
        // possible improvement: manage bounces with SES? #53
      }
    }

    return this.votingSession;
  }
  private async sendVotingTicketToVoter(ticket: VotingTicket): Promise<void> {
    const template = `notify-voting-instructions-${STAGE}`;
    const templateData = {
      user: ticket.voterName,
      title: this.votingSession.name,
      url: `${VOTING_BASE_URL}/${this.votingSession.sessionId}?voterId=${ticket.voterId}&ticket=${ticket.token}`
    };
    const { appTitle } = await ddb.get({ TableName: DDB_TABLES.configurations, Key: { PK: Configurations.PK } });
    const sesConfig = { ...SES_CONFIG, sourceName: appTitle };
    await ses.sendTemplatedEmail({ toAddresses: [ticket.voterEmail], template, templateData }, sesConfig);
  }
  private async getVotingSessionTicketsStatus(): Promise<VotingTicket[]> {
    if (!this.votingSession.canUserManage(this.galaxyUser)) throw new RCError('Unauthorized');

    if (!this.votingSession.hasStarted()) throw new RCError("Session didn't start yet");

    let votingTickets: VotingTicket[] = await ddb.query({
      TableName: DDB_TABLES.votingTickets,
      KeyConditionExpression: 'sessionId = :sessionId',
      ExpressionAttributeValues: { ':sessionId': this.votingSession.sessionId }
    });
    votingTickets = votingTickets.map(x => new VotingTicket(x));
    votingTickets.forEach(x => delete x.token); // for security reasons, we don't expose the token
    return votingTickets;
  }
  private async checkWhetherSessionShouldEndEarly(): Promise<VotingSession> {
    if (!this.votingSession.canUserManage(this.galaxyUser)) throw new RCError('Unauthorized');

    if (!this.votingSession.isInProgress()) return this.votingSession;

    const votingTickets = (
      await ddb.query({
        TableName: DDB_TABLES.votingTickets,
        KeyConditionExpression: 'sessionId = :sessionId',
        ExpressionAttributeValues: { ':sessionId': this.votingSession.sessionId }
      })
    ).map(x => new VotingTicket(x));

    const everyoneVoted = votingTickets.filter(x => x.votedAt).length === this.votingSession.voters.length;
    if (!everyoneVoted) return this.votingSession;

    this.votingSession.endsAt = new Date().toISOString();
    await ddb.put({ TableName: DDB_TABLES.votingSessions, Item: this.votingSession });
    return this.votingSession;
  }
  private async getVotingResults(): Promise<VotingResults> {
    if (!this.votingSession.canUserManage(this.galaxyUser)) throw new RCError('Unauthorized');

    if (!this.votingSession.hasEnded()) throw new RCError('Session has not ended');

    const resultsForBallotOption = (
      await ddb.query({
        TableName: DDB_TABLES.votingResults,
        KeyConditionExpression: 'sessionId = :sessionId',
        ExpressionAttributeValues: { ':sessionId': this.votingSession.sessionId }
      })
    ).map(x => new VotingResultForBallotOption(x));

    const votingResult: VotingResults = [];
    this.votingSession.ballots.forEach((ballot, bIndex): void => {
      votingResult[bIndex] = ballot.options.map((): { value: number; voters?: string[] } => ({
        value: 0,
        voters: this.votingSession.isSecret ? undefined : []
      }));
    });
    resultsForBallotOption.forEach(x => {
      const { bIndex, oIndex } = x.getIndexesFromSK();
      votingResult[bIndex][oIndex].value = x.value;
      if (!this.votingSession.isSecret) votingResult[bIndex][oIndex].voters = x.voters ?? [];
    });

    return votingResult;
  }
  private async publishVotingResults(): Promise<VotingSession> {
    if (this.votingSession.results) throw new RCError('Already public');

    this.votingSession.results = await this.getVotingResults();

    await ddb.put({ TableName: DDB_TABLES.votingSessions, Item: this.votingSession });
    return this.votingSession;
  }
  private async manageArchive(archive: boolean): Promise<VotingSession> {
    if (!this.votingSession.canUserManage(this.galaxyUser)) throw new RCError('Unauthorized');

    if (archive) this.votingSession.archivedAt = new Date().toISOString();
    else delete this.votingSession.archivedAt;

    await ddb.put({ TableName: DDB_TABLES.votingSessions, Item: this.votingSession });
    return this.votingSession;
  }

  protected async deleteResource(): Promise<void> {
    if (!this.votingSession.canUserManage(this.galaxyUser)) throw new RCError('Unauthorized');

    await ddb.delete({ TableName: DDB_TABLES.votingSessions, Key: { sessionId: this.votingSession.sessionId } });

    try {
      const votingTickets: VotingTicket[] = await ddb.query({
        TableName: DDB_TABLES.votingTickets,
        KeyConditionExpression: 'sessionId = :sessionId',
        ExpressionAttributeValues: { ':sessionId': this.votingSession.sessionId },
        ProjectionExpression: 'sessionId, voterId'
      });
      await ddb.batchDelete(DDB_TABLES.votingTickets, votingTickets);
    } catch (error) {
      this.logger.warn('Failed deleting voting tickets', error, { ...this.votingSession });
    }

    try {
      const votingResults: VotingResultForBallotOption[] = await ddb.query({
        TableName: DDB_TABLES.votingResults,
        KeyConditionExpression: 'sessionId = :sessionId',
        ExpressionAttributeValues: { ':sessionId': this.votingSession.sessionId },
        ProjectionExpression: 'sessionId, ballotOption'
      });
      await ddb.batchDelete(DDB_TABLES.votingResults, votingResults);
    } catch (error) {
      this.logger.warn('Failed deleting voting results', error, { ...this.votingSession });
    }
  }
}
