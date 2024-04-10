///
/// IMPORTS
///

import { DynamoDB, HandledError, ResourceController } from 'idea-aws';

import { addBadgeToUser } from './usersBadges';

import { Topic, TopicTypes } from '../models/topic.model';
import { Question } from '../models/question.model';
import { Answer, AnswerClap } from '../models/answer.model';
import { User } from '../models/user.model';
import { Subject } from '../models/subject.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const DDB_TABLES = {
  questions: process.env.DDB_TABLE_questions,
  topics: process.env.DDB_TABLE_topics,
  answers: process.env.DDB_TABLE_answers,
  answersClaps: process.env.DDB_TABLE_answersClaps
};
const ddb = new DynamoDB();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new AnswersClaps(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class AnswersClaps extends ResourceController {
  galaxyUser: User;
  topic: Topic;
  question: Question;
  answer: Answer;

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
      throw new HandledError('Topic not found');
    }

    if (this.topic.type !== TopicTypes.STANDARD) throw new HandledError('Incompatible type of topic');

    try {
      this.question = new Question(
        await ddb.get({
          TableName: DDB_TABLES.questions,
          Key: { topicId: this.pathParameters.topicId, questionId: this.pathParameters.questionId }
        })
      );
    } catch (err) {
      throw new HandledError('Question not found');
    }

    try {
      this.answer = new Answer(
        await ddb.get({
          TableName: DDB_TABLES.answers,
          Key: { questionId: this.pathParameters.questionId, answerId: this.pathParameters.answerId }
        })
      );
    } catch (err) {
      throw new HandledError('Answer not found');
    }
  }

  protected async getResources(): Promise<Subject[]> {
    let answersClaps: AnswerClap[] = await ddb.query({
      TableName: DDB_TABLES.answersClaps,
      KeyConditionExpression: 'answerId = :answerId',
      ExpressionAttributeValues: { ':answerId': this.answer.answerId }
    });
    answersClaps = answersClaps
      .map(x => new AnswerClap(x))
      .sort((a, b): number => b.createdAt.localeCompare(a.createdAt));
    return answersClaps.map(x => x.creator);
  }

  protected async postResources(): Promise<void> {
    const answerClap = new AnswerClap({
      answerId: this.answer.answerId,
      userId: this.galaxyUser.userId,
      questionId: this.question.questionId,
      creator: Subject.fromUser(this.galaxyUser)
    });

    await ddb.put({ TableName: DDB_TABLES.answersClaps, Item: answerClap });

    this.question.numOfClaps = await this.getLiveNumClaps();
    await ddb.put({ TableName: DDB_TABLES.questions, Item: this.question });

    if ((await this.getNumAnswersClappedByUser()) >= 15)
      await addBadgeToUser(ddb, this.galaxyUser.userId, 'CHEERGIVER');
  }

  protected async deleteResources(): Promise<void> {
    await ddb.delete({
      TableName: DDB_TABLES.answersClaps,
      Key: { answerId: this.answer.answerId, userId: this.galaxyUser.userId }
    });

    this.question.numOfClaps = await this.getLiveNumClaps();
    await ddb.put({ TableName: DDB_TABLES.questions, Item: this.question });
  }

  protected async getResource(): Promise<{ clapped: boolean }> {
    try {
      await ddb.get({
        TableName: DDB_TABLES.answersClaps,
        Key: { answerId: this.answer.answerId, userId: this.resourceId }
      });
      return { clapped: true };
    } catch (error) {
      return { clapped: false };
    }
  }

  private async getLiveNumClaps(): Promise<number> {
    try {
      const claps = await ddb.query({
        TableName: DDB_TABLES.answersClaps,
        IndexName: 'questionId-userId-index',
        KeyConditionExpression: 'questionId = :questionId',
        ExpressionAttributeValues: { ':questionId': this.question.questionId }
      });
      return claps.length;
    } catch (error) {
      return 0;
    }
  }
  private async getNumAnswersClappedByUser(): Promise<number> {
    try {
      const claps = await ddb.query({
        TableName: DDB_TABLES.answersClaps,
        IndexName: 'inverted-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': this.galaxyUser.userId }
      });
      return claps.length;
    } catch (error) {
      return 0;
    }
  }
}
