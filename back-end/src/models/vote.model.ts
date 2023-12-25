import { Resource } from 'idea-toolbox';

import { VotingSession } from './votingSession.model';

/**
 * The vote of a voter (using a ticket) in a session.
 */
export class Vote extends Resource {
  /**
   * The ID of the voting session.
   */
  sessionId: string;
  /**
   * A unique random string to use as SK.
   */
  key: string;
  /**
   * The ID of the voter. Only if the vote is public.
   */
  voterId?: string;
  /**
   * The name of the voter. Only if the vote is public.
   */
  voterName?: string;
  /**
   * The email of the voter. Only if the vote is public.
   */
  voterEmail?: string;
  /**
   * The vote for each of the ballots of the session.
   */
  submission: string[];

  load(x: any): void {
    super.load(x);
    this.sessionId = this.clean(x.sessionId, String);
    this.key = this.clean(x.key, String);
    if (x.voterId) this.voterId = this.clean(x.voterId, String);
    if (x.voterName) this.voterName = this.clean(x.voterName, String);
    if (x.voterEmail) this.voterEmail = this.clean(x.voterEmail, String);
    this.submission = this.cleanArray(x.submission, String);
  }

  /**
   * Validate a vote against a voting session.
   */
  static validate(votingSession: VotingSession, submission: string[]): string[] {
    const e = [];
    if (!Array.isArray(submission)) e.push('submission');
    votingSession.ballots.forEach((b, i): void => {
      if (!submission[i] || !b.options.includes(submission[i])) e.push(`submission[${i}]`);
    });
    return e;
  }
}
