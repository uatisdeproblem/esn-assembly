import { Resource, epochISOString } from 'idea-toolbox';

/**
 * The voting ticket of a voter in a sessions.
 */
export class VotingTicket extends Resource {
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
  voterName: string;
  /**
   * The email address to which the voting tokens are sent.
   */
  voterEmail: string;
  /**
   * A number with high precision that represents the weight of the voter.
   * If the vote is not weighted, it equals `1`.
   */
  weight: number;
  /**
   * The token to use for submitting the vote. This attribute is sensitive and should be available only to admins.
   */
  token: string;
  /**
   * The timestamp when the token has been used to start voting.
   */
  signedInAt?: epochISOString;
  /**
   * The timestamp when the vote has been submitted.
   */
  votedAt?: epochISOString;

  load(x: any): void {
    super.load(x);
    this.sessionId = this.clean(x.sessionId, String);
    this.voterId = this.clean(x.voterId, String);
    this.voterName = this.clean(x.voterName, String);
    this.voterEmail = this.clean(x.voterEmail, String)?.toLowerCase();
    this.weight = this.clean(x.weight, Number);
    this.token = this.clean(x.token, String);
    if (x.signedInAt) this.signedInAt = this.clean(x.signedInAt, String);
    if (x.votedAt) this.votedAt = this.clean(x.votedAt, String);
  }
}
