import { Resource } from 'idea-toolbox';

/**
 * The result of the voting over a specific ballot's option.
 * The architecture ensure secrecy, since we only store incremental values during the vote;
 * in other words, you can't identify voters based on their weights.
 */
export class VotingResultForBallotOption extends Resource {
  /**
   * The ID of the voting session.
   */
  sessionId: string;
  /**
   * The concatenation (`_`) of the ballot's index and the options's index.
   */
  ballotOption: string;
  /**
   * The balanced weighted value for the option.
   */
  value: number;
  /**
   * In case of public voting, the list of voters for the option.
   */
  voters?: string[];

  /**
   * Get the string to use as SK, based on the ballot's index and option's index.
   */
  static getSK(bIndex: number, oIndex: number): string {
    return [String(bIndex), String(oIndex)].join('_');
  }

  load(x: any): void {
    super.load(x);
    this.sessionId = this.clean(x.sessionId, String);
    this.ballotOption = this.clean(x.ballotOption, String);
    this.value = this.clean(x.value, Number, 0);
    if (x.voters) this.voters = this.cleanArray(x.voters, String);
  }

  /**
   * Get the ballot's index and option's index from the SK.
   */
  getIndexesFromSK(): { bIndex: number; oIndex: number } {
    const [bIndex, oIndex] = this.ballotOption.split('_').map(x => Number(x));
    return { bIndex, oIndex };
  }
}

/**
 * The results of a voting session (as array of ballots, array of options' results).
 */
export type VotingResults = {
  /**
   * The weighted value for the option.
   */
  value: number;
  /**
   * In case of public voting, the list of voters for the option.
   */
  voters?: string[];
}[][];
