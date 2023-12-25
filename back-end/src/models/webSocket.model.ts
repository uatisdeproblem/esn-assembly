/**
 * A generic representation of a socket connection from a user to entity of the platform.
 */
export interface WebSocketConnection {
  /**
   * The ID of the socket connection.
   */
  connectionId: string;
  /**
   * The type of entity for which the connection is established.
   */
  type: WebSocketConnectionTypes;
  /**
   * The ID of the entity to which we want to connect (e.g. a live topic to read messages).
   */
  referenceId: string;
  /**
   * The timestamp (seconds) when the connection should expire (in case of failed `$disconnect`).
   */
  expiresAt: number;
  /**
   * If applicable, the ID of the user authorized to connect.
   */
  userId?: string;
}

/**
 * A generic representation of the message to send following a DDB stream, through socket connections.
 */
export interface WebSocketMessage {
  /**
   * The type of DDB stream that originated the message.
   */
  action: 'INSERT' | 'MODIFY' | 'REMOVE';
  /**
   * The type of entity for which the connection is established.
   */
  type: WebSocketConnectionTypes;
  /**
   * The ID of the entity to which we want to connect (e.g. a live topic to read messages).
   */
  referenceId: string;
  /**
   * The DDB table's item itself; in case the item was removed, it's the old image.
   */
  item: Record<string, any>;
}

/**
 * The types of entity to which users can establish web socket connections.
 */
export enum WebSocketConnectionTypes {
  TOPICS = 'topics',
  MESSAGES = 'messages',
  VOTING_TICKETS = 'votingTickets'
}
