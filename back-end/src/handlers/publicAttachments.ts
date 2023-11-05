///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController, S3 } from 'idea-aws';
import { SignedURL } from 'idea-toolbox';

import { User } from '../models/user.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const PROJECT = process.env.PROJECT;
const ddb = new DynamoDB();

const ATTACHMENTS_PREFIX = PROJECT.concat('-public-attachment');
const S3_BUCKET_MEDIA = process.env.S3_BUCKET_MEDIA;
const S3_ATTACHMENTS_FOLDER = process.env.S3_ATTACHMENTS_FOLDER;
const s3 = new S3();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new PublicAttachmentsRC(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class PublicAttachmentsRC extends ResourceController {
  galaxyUser: User;

  constructor(event: any, callback: any) {
    super(event, callback);
    this.galaxyUser = new User(event.requestContext.authorizer.lambda.user);
  }

  protected async patchResources(): Promise<SignedURL> {
    switch (this.body.action) {
      case 'GET_ATTACHMENT_UPLOAD_URL':
        return await this.getSignedURLToUploadAttachment();
      case 'GET_ATTACHMENT_DOWNLOAD_URL':
        return await this.getSignedURLToDownloadAttachment();
      default:
        throw new RCError('Unsupported action');
    }
  }
  private async getSignedURLToUploadAttachment(): Promise<SignedURL> {
    if (!this.galaxyUser.isAdministrator) throw new RCError('Unauthorized');

    const attachmentId = await ddb.IUNID(ATTACHMENTS_PREFIX);

    const key = `${S3_ATTACHMENTS_FOLDER}/${attachmentId}`;
    const signedURL = await s3.signedURLPut(S3_BUCKET_MEDIA, key);
    signedURL.id = attachmentId;

    return signedURL;
  }
  private async getSignedURLToDownloadAttachment(): Promise<SignedURL> {
    const { attachmentId } = this.body;
    if (!attachmentId) throw new RCError('Missing attachment ID');
    if (!attachmentId.startsWith(ATTACHMENTS_PREFIX)) throw new RCError('Not found');

    const key = `${S3_ATTACHMENTS_FOLDER}/${attachmentId}`;
    return await s3.signedURLGet(S3_BUCKET_MEDIA, key);
  }
}
