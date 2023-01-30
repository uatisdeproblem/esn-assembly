///
/// IMPORTS
///

import { default as Axios } from 'axios';
import { parseStringPromise } from 'xml2js';
import { sign } from 'jsonwebtoken';
import { RCError, ResourceController, SecretsManager } from 'idea-aws';

import { User } from '../models/user.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const CAS_URL = 'https://accounts.esn.org/cas';
const JWT_EXPIRE_TIME = '1 day';

const SECRETS_PATH = 'esn-ga/auth';
const secretsManager = new SecretsManager();

let JWT_SECRET: string;

export const handler = (ev: any, _: any, cb: any): Promise<void> => new Login(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class Login extends ResourceController {
  host: string;
  referer: string;
  stage: string;

  constructor(event: any, callback: any) {
    super(event, callback);
    this.callback = callback;
    this.host = event.headers?.host ?? null;
    this.referer = event.headers?.referer ?? null;
    this.stage = process.env.STAGE ?? null;
  }

  protected async getResources(): Promise<any> {
    try {
      // build a URL to valid the ticket received
      const serviceURL = `https://${this.host}/${this.stage}/login`;
      const validationURL = `${CAS_URL}/serviceValidate?service=${serviceURL}&ticket=${this.queryParams.ticket}`;

      const ticketValidation = await Axios.get(validationURL);
      const jsonWithUserData = await parseStringPromise(ticketValidation.data);
      this.logger.debug('CAS ticket validated and parsed', { ticket: jsonWithUserData });

      const success = !!jsonWithUserData['cas:serviceResponse']['cas:authenticationSuccess'];
      if (!success) throw new RCError('Login failed');

      const data = jsonWithUserData['cas:serviceResponse']['cas:authenticationSuccess'][0];
      const attributes = data['cas:attributes'][0];
      const username = data['cas:user'][0];

      const user = new User({
        username,
        email: attributes['cas:mail'][0],
        sectionCode: attributes['cas:sc'][0],
        firstName: attributes['cas:first'][0],
        lastName: attributes['cas:last'][0],
        roles: attributes['cas:roles'],
        section: attributes['cas:section'][0],
        country: attributes['cas:country'][0],
        avatarURL: attributes['cas:picture'][0]
      });

      const userData = JSON.parse(JSON.stringify(user));
      const secret = await getJwtSecretFromSecretsManager();
      const token = sign(userData, secret, { expiresIn: JWT_EXPIRE_TIME });

      // redirect to the front-end with the fresh new token (instead of resolving)
      this.callback(null, { statusCode: 302, headers: { Location: `${this.referer}/auth/${token}` } });
    } catch (err) {
      this.logger.error('VALIDATE CAS TICKET', err);
      throw new RCError('Login failed');
    }
  }
}

const getJwtSecretFromSecretsManager = async (): Promise<string> => {
  if (!JWT_SECRET) JWT_SECRET = await secretsManager.getStringById(SECRETS_PATH);
  return JWT_SECRET;
};
