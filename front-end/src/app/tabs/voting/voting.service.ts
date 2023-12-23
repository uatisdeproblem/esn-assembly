import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

import { VotingSession } from '@models/votingSession.model';
import { VotingTicket } from '@models/votingTicket.model';

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
   * Login with a voting ticket and begin a vote.
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
   */
  async submitVotes(votingTicket: VotingTicket, submission: string[]): Promise<void> {
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
}

/**
 * The possible sorting mechanisms for the voting sessions.
 */
export enum VotingSessionsSortBy {
  CREATED_DATE_ASC = 'CREATED_DATE_ASC',
  CREATED_DATE_DESC = 'CREATED_DATE_DESC'
}
