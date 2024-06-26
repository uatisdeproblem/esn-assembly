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
   * Note: it's balanced based on the sum of the weights of the voters [0, 1].
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
  /**
   * The user agent of the device used at the time of the voting. Used for fraud detection.
   */
  userAgent?: string;
  /**
   * The IP address of the device used at the time of the voting. Used for fraud detection.
   */
  ipAddress?: string;

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
    if (x.userAgent) this.userAgent = this.clean(x.userAgent, String);
    if (x.ipAddress) this.ipAddress = this.clean(x.ipAddress, String);
  }
}

/**
 * A flat, exportable version of a voting ticket.
 */
export interface ExportableVotingTicket {
  Name: string;
  'Vote identifier': string;
  'IP address': string;
  'User agent': string;
  'Vote date/time': string;
}
