import { epochISOString, Resource } from 'idea-toolbox';

import { GAEventAttached } from './event.model';
import { User } from './user.model';
import { VotingResults } from './votingResult.model';

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
   * The type of voting session.
   */
  type: VotingSessionTypes;
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
   * Max: 50 ballots. Note: it's a technical limit that shouldn't be raised, to keep the current architecture simple.
   */
  ballots: VotingBallot[];
  /**
   * The voters for the voting session.
   * Max: 1000 voters. Note: it's a technical limit that shouldn't be raised, to keep the current architecture simple.
   */
  voters: Voter[];
  /**
   * The timestamp when the voting session started. If not set, or in the future, the session hasn't started yet.
   * Only form-like sessions have a start and an end.
   */
  startsAt: epochISOString | null;
  /**
   * The timestamp of end of the voting session. If set and past, the voting session has ended.
   * Only form-like sessions have a start and an end.
   */
  endsAt: epochISOString | null;
  /**
   * A timezone for the timestamps of start and end of the voting session.
   */
  timezone: string;
  /**
   * Whether the results have been published.
   * NOTE: for immediate sessions the result is public and immediate anyway.
   */
  resultsPublished: boolean;
  /**
   * The results of the voting session, in case they are published.
   */
  results?: VotingResults;
  /**
   * The list of the names of the voters that voted; i.e., it doesn't include the absents.
   */
  participantVoters?: string[];
  /**
   * The timestamp when the voting session was archived.
   */
  archivedAt?: epochISOString;

  load(x: any): void {
    super.load(x);
    this.sessionId = this.clean(x.sessionId, String);
    this.name = this.clean(x.name, String);
    this.description = this.clean(x.description, String);
    this.type = this.clean(x.type, String, VotingSessionTypes.FORM_PUBLIC);
    if (!x.type && x.isSecret) this.type = VotingSessionTypes.FORM_SECRET; // backwards compatibility prior #88
    this.isWeighted = this.clean(x.isWeighted, Boolean, false);
    this.event = x.event?.eventId ? new GAEventAttached(x.event) : null;
    this.createdAt = this.clean(x.createdAt, d => new Date(d).toISOString(), new Date().toISOString());
    if (x.updatedAt) this.updatedAt = this.clean(x.updatedAt, d => new Date(d).toISOString());
    if (x.publishedSince) this.publishedSince = this.clean(x.publishedSince, d => new Date(d).toISOString());
    else delete this.publishedSince;
    if (this.type === VotingSessionTypes.ROLL_CALL) this.ballots = [];
    else this.ballots = this.cleanArray(x.ballots, b => new VotingBallot(b)).slice(0, 50);
    this.voters = this.cleanArray(x.voters, v => new Voter(v, this))
      .slice(0, 1000)
      .sort((a, b): number => a.name.localeCompare(b.name));
    if (this.isForm()) {
      this.startsAt = this.clean(x.startsAt, d => new Date(d).toISOString());
      this.endsAt = this.clean(x.endsAt, d => new Date(d).toISOString());
      this.timezone = this.clean(x.timezone, String);
    }
    this.scrutineersIds = this.cleanArray(x.scrutineersIds, String).map(x => x.toLowerCase());
    if (this.isForm() && !this.hasEnded()) {
      this.resultsPublished = false;
      delete this.results;
      delete this.participantVoters;
    } else {
      if (x.results) {
        this.resultsPublished = this.clean(x.resultsPublished, Boolean, false);
        this.results = x.results;
      } else this.resultsPublished = false;
      if (x.participantVoters)
        this.participantVoters = this.cleanArray(x.participantVoters, String)?.sort((a, b): number =>
          a.localeCompare(b)
        );
    }
    if (x.archivedAt) this.archivedAt = this.clean(x.archivedAt, d => new Date(d).toISOString());
  }

  safeLoad(newData: any, safeData: any): void {
    super.safeLoad(newData, safeData);
    this.sessionId = safeData.sessionId;
    this.type = safeData.type;
    if (!this.type) this.type = safeData.isSecret ? VotingSessionTypes.FORM_SECRET : VotingSessionTypes.FORM_PUBLIC; // backwards compatibility prior #88
    this.isWeighted = safeData.isWeighted;
    this.createdAt = safeData.createdAt;
    if (safeData.updatedAt) this.updatedAt = safeData.updatedAt;
    this.startsAt = safeData.startsAt;
    this.resultsPublished = safeData.resultsPublished;
    if (safeData.results) this.results = safeData.results;
    if (safeData.participantVoters) this.participantVoters = safeData.participantVoters;
    if (safeData.archivedAt) this.archivedAt = safeData.archivedAt;
  }

  validate(checkIfReady = false): string[] {
    const e = super.validate();
    if (this.iE(this.name)) e.push('name');
    if (!Object.values(VotingSessionTypes).includes(this.type)) e.push('type');
    this.ballots.forEach((b, i): void => b.validate().forEach(ea => e.push(`ballots[${i}].${ea}`)));
    if (this.ballots.length > 50) e.push('ballots');
    this.voters.forEach((v, i): void => v.validate(this).forEach(ea => e.push(`voters[${i}].${ea}`)));
    if (this.voters.length > 1000) e.push('voters');

    if (checkIfReady || this.startsAt) {
      if (this.iE(this.publishedSince, 'date') || this.publishedSince > new Date().toISOString())
        e.push('publishedSince');
      if (this.type !== VotingSessionTypes.ROLL_CALL && this.iE(this.ballots)) e.push('ballots');
      if (this.iE(this.voters)) e.push('voters');
      const votersIds = this.voters.map(x => x.id?.trim());
      const votersNames = this.voters.map(x => x.name?.trim().toLowerCase());
      if (votersIds.length !== new Set(votersIds).size) e.push('voters.duplicatedIds');
      if (votersNames.length !== new Set(votersNames).size) e.push('voters.duplicatedNames');
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
   * Whether the voting session is secret.
   */
  isSecret(): boolean {
    return this.type === VotingSessionTypes.FORM_SECRET;
  }

  /**
   * Whether the voting session happens through a form.
   */
  isForm(): boolean {
    return [VotingSessionTypes.FORM_PUBLIC, VotingSessionTypes.FORM_SECRET].includes(this.type);
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
    if (!this.isWeighted) return this.voters.length;
    else return this.voters.reduce((tot, acc): number => (tot += acc.voteWeight), 0);
  }

  /**
   * Validate a vote against the voting session.
   */
  validateVoteSubmission(submission: number[]): string[] {
    const e = [];
    if (!Array.isArray(submission)) e.push('submission');
    this.ballots.forEach((b, i): void => {
      // note: the last option is always Abstain
      if (isNaN(submission[i]) || submission[i] > b.options.length) e.push(`submission[${i}]`);
    });
    return e;
  }

  /**
   * Get the list of voters sorted by name.
   */
  getSortedVoters(): Voter[] {
    return this.voters.sort((a, b): number => a.name.localeCompare(b.name));
  }
  /**
   * Get the voters who didn't vote (absent).
   * Note: either a voter is present for all the ballots or they are absents for all the ballots.
   */
  getAbsentVoters(): Voter[] {
    if (!this.participantVoters) return;
    const votersPresent = new Set(this.participantVoters);
    return this.voters.filter(x => !votersPresent.has(x.name)).sort((a, b): number => a.name.localeCompare(b.name));
  }
}

/**
 * The types of voting sessions.
 */
export enum VotingSessionTypes {
  FORM_PUBLIC = 'FORM_PUBLIC',
  FORM_SECRET = 'FORM_SECRET',
  IMMEDIATE = 'IMMEDIATE',
  ROLL_CALL = 'ROLL_CALL'
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
   * The last "virtual" option is always Abstain.
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
   * The email address to which the voting tokens will be sent (in case of form-type voting sessions).
   * If not set, no email will be sent; without a voting link, the voter can't vote and will result absent.
   */
  email: string | null;
  /**
   * A number with high precision that represents the weight of the voter.
   * If the vote is not weighted, it equals `null`.
   */
  voteWeight: number | null;

  load(x: any, votingSession: VotingSession): void {
    super.load(x);
    this.id = this.clean(x.id, String, Math.random().toString(36).slice(-7).toUpperCase());
    this.name = this.clean(x.name, String);
    if (votingSession.isForm()) this.email = this.clean(x.email, String);
    if (votingSession.isWeighted) this.voteWeight = this.clean(x.voteWeight, w => Math.round(Number(w)));
    else this.voteWeight = null;
  }

  validate(votingSession: VotingSession): string[] {
    const e = super.validate();
    if (this.iE(this.id)) e.push('id');
    if (this.iE(this.name)) e.push('name');
    if (votingSession.isForm() && this.email && this.iE(this.email, 'email')) e.push('email');
    if (votingSession.isWeighted && (this.voteWeight < 1 || this.voteWeight > 999_999)) e.push('voteWeight');
    return e;
  }
}

/**
 * A flat, exportable version of a voter.
 */
export interface ExportableVoter {
  Name: string;
  'Voter Identifier': string;
  Email?: string;
  'Vote Weight'?: number;
}
