///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController } from 'idea-aws';

import { Message } from '../models/message.model';
import { Topic, TopicTypes } from '../models/topic.model';
import { User } from '../models/user.model';
import { Subject } from '../models/subject.model';
import { Configurations } from '../models/configurations.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const DDB_TABLES = {
  messages: process.env.DDB_TABLE_messages,
  topics: process.env.DDB_TABLE_topics,
  configurations: process.env.DDB_TABLE_configurations
};
const ddb = new DynamoDB();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new MessagesRC(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class MessagesRC extends ResourceController {
  galaxyUser: User;
  topic: Topic;
  message: Message;

  constructor(event: any, callback: any) {
    super(event, callback, { resourceId: 'messageId' });
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

    if (!this.resourceId) return;

    try {
      this.message = new Message(
        await ddb.get({
          TableName: DDB_TABLES.messages,
          Key: { topicId: this.pathParameters.topicId, messageId: this.resourceId }
        })
      );
    } catch (err) {
      throw new RCError('Message not found');
    }

    if (!this.galaxyUser.isAdministrator && this.message.creator?.id !== this.galaxyUser.userId)
      throw new RCError('Unauthorized');
  }

  protected async getResources(): Promise<Message[]> {
    let messages: Message[] = await ddb.query({
      TableName: DDB_TABLES.messages,
      KeyConditionExpression: 'topicId = :topicId',
      ExpressionAttributeValues: { ':topicId': this.topic.topicId }
    });
    messages = messages.map(x => new Message(x));
    return messages.sort((a, b): number => b.createdAt.localeCompare(a.createdAt));
  }

  protected async postResources(): Promise<Message> {
    if (!this.topic.canUserInteract(this.galaxyUser)) throw new Error('Not allowed to interact');

    const { bannedUsersIds } = new Configurations(
      await ddb.get({ TableName: DDB_TABLES.configurations, Key: { PK: Configurations.PK } })
    );
    if (bannedUsersIds.includes(this.galaxyUser.userId)) throw new Error('User is banned');

    this.message = new Message(this.body);
    this.message.topicId = this.topic.topicId;
    this.message.messageId = Message.getPK(this.galaxyUser.userId);
    this.message.creator = Subject.fromUser(this.galaxyUser);
    this.message.createdAt = new Date().toISOString();
    this.message.numOfUpvotes = 0;

    const errors = this.message.validate(this.topic);
    if (errors.length) throw new RCError(`Invalid fields: ${errors.join(', ')}`);

    await ddb.put({
      TableName: DDB_TABLES.messages,
      Item: this.message,
      ConditionExpression: 'attribute_not_exists(topicId) AND attribute_not_exists(messageId)'
    });

    return this.message;
  }

  protected async deleteResource(): Promise<void> {
    if (this.topic.isArchived()) throw new Error('Topic is archived');

    await ddb.delete({
      TableName: DDB_TABLES.messages,
      Key: { topicId: this.topic.topicId, messageId: this.message.messageId }
    });
  }

  protected async patchResource(): Promise<Message> {
    switch (this.body.action) {
      case 'MARK_COMPLETE':
        return await this.markComplete();
      case 'UNDO_COMPLETE':
        return await this.undoComplete();
      default:
        throw new RCError('Unsupported action');
    }
  }
  private async markComplete(): Promise<Message> {
    if (this.topic.isArchived()) throw new Error('Topic is archived');
    if (this.message.completedAt) throw new Error('Message is already complete');

    this.message.completedAt = new Date().toISOString();
    await ddb.update({
      TableName: DDB_TABLES.messages,
      Key: { topicId: this.topic.topicId, messageId: this.resourceId },
      UpdateExpression: 'SET completedAt = :completedAt',
      ExpressionAttributeValues: { ':completedAt': this.message.completedAt }
    });

    return this.message;
  }
  private async undoComplete(): Promise<Message> {
    if (this.topic.isArchived()) throw new Error('Topic is archived');
    if (!this.galaxyUser.isAdministrator) throw new Error('Unauthorized');

    if (!this.message.completedAt) return this.message;

    delete this.message.completedAt;
    await ddb.update({
      TableName: DDB_TABLES.messages,
      Key: { topicId: this.topic.topicId, messageId: this.resourceId },
      UpdateExpression: 'REMOVE completedAt'
    });

    return this.message;
  }
}
