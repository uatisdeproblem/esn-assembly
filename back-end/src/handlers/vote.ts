///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController } from 'idea-aws';

import { VotingSession } from '../models/votingSession.model';
import { Vote } from '../models/vote.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const DDB_TABLES = { votingSessions: process.env.DDB_TABLE_votingSessions, votes: process.env.DDB_TABLE_votes };
const ddb = new DynamoDB();

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
  }

  protected async getResources(): Promise<{ votingSession: VotingSession; vote: Vote }> {
    const { voterId, token } = this.queryParams;
    const votingTicket = await this.getVotingTicketAndCheckToken(voterId, token);

    if (votingTicket.submittedAt) throw new RCError('Already voted');

    if (!votingTicket.signedInAt) {
      votingTicket.signedInAt = new Date().toISOString();
      await ddb.update({
        TableName: DDB_TABLES.votes,
        Key: { sessionId: this.votingSession.sessionId, voterId },
        UpdateExpression: 'SET signedInAt = :at',
        ExpressionAttributeValues: { ':at': votingTicket.signedInAt }
      });
    }

    return { votingSession: this.votingSession, vote: votingTicket };
  }

  protected async postResources(): Promise<void> {
    const { voterId, token, submission } = this.body;
    const votingTicket = await this.getVotingTicketAndCheckToken(voterId, token);

    if (votingTicket.submittedAt) throw new RCError('Already voted');

    votingTicket.submittedAt = new Date().toISOString();
    votingTicket.submission = submission;

    const errors = votingTicket.validate(this.votingSession);
    if (errors.length) throw new RCError(`Invalid fields: ${errors.join(', ')}`);

    await ddb.update({
      TableName: DDB_TABLES.votes,
      Key: { sessionId: this.votingSession.sessionId, voterId },
      UpdateExpression: 'SET submittedAt = :at, submission = :submission',
      ExpressionAttributeValues: { ':at': votingTicket.submittedAt, ':submission': votingTicket.submission }
    });
  }

  private async getVotingTicketAndCheckToken(voterId: string, token: string): Promise<Vote> {
    try {
      const votingTicket = new Vote(
        await ddb.get({ TableName: DDB_TABLES.votes, Key: { sessionId: this.votingSession.sessionId, voterId } })
      );
      if (votingTicket.token !== token) throw new Error();
      return votingTicket;
    } catch (err) {
      throw new RCError('Voter not found');
    }
  }
}
