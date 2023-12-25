import { epochISOString, Resource } from 'idea-toolbox';

import { GAEventAttached } from './event.model';
import { User } from './user.model';
import { Vote } from './vote.model';

/**
 * A session in which users can vote.
 */
export class VotingSession extends Resource {
  /**
   * The ID of the voting session.
   */
  sessionId: string;
  /**
   * A title for the voting session.
   */
  name: string;
  /**
   * A description of the voting session.
   */
  description: string;
  /**
   * Whether the session is secret or public.
   */
  isSecret: boolean;
  /**
   * Whether the voting is weighted or not.
   */
  isWeighted: boolean;
  /**
   * The event for which the voting session is taken (if any).
   */
  event: GAEventAttached | null;
  /**
   * The timestamp of creation.
   */
  createdAt: epochISOString;
  /**
   * The timestamp of last update.
   */
  updatedAt?: epochISOString;
  /**
   * The timestamp since the voting session is considered published.
   * If not set, it's a draft; drafts are displayed only to administrators.
   * If set in the future, it means the publishing has been scheduled.
   */
  publishedSince?: string;
  /**
   * The IDs of the users who can manage the session and see the results before they are published.
   */
  scrutineersIds: string[];
  /**
   * The ballots for the voting session.
   */
  ballots: VotingBallot[];
  /**
   * The voters for the voting session.
   * Technical note: the current architecture supports hundreds, maybe a few thousands of voters, no more.
   */
  voters: Voter[];
  /**
   * The timestamp when the voting session started. If not set, or in the future, the session hasn't started yet.
   */
  startsAt: epochISOString | null;
  /**
   * The timestamp of end of the voting session. If set and past, the voting session has ended.
   */
  endsAt: epochISOString | null;
  /**
   * A timezone for the timestamps of start and end of the voting session.
   */
  timezone: string;
  /**
   * The results of the voting session, in case they are published.
   */
  results?: ResultForBallotOption[][];
  /**
   * The timestamp when the voting session was archived.
   */
  archivedAt?: epochISOString;

  load(x: any): void {
    super.load(x);
    this.sessionId = this.clean(x.sessionId, String);
    this.name = this.clean(x.name, String);
    this.description = this.clean(x.description, String);
    this.isSecret = this.clean(x.isSecret, Boolean, false);
    this.isWeighted = this.clean(x.isWeighted, Boolean, false);
    this.event = x.event?.eventId ? new GAEventAttached(x.event) : null;
    this.createdAt = this.clean(x.createdAt, d => new Date(d).toISOString(), new Date().toISOString());
    if (x.updatedAt) this.updatedAt = this.clean(x.updatedAt, d => new Date(d).toISOString());
    if (x.publishedSince) this.publishedSince = this.clean(x.publishedSince, d => new Date(d).toISOString());
    else delete this.publishedSince;
    this.ballots = this.cleanArray(x.ballots, b => new VotingBallot(b));
    this.voters = this.cleanArray(x.voters, v => new Voter(v, this));
    this.startsAt = this.clean(x.startsAt, d => new Date(d).toISOString());
    this.endsAt = this.clean(x.endsAt, d => new Date(d).toISOString());
    this.timezone = this.clean(x.timezone, String);
    this.scrutineersIds = this.cleanArray(x.scrutineersIds, String).map(x => x.toLowerCase());
    if (!this.hasEnded()) delete this.results;
    else if (x.results) this.results = x.results;
    if (x.archivedAt) this.archivedAt = this.clean(x.archivedAt, d => new Date(d).toISOString());
  }

  safeLoad(newData: any, safeData: any): void {
    super.safeLoad(newData, safeData);
    this.sessionId = safeData.sessionId;
    this.isWeighted = safeData.isWeighted;
    this.createdAt = safeData.createdAt;
    if (safeData.updatedAt) this.updatedAt = safeData.updatedAt;
    this.startsAt = safeData.startsAt;
    if (safeData.results) this.results = safeData.results;
    if (safeData.archivedAt) this.archivedAt = safeData.archivedAt;
  }

  validate(checkIfReady = false): string[] {
    const e = super.validate();
    if (this.iE(this.name)) e.push('name');
    this.ballots.forEach((b, i): void => b.validate().forEach(ea => e.push(`ballots[${i}].${ea}`)));
    this.voters.forEach((v, i): void => v.validate(this).forEach(ea => e.push(`voters[${i}].${ea}`)));

    if (checkIfReady || this.startsAt) {
      if (this.iE(this.publishedSince, 'date') || this.publishedSince > new Date().toISOString())
        e.push('publishedSince');
      if (this.iE(this.ballots)) e.push('ballots');
      if (this.iE(this.voters)) e.push('voters');
      const votersIds = this.voters.map(x => x.id);
      const votersNames = this.voters.map(x => x.name);
      const votersEmails = this.voters.map(x => x.email?.toLowerCase()).filter(x => x);
      if (votersIds.length !== new Set(votersIds).size) e.push('voters.duplicatedIds');
      if (votersNames.length !== new Set(votersNames).size) e.push('voters.duplicatedNames');
      if (votersEmails.length !== new Set(votersEmails).size) e.push('voters.duplicatedEmails');
      if (this.voters.filter(x => !x.email).length) e.push('voters.missingEmails');
      if (this.startsAt) {
        const tenMinutes = new Date();
        tenMinutes.setMinutes(tenMinutes.getMinutes() + 10);
        if (this.iE(this.endsAt, 'date') || this.startsAt > this.endsAt || tenMinutes.toISOString() > this.endsAt)
          e.push('endsAt');
        if (this.iE(this.timezone)) e.push('timezone');
      }
    }
    return e;
  }

  /**
   * Whether the voting session is a draft (hence visible only to administrators); otherwise, it's considered published.
   */
  isDraft(): boolean {
    return !this.publishedSince || this.publishedSince > new Date().toISOString();
  }

  /**
   * Whether the voting session is archived.
   */
  isArchived(): boolean {
    return !!this.archivedAt;
  }

  /**
   * Whether the voting session has ended. Note: it returns true even if the session ended (but it has started).
   */
  hasStarted(): boolean {
    return this.startsAt && this.startsAt < new Date().toISOString();
  }
  /**
   * Whether the voting session has started and ended.
   */
  hasEnded(): boolean {
    return this.hasStarted() && this.endsAt < new Date().toISOString();
  }
  /**
   * Whether the voting session is in progress (started but not ended).
   */
  isInProgress(): boolean {
    return this.hasStarted() && !this.hasEnded();
  }

  /**
   * Whether the user can manage the voting session.
   */
  canUserManage(user: User): boolean {
    return user.isAdministrator || this.scrutineersIds.includes(user.userId);
  }

  /**
   * Get the total of the voting weights.
   */
  getTotWeights(): number {
    if (!this.isWeighted) return 1;
    else return this.voters.reduce((tot, acc): number => (tot += acc.voteWeight), 0);
  }

  /**
   * Calculate and return the results from the votes of the session.
   */
  generateResults(votes: Vote[]): ResultForBallotOption[][] {
    const results: ResultForBallotOption[][] = [];

    const sumOfWeights = this.getTotWeights();
    const votersWeights: Record<string, number> = {};
    this.voters.forEach(
      voter => (votersWeights[voter.id] = this.isWeighted ? voter.voteWeight / sumOfWeights : 1 / this.voters.length)
    );

    this.ballots.forEach((ballot, bIndex): void => {
      results[bIndex] = [];
      ballot.options.forEach((option, oIndex): void => {
        results[bIndex][oIndex] = { numVotes: 0, weightedPercentage: 0, voters: [] };
        votes.forEach(vote => {
          const choice = vote.submission[bIndex];
          if (choice === option) {
            results[bIndex][oIndex].numVotes++;
            results[bIndex][oIndex].weightedPercentage += votersWeights[vote.voterId];
            if (!this.isSecret) results[bIndex][oIndex].voters.push(vote.voterName);
          }
        });
      });
    });
    return results;
  }
}

/**
 * A voting ballot.
 */
export class VotingBallot extends Resource {
  /**
   * The text of the ballot.
   */
  text: string;
  /**
   * The type of majority used for the results calculations.
   */
  majorityType: VotingMajorityTypes;
  /**
   * The options for the ballot.
   */
  options: string[];

  load(x: any): void {
    super.load(x);
    this.text = this.clean(x.text, String);
    this.majorityType = this.clean(x.majorityType, String, VotingMajorityTypes.RELATIVE);
    this.options = this.cleanArray(x.options, String);
  }

  validate(): string[] {
    const e = super.validate();
    if (this.iE(this.text)) e.push('text');
    if (!Object.values(VotingMajorityTypes).includes(this.majorityType)) e.push('majorityType');
    if (this.options.filter(x => x?.trim()).length < 2) e.push('options');
    return e;
  }
}

/**
 * The type of majorities available for a ballot.
 */
export enum VotingMajorityTypes {
  RELATIVE = 'RELATIVE',
  SIMPLE = 'SIMPLE',
  TWO_THIRDS = 'TWO_THIRDS'
}

/**
 * A voter for a voting session.
 */
export class Voter extends Resource {
  /**
   * An identifier for the voter.
   */
  id: string;
  /**
   * An identifiable name for the voter (e.g. ESN country or ESN section).
   */
  name: string;
  /**
   * The email address to which the voting tokens will be sent.
   */
  email: string;
  /**
   * A number with high precision that represents the weight of the voter.
   * If the vote is not weighted, it equals `null`.
   */
  voteWeight: number | null;

  load(x: any, votingSession: VotingSession): void {
    super.load(x);
    this.id = this.clean(x.id, String, Math.random().toString(36).slice(-7).toUpperCase());
    this.name = this.clean(x.name, String);
    this.email = this.clean(x.email, String);
    if (votingSession.isWeighted) this.voteWeight = this.clean(x.voteWeight, w => Math.round(Number(w)));
    else this.voteWeight = null;
  }

  validate(votingSession: VotingSession): string[] {
    const e = super.validate();
    if (this.iE(this.id)) e.push('id');
    if (this.iE(this.name)) e.push('name');
    if (this.email && this.iE(this.email, 'email')) e.push('email');
    if (votingSession.isWeighted && (this.voteWeight < 1 || this.voteWeight > 999_999)) e.push('voteWeight');

    if (votingSession.startsAt) {
      if (this.iE(this.email, 'email')) e.push('email');
    }
    return e;
  }
}

/**
 * The result of a ballot's option.
 */
export interface ResultForBallotOption {
  numVotes: number;
  weightedPercentage: number;
  voters: string[];
}
