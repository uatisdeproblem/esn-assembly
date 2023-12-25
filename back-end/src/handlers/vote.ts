///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController } from 'idea-aws';

import { VotingSession } from '../models/votingSession.model';
import { VotingTicket } from '../models/votingTicket.model';
import { Vote } from '../models/vote.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const PROJECT = process.env.PROJECT;
const DDB_TABLES = {
  votingSessions: process.env.DDB_TABLE_votingSessions,
  votingTickets: process.env.DDB_TABLE_votingTickets,
  votes: process.env.DDB_TABLE_votes
};
const ddb = new DynamoDB({ debug: false });
process.env.LOG_LEVEL = 'WARN'; // avoid logging the requests, for secrecy

export const handler = (ev: any, _: any, cb: any): Promise<void> => new VoteRC(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class VoteRC extends ResourceController {
  votingSession: VotingSession;

  constructor(event: any, callback: any) {
    super(event, callback);
  }

  protected async checkAuthBeforeRequest(): Promise<void> {
    const { sessionId } = this.pathParameters;

    try {
      this.votingSession = new VotingSession(
        await ddb.get({ TableName: DDB_TABLES.votingSessions, Key: { sessionId } })
      );
    } catch (err) {
      throw new RCError('Voting session not found');
    }

    if (!this.votingSession.isInProgress()) throw new RCError('Voting session not in progress');
  }

  protected async getResources(): Promise<{ votingSession: VotingSession; votingTicket: VotingTicket }> {
    const { voterId, token } = this.queryParams;
    const votingTicket = await this.getVotingTicketAndCheckToken(voterId, token);

    if (votingTicket.votedAt) throw new RCError('Already voted');

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
    if (!this.body.votingTicket || !this.body.submission) throw new RCError('Bad request');

    const { voterId, token } = this.body.votingTicket;
    const votingTicket = await this.getVotingTicketAndCheckToken(voterId, token);

    if (votingTicket.votedAt) throw new RCError('Already voted');
    votingTicket.votedAt = new Date().toISOString();

    const errors = Vote.validate(this.votingSession, this.body.submission);
    if (errors.length) throw new RCError(`Invalid fields: ${errors.join(', ')}`);

    const vote = new Vote({ sessionId: this.votingSession.sessionId });
    vote.key = await ddb.IUNID(PROJECT.concat('_', vote.sessionId));
    vote.submission = this.body.submission;
    if (!this.votingSession.isSecret) {
      vote.voterId = votingTicket.voterId;
      vote.voterName = votingTicket.voterName;
      vote.voterEmail = votingTicket.voterEmail;
    }

    const updateVotingTicket = {
      TableName: DDB_TABLES.votingTickets,
      Key: { sessionId: this.votingSession.sessionId, voterId },
      ConditionExpression: 'attribute_not_exists(votedAt)',
      UpdateExpression: 'SET votedAt = :at',
      ExpressionAttributeValues: { ':at': votingTicket.votedAt }
    };
    const putVote = { TableName: DDB_TABLES.votes, Item: vote };
    await ddb.transactWrites([{ Update: updateVotingTicket }, { Put: putVote }]);
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
      throw new RCError('Voter not found');
    }
  }
}
