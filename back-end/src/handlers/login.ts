///
/// IMPORTS
///

import { default as Axios } from 'axios';
import { parseStringPromise } from 'xml2js';
import { sign } from 'jsonwebtoken';
import { DynamoDB, RCError, ResourceController, SystemsManager } from 'idea-aws';

import { User } from '../models/user.model';
import { Configurations } from '../models/configurations.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const CAS_URL = 'https://accounts.esn.org/cas';
const JWT_EXPIRE_TIME = '1 day';

const PROJECT = process.env.PROJECT;
const APP_DOMAIN = process.env.APP_DOMAIN;
const APP_URL = 'https://'.concat(APP_DOMAIN);

const DDB_TABLES = { configurations: process.env.DDB_TABLE_configurations };
const ddb = new DynamoDB();

const SECRETS_PATH = `/${PROJECT}/auth`;
const systemsManager = new SystemsManager();

let JWT_SECRET: string;

export const handler = (ev: any, _: any, cb: any): Promise<void> => new Login(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class Login extends ResourceController {
  host: string;
  stage: string;

  constructor(event: any, callback: any) {
    super(event, callback);
    this.callback = callback;
    this.host = event.headers?.host ?? null;
    this.stage = process.env.STAGE ?? null;
  }

  protected async getResources(): Promise<any> {
    try {
      // build a URL to valid the ticket received (consider also the localhost exception)
      const localhost = this.queryParams.localhost ? `?localhost=${this.queryParams.localhost}` : '';
      const serviceURL = `https://${this.host}/${this.stage}/login${localhost}`;
      const validationURL = `${CAS_URL}/serviceValidate?service=${serviceURL}&ticket=${this.queryParams.ticket}`;

      const ticketValidation = await Axios.get(validationURL);
      const jsonWithUserData = await parseStringPromise(ticketValidation.data);
      this.logger.debug('CAS ticket validated and parsed', { ticket: jsonWithUserData });

      const success = !!jsonWithUserData['cas:serviceResponse']['cas:authenticationSuccess'];
      if (!success) throw new RCError('Login failed');

      const data = jsonWithUserData['cas:serviceResponse']['cas:authenticationSuccess'][0];
      const attributes = data['cas:attributes'][0];
      const userId = String(data['cas:user'][0]).toLowerCase();

      const { administratorsIds, opportunitiesManagersIds } = await this.loadOrInitConfigurations(userId);

      const user = new User({
        userId,
        email: attributes['cas:mail'][0],
        sectionCode: attributes['cas:sc'][0],
        firstName: attributes['cas:first'][0],
        lastName: attributes['cas:last'][0],
        roles: attributes['cas:roles'],
        section: attributes['cas:section'][0],
        country: attributes['cas:country'][0],
        avatarURL: attributes['cas:picture'][0],
        isAdministrator: administratorsIds.includes(userId),
        canManageOpportunities: administratorsIds.includes(userId) || opportunitiesManagersIds.includes(userId)
      });
      this.logger.info('ESN Accounts login', user);

      const userData = JSON.parse(JSON.stringify(user));
      const secret = await getJwtSecretFromSystemsManager();
      const token = sign(userData, secret, { expiresIn: JWT_EXPIRE_TIME });

      // redirect to the front-end with the fresh new token (instead of resolving)
      const appURL = this.queryParams.localhost ? `http://localhost:${this.queryParams.localhost}` : APP_URL;
      this.callback(null, { statusCode: 302, headers: { Location: `${appURL}/auth?token=${token}` } });
    } catch (err) {
      this.logger.error('VALIDATE CAS TICKET', err);
      throw new RCError('Login failed');
    }
  }

  private async loadOrInitConfigurations(firstAdminId: string): Promise<Configurations> {
    try {
      return new Configurations(
        await ddb.get({ TableName: DDB_TABLES.configurations, Key: { PK: Configurations.PK } })
      );
    } catch (err) {
      if (String(err) === 'Error: Not found') {
        const configurations = new Configurations({ PK: Configurations.PK, administratorsIds: [firstAdminId] });
        await ddb.put({
          TableName: DDB_TABLES.configurations,
          Item: configurations,
          ConditionExpression: 'attribute_not_exists(PK)'
        });
        return configurations;
      } else throw new RCError('Error loading configuration');
    }
  }
}

const getJwtSecretFromSystemsManager = async (): Promise<string> => {
  if (!JWT_SECRET) JWT_SECRET = await systemsManager.getSecretByName(SECRETS_PATH);
  return JWT_SECRET;
};
