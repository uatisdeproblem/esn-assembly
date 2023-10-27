///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController } from 'idea-aws';

import { addBadgeToUser } from './badges';

import { Topic, TopicTypes } from '../models/topic.model';
import { Message, MessageUpvote } from '../models/message.model';
import { User } from '../models/user.model';
import { Badges } from '../models/userBadge.model';
import { Subject } from '../models/subject.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const DDB_TABLES = {
  topics: process.env.DDB_TABLE_topics,
  messages: process.env.DDB_TABLE_messages,
  messagesUpvotes: process.env.DDB_TABLE_messagesUpvotes
};
const ddb = new DynamoDB();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new MessagesUpvotesRC(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class MessagesUpvotesRC extends ResourceController {
  galaxyUser: User;
  topic: Topic;
  message: Message;

  constructor(event: any, callback: any) {
    super(event, callback, { resourceId: 'userId' });
    this.galaxyUser = new User(event.requestContext.authorizer.lambda.user);
  }

  protected async checkAuthBeforeRequest(): Promise<void> {
    try {
      this.topic = new Topic(
        await ddb.get({ TableName: DDB_TABLES.topics, Key: { topicId: this.pathParameters.topicId } })
      );
    } catch (err) {
      throw new RCError('Topic not found');
    }

    if (this.topic.type !== TopicTypes.LIVE) throw new RCError('Incompatible type of topic');

    try {
      this.message = new Message(
        await ddb.get({
          TableName: DDB_TABLES.messages,
          Key: { topicId: this.pathParameters.topicId, messageId: this.pathParameters.messageId }
        })
      );
    } catch (err) {
      throw new RCError('Message not found');
    }
  }

  protected async getResources(): Promise<Subject[]> {
    let messageUpvotes: MessageUpvote[] = await ddb.query({
      TableName: DDB_TABLES.messagesUpvotes,
      KeyConditionExpression: 'messageId = :messageId',
      ExpressionAttributeValues: { ':messageId': this.message.messageId }
    });
    messageUpvotes = messageUpvotes
      .map(x => new MessageUpvote(x))
      .sort((a, b): number => b.createdAt.localeCompare(a.createdAt));
    return messageUpvotes.map(x => x.creator);
  }

  protected async postResources(): Promise<void> {
    const upvoteItem = new MessageUpvote({
      messageId: this.message.messageId,
      userId: this.galaxyUser.userId,
      topicId: this.topic.topicId,
      creator: Subject.fromUser(this.galaxyUser)
    });

    await ddb.put({ TableName: DDB_TABLES.messagesUpvotes, Item: upvoteItem });

    this.message.numOfUpvotes = await this.getLiveNumUpvotes();
    await ddb.put({ TableName: DDB_TABLES.messages, Item: this.message });

    await addBadgeToUser(ddb, this.galaxyUser.userId, Badges.NEWCOMER);
    if ((await this.getNumMessagesUpvotedByUser()) >= 15)
      await addBadgeToUser(ddb, this.galaxyUser.userId, Badges.LOVE_GIVER);
  }

  protected async deleteResources(): Promise<void> {
    await ddb.delete({
      TableName: DDB_TABLES.messagesUpvotes,
      Key: { messageId: this.message.messageId, userId: this.galaxyUser.userId }
    });

    this.message.numOfUpvotes = await this.getLiveNumUpvotes();
    await ddb.put({ TableName: DDB_TABLES.messages, Item: this.message });
  }

  protected async getResource(): Promise<{ upvoted: boolean }> {
    try {
      await ddb.get({
        TableName: DDB_TABLES.messagesUpvotes,
        Key: { messageId: this.message.messageId, userId: this.resourceId }
      });
      return { upvoted: true };
    } catch (error) {
      return { upvoted: false };
    }
  }

  private async getLiveNumUpvotes(): Promise<number> {
    const upvotes = await ddb.query({
      TableName: DDB_TABLES.messagesUpvotes,
      KeyConditionExpression: 'messageId = :messageId',
      ExpressionAttributeValues: { ':messageId': this.message.messageId },
      ConsistentRead: true
    });
    return upvotes.length;
  }

  private async getNumMessagesUpvotedByUser(): Promise<number> {
    try {
      const upvotes = await ddb.query({
        TableName: DDB_TABLES.messagesUpvotes,
        IndexName: 'inverted-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': this.galaxyUser.userId }
      });
      return upvotes.length;
    } catch (error) {
      return 0;
    }
  }
}
