///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController } from 'idea-aws';

import { addBadgeToUser } from './badges';

import { Topic, TopicTypes } from '../models/topic.model';
import { Question, QuestionUpvote } from '../models/question.model';
import { User } from '../models/user.model';
import { Badges } from '../models/userBadge.model';
import { Subject } from '../models/subject.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const DDB_TABLES = {
  topics: process.env.DDB_TABLE_topics,
  questions: process.env.DDB_TABLE_questions,
  questionsUpvotes: process.env.DDB_TABLE_questionsUpvotes
};
const ddb = new DynamoDB();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new QuestionsUpvotesRC(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class QuestionsUpvotesRC extends ResourceController {
  galaxyUser: User;
  topic: Topic;
  question: Question;

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

    if (this.topic.type !== TopicTypes.STANDARD) throw new RCError('Incompatible type of topic');

    try {
      this.question = new Question(
        await ddb.get({
          TableName: DDB_TABLES.questions,
          Key: { topicId: this.pathParameters.topicId, questionId: this.pathParameters.questionId }
        })
      );
    } catch (err) {
      throw new RCError('Question not found');
    }
  }

  protected async getResources(): Promise<Subject[]> {
    let questionUpvotes: QuestionUpvote[] = await ddb.query({
      TableName: DDB_TABLES.questionsUpvotes,
      KeyConditionExpression: 'questionId = :questionId',
      ExpressionAttributeValues: { ':questionId': this.question.questionId }
    });
    questionUpvotes = questionUpvotes
      .map(x => new QuestionUpvote(x))
      .sort((a, b): number => b.createdAt.localeCompare(a.createdAt));
    return questionUpvotes.map(x => x.creator);
  }

  protected async postResources(): Promise<void> {
    const upvoteItem = new QuestionUpvote({
      questionId: this.question.questionId,
      userId: this.galaxyUser.userId,
      creator: Subject.fromUser(this.galaxyUser)
    });

    await ddb.put({ TableName: DDB_TABLES.questionsUpvotes, Item: upvoteItem });

    this.question.numOfUpvotes = await this.getLiveNumUpvotes();
    await ddb.put({ TableName: DDB_TABLES.questions, Item: this.question });

    await addBadgeToUser(ddb, this.galaxyUser.userId, Badges.NEWCOMER);
    if ((await this.getNumQuestionsUpvotedByUser()) >= 15)
      await addBadgeToUser(ddb, this.galaxyUser.userId, Badges.LOVE_GIVER);
  }

  protected async deleteResources(): Promise<void> {
    await ddb.delete({
      TableName: DDB_TABLES.questionsUpvotes,
      Key: { questionId: this.question.questionId, userId: this.galaxyUser.userId }
    });

    this.question.numOfUpvotes = await this.getLiveNumUpvotes();
    await ddb.put({ TableName: DDB_TABLES.questions, Item: this.question });
  }

  protected async getResource(): Promise<{ upvoted: boolean }> {
    try {
      await ddb.get({
        TableName: DDB_TABLES.questionsUpvotes,
        Key: { questionId: this.question.questionId, userId: this.resourceId }
      });
      return { upvoted: true };
    } catch (error) {
      return { upvoted: false };
    }
  }

  private async getLiveNumUpvotes(): Promise<number> {
    const upvotes = await ddb.query({
      TableName: DDB_TABLES.questionsUpvotes,
      KeyConditionExpression: 'questionId = :questionId',
      ExpressionAttributeValues: { ':questionId': this.question.questionId },
      ConsistentRead: true
    });
    return upvotes.length;
  }

  private async getNumQuestionsUpvotedByUser(): Promise<number> {
    try {
      const upvotes = await ddb.query({
        TableName: DDB_TABLES.questionsUpvotes,
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
