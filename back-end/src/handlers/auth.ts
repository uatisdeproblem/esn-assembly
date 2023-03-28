///
/// IMPORTS
///

import { APIGatewayProxyEventV2WithRequestContext } from 'aws-lambda';
import { JwtPayload, verify } from 'jsonwebtoken';
import { DynamoDB, SecretsManager } from 'idea-aws';

import { User } from '../models/user.model';
import { Configurations } from '../models/configurations.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const PROJECT = process.env.PROJECT;
const DDB_TABLES = { configurations: process.env.DDB_TABLE_configurations };
const ddb = new DynamoDB();

const SECRETS_PATH = 'esn-ga/auth';
const secretsManager = new SecretsManager();

let JWT_SECRET: string;

export const handler = async (event: APIGatewayProxyEventV2WithRequestContext<AuthResult>): Promise<AuthResult> => {
  const authorization = event?.headers?.authorization;
  const result: AuthResult = { isAuthorized: false };
  const user = await verifyTokenAndGetESNAccountsUser(authorization);

  if (user) {
    if (user.isAdministrator) user.isAdministrator = await verifyIfUserIsStillAnAdministratorById(user.userId);
    result.context = { principalId: user.userId, user };
    result.isAuthorized = true;
  }

  return result;
};

//
// HELPERS
//

const getJwtSecretFromSecretsManager = async (): Promise<string> => {
  if (!JWT_SECRET) JWT_SECRET = await secretsManager.getStringById(SECRETS_PATH);
  return JWT_SECRET;
};
const verifyTokenAndGetESNAccountsUser = async (token: string): Promise<User> => {
  const secret = await getJwtSecretFromSecretsManager();
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

/**
 * Expected result by a Lambda authorizer (payload format: 2.0).
 */
interface AuthResult {
  isAuthorized: boolean;
  context?: { principalId: string; user: User };
}
