///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController, SES } from 'idea-aws';

import { isEmailInBlockList } from './sesNotifications';

import { Topic } from '../models/topic.model';
import { Question } from '../models/question.model';
import { Answer } from '../models/answer.model';
import { User } from '../models/user.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const PROJECT = process.env.PROJECT;
const DDB_TABLES = {
  questions: process.env.DDB_TABLE_questions,
  topics: process.env.DDB_TABLE_topics,
  answers: process.env.DDB_TABLE_answers
};
const ddb = new DynamoDB();

const QUESTION_BASE_URL = `https://${process.env.STAGE === 'prod' ? '' : 'dev.'}esn-ga.link/t/topics/`;
const SES_CONFIG = {
  sourceName: 'ESN General Assembly Q&A',
  source: process.env.SES_SOURCE_ADDRESS,
  sourceArn: process.env.SES_IDENTITY_ARN,
  region: process.env.SES_REGION
};
const ses = new SES();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new Answers(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class Answers extends ResourceController {
  galaxyUser: User;
  topic: Topic;
  question: Question;
  answer: Answer;

  constructor(event: any, callback: any) {
    super(event, callback, { resourceId: 'answerId' });
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

    if (!this.resourceId) return;

    try {
      this.answer = new Answer(
        await ddb.get({
          TableName: DDB_TABLES.answers,
          Key: { questionId: this.pathParameters.questionId, answerId: this.resourceId }
        })
      );
    } catch (err) {
      throw new RCError('Answer not found');
    }
  }

  protected async getResources(): Promise<Answer[]> {
    let answers: Answer[] = await ddb.query({
      TableName: DDB_TABLES.answers,
      KeyConditionExpression: 'questionId = :questionId',
      ExpressionAttributeValues: { ':questionId': this.question.questionId }
    });
    answers = answers.map(x => new Answer(x));
    return answers.sort((a, b): number => b.createdAt.localeCompare(b.createdAt));
  }

  private async putSafeResource(opts: { noOverwrite: boolean }): Promise<Answer> {
    const errors = this.answer.validate();
    if (errors.length) throw new RCError(`Invalid fields: ${errors.join(', ')}`);

    const putParams: any = { TableName: DDB_TABLES.answers, Item: this.answer };
    if (opts.noOverwrite)
      putParams.ConditionExpression = 'attribute_not_exists(questionId) AND attribute_not_exists(answerId)';
    await ddb.put(putParams);

    return this.answer;
  }

  protected async postResources(): Promise<Answer> {
    if (this.topic.isClosed()) throw new RCError('Topic is closed');
    if (!this.topic.canUserAnswerQuestions(this.galaxyUser)) throw new Error('Not allowed to answer');

    this.answer = new Answer(this.body);
    this.answer.questionId = this.question.questionId;
    this.answer.answerId = await ddb.IUNID(PROJECT);

    await this.putSafeResource({ noOverwrite: true });

    await this.updateCountersOfQuestion();

    await this.sendNotificationToQuestionMaker(this.topic, this.question);

    return this.answer;
  }

  protected async getResource(): Promise<Answer> {
    return this.answer;
  }

  protected async putResource(): Promise<Answer> {
    if (!this.answer.canUserEdit(this.galaxyUser)) throw new RCError('Unauthorized');

    if (this.topic.isClosed()) throw new RCError('Topic is closed');

    const oldAnswer = new Answer(this.answer);
    this.answer.safeLoad(this.body, oldAnswer);

    return await this.putSafeResource({ noOverwrite: false });
  }

  protected async deleteResource(): Promise<void> {
    if (!this.answer.canUserEdit(this.galaxyUser)) throw new RCError('Unauthorized');

    if (this.topic.isClosed()) throw new RCError('Topic is closed');

    await ddb.delete({
      TableName: DDB_TABLES.answers,
      Key: { questionId: this.question.questionId, answerId: this.answer.answerId }
    });

    await this.updateCountersOfQuestion();
  }

  private async updateCountersOfQuestion(): Promise<void> {
    try {
      const answersToQuestion = await this.getResources();

      await ddb.update({
        TableName: DDB_TABLES.questions,
        Key: { topicId: this.topic.topicId, questionId: this.question.questionId },
        UpdateExpression: 'SET numOfAnswers = :num, updatedAt = :now',
        ExpressionAttributeValues: { ':num': answersToQuestion.length, ':now': new Date().toISOString() }
      });
    } catch (error) {
      this.logger.warn('Counters not updated', error, { questionId: this.question.questionId });
    }
  }

  private async sendNotificationToQuestionMaker(topic: Topic, question: Question): Promise<void> {
    const template = 'notify-new-answer';
    const templateData = {
      userName: question.creator.name,
      topic: topic.name,
      question: question.summary,
      url: QUESTION_BASE_URL.concat(topic.topicId)
    };
    if (!(await isEmailInBlockList(question.creator.email)))
      await ses.sendTemplatedEmail({ toAddresses: [question.creator.email], template, templateData }, SES_CONFIG);
  }
}
