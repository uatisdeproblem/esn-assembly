import { Injectable } from '@angular/core';
import { WorkBook, utils, writeFile } from 'xlsx';
import { IDEAApiService } from '@idea-ionic/common';

import { Voter, VotingSession } from '@models/votingSession.model';
import { ExportableVotingTicket, VotingTicket } from '@models/votingTicket.model';
import { VotingResults } from '@models/votingResult.model';

@Injectable({ providedIn: 'root' })
export class VotingService {
  private votingSessions: VotingSession[];
  private archivedVotingSessions: VotingSession[];

  /**
   * The number of voting sessions to consider for the pagination, when active.
   */
  MAX_PAGE_SIZE = 24;

  constructor(private api: IDEAApiService) {}

  /**
   * Load the active voting sessions from the back-end.
   */
  private async loadActiveList(): Promise<void> {
    const votingSessions: VotingSession[] = await this.api.getResource('voting-sessions', {
      params: { archived: false }
    });
    this.votingSessions = votingSessions.map(x => new VotingSession(x));
  }
  /**
   * Get (and optionally filter) the list of active voting sessions.
   * Note: it's a slice of the array.
   */
  async getActiveList(
    options: {
      force?: boolean;
      search?: string;
      eventId?: string;
      withPagination?: boolean;
      startPaginationAfterId?: string;
      sortBy?: VotingSessionsSortBy;
    } = { sortBy: VotingSessionsSortBy.CREATED_DATE_DESC }
  ): Promise<VotingSession[]> {
    if (!this.votingSessions || options.force) await this.loadActiveList();
    if (!this.votingSessions) return null;

    options.search = options.search ? String(options.search).toLowerCase() : '';

    let filteredList = this.votingSessions.slice();

    if (options.search)
      filteredList = filteredList.filter(x =>
        options.search
          .split(' ')
          .every(searchTerm =>
            [x.name, x.description, x.event.name].filter(f => f).some(f => f.toLowerCase().includes(searchTerm))
          )
      );

    if (options.eventId) filteredList = filteredList.filter(x => x.event.eventId === options.eventId);

    switch (options.sortBy) {
      case VotingSessionsSortBy.CREATED_DATE_ASC:
        filteredList = filteredList.sort((a, b): number => a.createdAt.localeCompare(b.createdAt));
        break;
      case VotingSessionsSortBy.CREATED_DATE_DESC:
        filteredList = filteredList.sort((a, b): number => b.createdAt.localeCompare(a.createdAt));
        break;
    }

    if (options.withPagination && filteredList.length > this.MAX_PAGE_SIZE) {
      let indexOfLastOfPreviousPage = 0;
      if (options.startPaginationAfterId)
        indexOfLastOfPreviousPage = filteredList.findIndex(x => x.sessionId === options.startPaginationAfterId) || 0;
      filteredList = filteredList.slice(0, indexOfLastOfPreviousPage + this.MAX_PAGE_SIZE);
    }

    return filteredList;
  }

  /**
   * Load the archived voting sessions from the back-end.
   */
  private async loadArchivedList(eventId?: string): Promise<void> {
    const params: any = { archived: true };
    if (eventId) params.eventId = eventId;
    const votingSessions: VotingSession[] = await this.api.getResource('voting-sessions', { params });
    this.archivedVotingSessions = votingSessions.map(x => new VotingSession(x));
  }
  /**
   * Get (and optionally filter) the list of archived voting sessions.
   * Note: it's a slice of the array.
   */
  async getArchivedList(
    options: {
      force?: boolean;
      eventId?: string;
      withPagination?: boolean;
      startPaginationAfterId?: string;
      sortBy?: VotingSessionsSortBy;
    } = { sortBy: VotingSessionsSortBy.CREATED_DATE_DESC }
  ): Promise<VotingSession[]> {
    if (!this.archivedVotingSessions || options.force) await this.loadArchivedList(options.eventId);
    if (!this.archivedVotingSessions) return null;

    let filteredList = this.archivedVotingSessions.slice();

    switch (options.sortBy) {
      case VotingSessionsSortBy.CREATED_DATE_ASC:
        filteredList = filteredList.sort((a, b): number => a.createdAt.localeCompare(b.createdAt));
        break;
      case VotingSessionsSortBy.CREATED_DATE_DESC:
        filteredList = filteredList.sort((a, b): number => b.createdAt.localeCompare(a.createdAt));
        break;
    }

    if (options.withPagination && filteredList.length > this.MAX_PAGE_SIZE) {
      let indexOfLastOfPreviousPage = 0;
      if (options.startPaginationAfterId)
        indexOfLastOfPreviousPage = filteredList.findIndex(x => x.sessionId === options.startPaginationAfterId) || 0;
      filteredList = filteredList.slice(0, indexOfLastOfPreviousPage + this.MAX_PAGE_SIZE);
    }

    return filteredList;
  }

  /**
   * Get a voting session by its id.
   */
  async getById(sessionId: string): Promise<VotingSession> {
    return new VotingSession(await this.api.getResource(['voting-sessions', sessionId]));
  }

  /**
   * Insert a voting session.
   */
  async insert(votingSession: VotingSession): Promise<VotingSession> {
    return new VotingSession(await this.api.postResource('voting-sessions', { body: votingSession }));
  }

  /**
   * Update a voting session.
   */
  async update(votingSession: VotingSession): Promise<VotingSession> {
    return new VotingSession(
      await this.api.putResource(['voting-sessions', votingSession.sessionId], { body: votingSession })
    );
  }

  /**
   * Archive a voting session.
   */
  async archive(votingSession: VotingSession): Promise<void> {
    await this.api.patchResource(['voting-sessions', votingSession.sessionId], { body: { action: 'ARCHIVE' } });
  }
  /**
   * Unarchive a voting session.
   */
  async unarchive(votingSession: VotingSession): Promise<void> {
    await this.api.patchResource(['voting-sessions', votingSession.sessionId], { body: { action: 'UNARCHIVE' } });
  }

  /**
   * Delete a voting session.
   */
  async delete(votingSession: VotingSession): Promise<void> {
    await this.api.deleteResource(['voting-sessions', votingSession.sessionId]);
  }

  /**
   * Start a voting session.
   */
  async start(votingSession: VotingSession): Promise<VotingSession> {
    const body = { action: 'START', endsAt: votingSession.endsAt, timezone: votingSession.timezone };
    return new VotingSession(await this.api.patchResource(['voting-sessions', votingSession.sessionId], { body }));
  }

  /**
   * Login with a voting ticket and begin to vote.
   * Note: the combination of voting ID and token authenticates the request.
   */
  async beginVote(
    sessionId: string,
    voterId: string,
    token: string
  ): Promise<{ votingSession: VotingSession; votingTicket: VotingTicket }> {
    const path = ['voting-sessions', sessionId, 'vote'];
    const params = { voterId, token };
    const { votingSession, votingTicket } = await this.api.getResource(path, { params });
    return { votingSession: new VotingSession(votingSession), votingTicket: new VotingTicket(votingTicket) };
  }
  /**
   * Submit the votes.
   * Note: the combination of voting ID and token authenticates the request.
   */
  async submitVotes(votingTicket: VotingTicket, submission: number[]): Promise<void> {
    const path = ['voting-sessions', votingTicket.sessionId, 'vote'];
    const body = { votingTicket, submission };
    await this.api.postResource(path, { body });
  }

  /**
   * Get the status of the voting tickets.
   */
  async getVotingTicketsStatus(votingSession: VotingSession): Promise<VotingTicket[]> {
    const path = ['voting-sessions', votingSession.sessionId];
    const body = { action: 'TICKETS_STATUS' };
    const res: VotingTicket[] = await this.api.patchResource(path, { body });
    return res.map(x => new VotingTicket(x));
  }
  /**
   * Extend the duration of the voting session by setting a new end.
   */
  async extendDuration(votingSession: VotingSession): Promise<VotingSession> {
    const path = ['voting-sessions', votingSession.sessionId];
    const body = { action: 'EXTEND_END', endsAt: votingSession.endsAt, timezone: votingSession.timezone };
    return new VotingSession(await this.api.patchResource(path, { body }));
  }
  /**
   * Stop the current voting session by setting the end time to now.
   */
  async stopPrematurely(votingSession: VotingSession): Promise<VotingSession> {
    const path = ['voting-sessions', votingSession.sessionId];
    const body = { action: 'STOP' };
    return new VotingSession(await this.api.patchResource(path, { body }));
  }
  /**
   * Resend the voting ticket to a voter
   */
  async resendVotingTicketToVoter(votingSession: VotingSession, voter: Voter, email: string): Promise<void> {
    const path = ['voting-sessions', votingSession.sessionId];
    const body = { action: 'RESEND_VOTING_LINK', voterId: voter.id, email };
    await this.api.patchResource(path, { body });
  }
  /**
   * Get the voting token of a voter.
   */
  async getVotingTokenOfVoter(votingSession: VotingSession, voter: Voter): Promise<string> {
    const path = ['voting-sessions', votingSession.sessionId];
    const body = { action: 'GET_VOTING_TOKEN', voterId: voter.id };
    const { token }: VotingTicket = await this.api.patchResource(path, { body });
    return token;
  }
  /**
   * Check whether the session should be closed early because everyone voted.
   */
  async checkWhetherSessionShouldEndEarly(votingSession: VotingSession): Promise<VotingSession> {
    const path = ['voting-sessions', votingSession.sessionId];
    const body = { action: 'CHECK_EARLY_END' };
    return new VotingSession(await this.api.patchResource(path, { body }));
  }

  /**
   * If the user can manage the voting session, can request the results before the votes are published.
   */
  async getVotesBeforeTheyArePublished(votingSession: VotingSession): Promise<VotingResults> {
    const path = ['voting-sessions', votingSession.sessionId];
    const body = { action: 'GET_RESULTS' };
    return await this.api.patchResource(path, { body });
  }
  /**
   * Publish the results for everyone to see.
   */
  async publishVotingResults(votingSession: VotingSession): Promise<VotingSession> {
    const path = ['voting-sessions', votingSession.sessionId];
    const body = { action: 'PUBLISH_RESULTS' };
    return new VotingSession(await this.api.patchResource(path, { body }));
  }

  /**
   * Download a spreadsheet with the results of a voting session.
   */
  downloadResultsSpreadsheet(filename: string, votingSession: VotingSession, results?: VotingResults): void {
    results = results ?? votingSession.results;
    if (!results) return;

    const wb: WorkBook = { SheetNames: [], Sheets: {} };
    const sheetRows = [];

    if (votingSession.isSecret) {
      votingSession.ballots.forEach((ballot, bIndex): void => {
        sheetRows.push([ballot.text]);
        [...ballot.options, 'Abstain', 'Absent'].forEach((option, oIndex): void => {
          sheetRows.push([option, votingSession.results[bIndex][oIndex].value]);
        });
        sheetRows.push([], []);
      });
    } else {
      sheetRows.push([, ...votingSession.ballots.map(b => b.text)]);
      votingSession.voters.forEach(voter => {
        const row = [voter.name];
        votingSession.ballots.forEach((ballot, bIndex): void => {
          const votedOptionIndex = votingSession.results[bIndex].findIndex(o => o.voters?.includes(voter.name));
          const votedOption =
            votedOptionIndex === -1
              ? 'Absent'
              : votedOptionIndex === ballot.options.length
              ? 'Abstain'
              : votingSession.ballots[bIndex].options[votedOptionIndex];
          row.push(votedOption);
        });
        sheetRows.push(row);
      });
    }

    utils.book_append_sheet(wb, utils.aoa_to_sheet(sheetRows), filename.slice(0, 30));
    writeFile(wb, filename);
  }
  /**
   * Download a spreadsheet with the voters audit data.
   */
  downloadVotersAuditSpreadsheet(filename: string, votingTickets: VotingTicket[]): void {
    if (!votingTickets) return;

    const exportableVotingTickets: ExportableVotingTicket[] = votingTickets.map(x => ({
      Name: x.voterName,
      'Vote identifier': x.voterId,
      'IP address': x.ipAddress ?? '-',
      'User agent': x.userAgent ?? '-',
      'Vote date/time': x.votedAt ?? '-',
      'Fraud detection': ''
    }));
    exportableVotingTickets.forEach(x => {
      if (x['IP address'] === '-' || x['User agent'] === '-') return;
      x['Fraud detection'] = exportableVotingTickets
        .filter(
          y => y['Name'] !== x['Name'] && y['IP address'] === x['IP address'] && y['User agent'] === x['User agent']
        )
        .map(y => y.Name)
        .join(', ');
    });

    const wb: WorkBook = { SheetNames: [], Sheets: {} };
    utils.book_append_sheet(wb, utils.json_to_sheet(exportableVotingTickets), filename.slice(0, 30));
    return writeFile(wb, filename);
  }
}

/**
 * The possible sorting mechanisms for the voting sessions.
 */
export enum VotingSessionsSortBy {
  CREATED_DATE_ASC = 'CREATED_DATE_ASC',
  CREATED_DATE_DESC = 'CREATED_DATE_DESC'
}
