///
/// IMPORTS
///

import { SNSEventRecord } from 'aws-lambda';
import { GenericController, DynamoDB } from 'idea-aws';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const BOUNCES_NUM_DAYS_IN_BLOCK_LIST = Number(process.env.BOUNCES_NUM_DAYS_IN_BLOCK_LIST ?? 30);
const DDB_TABLE_BLOCK_LIST = process.env.DDB_TABLE_BLOCK_LIST ?? 'idea_emailsBlocklist';
const ddb = new DynamoDB();

interface EmailInBlockList {
  email: string;
  expiresAt: number;
}

export const handler = (ev: any, _: any, cb: any): Promise<void> => new HandleSESNotifications(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class HandleSESNotifications extends GenericController {
  async handleRequest(): Promise<void> {
    const records = this.event.Records ?? [];
    for (const record of records) {
      const message = this.parseSNSMessage(record);
      if (!message) break;

      try {
        const type = message.eventType ?? message.notificationType;
        switch (type) {
          case 'Bounce':
            await this.handleBounce(message.bounce);
            break;
          case 'Reject':
          case 'Rendering Failure':
          case 'DeliveryDelay':
            this.logger.warn('SES '.concat(message.eventType), { message });
            break;
          case 'Send':
          case 'Delivery':
          default:
            break;
        }
      } catch (err) {
        this.logger.error('SES '.concat(message.eventType ?? 'unknown'), err, { message });
        throw err;
      }
    }
  }
  private parseSNSMessage(snsRecord: SNSEventRecord): any {
    const messageStr = snsRecord?.Sns?.Message;
    if (!messageStr) return null;
    try {
      return JSON.parse(messageStr);
    } catch (err) {
      this.logger.error('SES message parsing', err, { messageStr });
      return null;
    }
  }

  private async handleBounce(bounce: { bouncedRecipients: { action: string; emailAddress: string }[] }): Promise<void> {
    const emailsToBlock = (bounce?.bouncedRecipients ?? []).map(x => x.emailAddress);
    for (const email of emailsToBlock) await this.putEmailInBlockList(email);
  }
  private async putEmailInBlockList(email: string): Promise<void> {
    const expiresAt = Math.floor(Date.now() / 1000 + BOUNCES_NUM_DAYS_IN_BLOCK_LIST * 86400);
    const emailInBlockList: EmailInBlockList = { email, expiresAt };
    await ddb.put({ TableName: DDB_TABLE_BLOCK_LIST, Item: emailInBlockList });
  }
}

/**
 * Whether an email is in the block list.
 */
export const isEmailInBlockList = async (email: string): Promise<boolean> => {
  try {
    await ddb.get({ TableName: DDB_TABLE_BLOCK_LIST, Key: { email } });
    return true;
  } catch (error) {
    return false;
  }
};
