///
/// IMPORTS
///

import { DynamoDB, HandledError, ResourceController, SES } from 'idea-aws';

import { VotingSession } from '../models/votingSession.model';
import { VotingTicket } from '../models/votingTicket.model';
import { VotingResultForBallotOption } from '../models/votingResult.model';
import { Configurations } from '../models/configurations.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const DDB_TABLES = {
  votingSessions: process.env.DDB_TABLE_votingSessions,
  votingTickets: process.env.DDB_TABLE_votingTickets,
  votingResults: process.env.DDB_TABLE_votingResults,
  configurations: process.env.DDB_TABLE_configurations
};
const ddb = new DynamoDB();

const STAGE = process.env.STAGE;
const SES_CONFIG = {
  source: process.env.SES_SOURCE_ADDRESS,
  sourceArn: process.env.SES_IDENTITY_ARN,
  region: process.env.SES_REGION
};
const ses = new SES();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new VoteRC(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class VoteRC extends ResourceController {
  votingSession: VotingSession;

  constructor(event: any, callback: any) {
    super(event, callback);
    this.silentLambdaLogs(); // avoid logging the requests, for secrecy
  }

  protected async checkAuthBeforeRequest(): Promise<void> {
    const { sessionId } = this.pathParameters;

    try {
      this.votingSession = new VotingSession(
        await ddb.get({ TableName: DDB_TABLES.votingSessions, Key: { sessionId } })
      );
    } catch (err) {
      throw new HandledError('Voting session not found');
    }

    if (!this.votingSession.isForm()) throw new HandledError('Not a form-type voting session');
    if (!this.votingSession.isInProgress()) throw new HandledError('Voting session not in progress');
  }

  protected async getResources(): Promise<{ votingSession: VotingSession; votingTicket: VotingTicket }> {
    const { voterId, token } = this.queryParams;
    const votingTicket = await this.getVotingTicketAndCheckToken(voterId, token);

    if (votingTicket.votedAt) throw new HandledError('Already voted');

    if (!votingTicket.signedInAt) {
      votingTicket.signedInAt = new Date().toISOString();
      await ddb.update({
        TableName: DDB_TABLES.votingTickets,
        Key: { sessionId: this.votingSession.sessionId, voterId },
        UpdateExpression: 'SET signedInAt = :at',
        ExpressionAttributeValues: { ':at': votingTicket.signedInAt }
      });
    }

    return { votingSession: this.votingSession, votingTicket };
  }

  protected async postResources(): Promise<void> {
    if (!this.body.votingTicket || !this.body.submission) throw new HandledError('Bad request');

    const { voterId, token } = this.body.votingTicket;
    const votingTicket = await this.getVotingTicketAndCheckToken(voterId, token);

    if (votingTicket.votedAt) throw new HandledError('Already voted');
    votingTicket.votedAt = new Date().toISOString();
    votingTicket.userAgent = this.event.headers['user-agent'] ?? null;
    votingTicket.ipAddress = this.event.headers['x-forwarded-for'] ?? null;

    const errors = this.votingSession.validateVoteSubmission(this.body.submission);
    if (errors.length) throw new HandledError(`Invalid fields: ${errors.join(', ')}`);

    const updateVotingTicket = {
      TableName: DDB_TABLES.votingTickets,
      Key: { sessionId: this.votingSession.sessionId, voterId },
      ConditionExpression: 'attribute_not_exists(votedAt)',
      UpdateExpression: 'SET votedAt = :at, userAgent = :ua, ipAddress = :ip',
      ExpressionAttributeValues: {
        ':at': votingTicket.votedAt,
        ':ua': votingTicket.userAgent,
        ':ip': votingTicket.ipAddress
      }
    };
    const updateParticipantVoters = {
      TableName: DDB_TABLES.votingSessions,
      Key: { sessionId: this.votingSession.sessionId },
      UpdateExpression: 'SET participantVoters = list_append(if_not_exists(participantVoters, :emptyArr), :voters)',
      ExpressionAttributeValues: { ':voters': [votingTicket.voterName], ':emptyArr': [] as string[] }
    };
    const updateIncrementalResultForBallotOption = this.votingSession.ballots.map((_, bIndex): any => {
      const updateParams: any = {
        TableName: DDB_TABLES.votingResults,
        Key: {
          sessionId: this.votingSession.sessionId,
          ballotOption: VotingResultForBallotOption.getSK(bIndex, this.body.submission[bIndex])
        },
        ExpressionAttributeNames: { '#v': 'value' },
        UpdateExpression: 'SET #v = if_not_exists(#v, :zero) + :value',
        ExpressionAttributeValues: { ':value': votingTicket.weight, ':zero': 0 }
      };
      if (!this.votingSession.isSecret()) {
        updateParams.UpdateExpression += ', voters = list_append(if_not_exists(voters, :emptyArr), :voters)';
        updateParams.ExpressionAttributeValues[':voters'] = [votingTicket.voterName];
        updateParams.ExpressionAttributeValues[':emptyArr'] = [] as string[];
      }
      return updateParams;
    });

    await ddb.transactWrites([
      { Update: updateVotingTicket },
      { Update: updateParticipantVoters },
      ...updateIncrementalResultForBallotOption.map(x => ({ Update: x }))
    ]);

    try {
      await this.sendVotingConfirmationToVoter(votingTicket);
    } catch (error) {
      this.logger.warn('Voting confirmation failed to send', error, { votingTicket });
    }
  }
  private async sendVotingConfirmationToVoter(ticket: VotingTicket): Promise<void> {
    const template = `notify-voting-confirmation-${STAGE}`;
    const templateData = { user: ticket.voterName, title: this.votingSession.name };
    const { appTitle } = await ddb.get({ TableName: DDB_TABLES.configurations, Key: { PK: Configurations.PK } });
    const sesConfig = { ...SES_CONFIG, sourceName: appTitle };
    await ses.sendTemplatedEmail({ toAddresses: [ticket.voterEmail], template, templateData }, sesConfig);
  }

  private async getVotingTicketAndCheckToken(voterId: string, token: string): Promise<VotingTicket> {
    try {
      const votingTicket = new VotingTicket(
        await ddb.get({
          TableName: DDB_TABLES.votingTickets,
          Key: { sessionId: this.votingSession.sessionId, voterId }
        })
      );
      if (votingTicket.token !== token) throw new Error();
      return votingTicket;
    } catch (err) {
      throw new HandledError('Voter not found');
    }
  }
}
