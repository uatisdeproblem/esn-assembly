import { Resource, epochISOString } from 'idea-toolbox';

import { VotingSession } from './votingSession.model';

/**
 * The vote of a voter in a voting sessions.
 */
export class Vote extends Resource {
  /**
   * The ID of the voting session.
   */
  sessionId: string;
  /**
   * The ID of the voter.
   */
  voterId: string;
  /**
   * An identifiable name for the voter (e.g. ESN country or ESN section).
   */
  name: string;
  /**
   * The email address to which the voting tokens are sent.
   */
  email: string;
  /**
   * The token to use for submitting the vote.
   */
  token: string;

  /**
   * Wether the voting ticket has been received.
   * @todo improvement: manage with SES bounces?
   */
  ticketReceivedAt?: epochISOString;
  /**
   * Wether the token has been used to start the vote.
   */
  signedInAt?: epochISOString;

  /**
   * The timestamp when the vote has been submitted (if it happened).
   */
  submittedAt?: epochISOString;
  /**
   * The vote for each of the ballots of the voting session.
   * Set if `submittedAt`.
   */
  submission?: string[];

  load(x: any): void {
    super.load(x);
    this.sessionId = this.clean(x.sessionId, String);
    this.voterId = this.clean(x.voterId, String);
    this.name = this.clean(x.name, String);
    this.email = this.clean(x.email, String);
    this.token = this.clean(x.token, String);

    if (x.ticketReceivedAt) this.ticketReceivedAt = this.clean(x.ticketReceivedAt, String);
    if (x.signedInAt) this.signedInAt = this.clean(x.signedInAt, String);

    if (x.submittedAt) this.submittedAt = this.clean(x.submittedAt, String);
    if (this.submittedAt && x.submission) this.submission = this.cleanArray(x.submission, String);
  }

  validate(votingSession: VotingSession): string[] {
    const e = super.validate();
    if (this.iE(this.submission)) e.push('submission');
    votingSession.ballots.forEach((b, i): void => {
      if (this.iE(this.submission[i]) || !b.options.includes(this.submission[i])) e.push(`submission[${i}]`);
    });
    return e;
  }
}
