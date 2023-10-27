///
/// IMPORTS
///

import { APIGatewayProxyEventV2WithRequestContext } from 'aws-lambda';
import { JwtPayload, verify } from 'jsonwebtoken';
import { DynamoDB, SystemsManager } from 'idea-aws';

import { User } from '../models/user.model';
import { Configurations } from '../models/configurations.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const PROJECT = process.env.PROJECT;
const DDB_TABLES = { configurations: process.env.DDB_TABLE_configurations };
const ddb = new DynamoDB();

const PARAMETERS_PATH = '/esn-ga/auth';
const ssm = new SystemsManager();

let JWT_SECRET: string;

export const handler = async (event: any): Promise<any> => {
  if (event.methodArn) return authorizeWebSocketApi(event);
  else return authorizeHTTPApi(event);
};

const authorizeHTTPApi = async (
  event: APIGatewayProxyEventV2WithRequestContext<HTTPAuthResult>
): Promise<HTTPAuthResult> => {
  const authorization = event?.headers?.authorization;
  const result: HTTPAuthResult = { isAuthorized: false };
  const user = await verifyTokenAndGetESNAccountsUser(authorization);

  if (user) {
    if (user.isAdministrator) user.isAdministrator = await verifyIfUserIsStillAnAdministratorById(user.userId);
    result.context = { principalId: user.userId, user };
    result.isAuthorized = true;
  }

  return result;
};

const authorizeWebSocketApi = async (event: any): Promise<WebSocketAuthResult> => {
  const authorization = event?.queryStringParameters?.authorization;
  const user = await verifyTokenAndGetESNAccountsUser(authorization);

  const result: WebSocketAuthResult = {};

  if (user) {
    if (user.isAdministrator) user.isAdministrator = await verifyIfUserIsStillAnAdministratorById(user.userId);
    result.principalId = user.userId;
  }

  result.policyDocument = getPolicyDocumentToAllowWebSocketRequest(event.methodArn, !!user);

  return result;
};

//
// HELPERS
//

const getJwtSecretFromSystemsManager = async (): Promise<string> => {
  if (!JWT_SECRET) JWT_SECRET = await ssm.getSecretByName(PARAMETERS_PATH);
  return JWT_SECRET;
};
const verifyTokenAndGetESNAccountsUser = async (token: string): Promise<User> => {
  const secret = await getJwtSecretFromSystemsManager();
  try {
    const result = verify(token, secret) as JwtPayload;
    return new User(result);
  } catch (error) {
    return null;
  }
};
const verifyIfUserIsStillAnAdministratorById = async (userId: string): Promise<boolean> => {
  const { administratorsIds } = new Configurations(
    await ddb.get({ TableName: DDB_TABLES.configurations, Key: { PK: PROJECT } })
  );
  return administratorsIds.includes(userId);
};

const getPolicyDocumentToAllowWebSocketRequest = (methodArn: string, allow: boolean): any => {
  const policyDocument: any = {};
  policyDocument.Version = '2012-10-17';
  policyDocument.Statement = [];
  const statementOne: any = {};
  statementOne.Action = 'execute-api:Invoke';
  statementOne.Effect = allow ? 'Allow' : 'Deny';
  statementOne.Resource = methodArn;
  policyDocument.Statement[0] = statementOne;
  return policyDocument;
};

//
// INTERFACES
//

/**
 * Expected result by a Lambda authorizer (payload format: 2.0).
 */
interface HTTPAuthResult {
  isAuthorized: boolean;
  context?: { principalId: string; user: User };
}

/**
 * Expected result by a Lambda authorizer (payload format: 1.0).
 */
interface WebSocketAuthResult {
  policyDocument?: Record<string, any>;
  principalId?: string;
}
