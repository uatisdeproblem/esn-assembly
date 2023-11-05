///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController } from 'idea-aws';

import { addStatisticEntry } from './statistics';

import { Opportunity } from '../models/opportunity.model';
import { User } from '../models/user.model';
import { StatisticEntityTypes } from '../models/statistic.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const PROJECT = process.env.PROJECT;
const DDB_TABLES = { opportunities: process.env.DDB_TABLE_opportunities };
const ddb = new DynamoDB();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new OpportunitiesRC(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class OpportunitiesRC extends ResourceController {
  galaxyUser: User;
  opportunity: Opportunity;

  constructor(event: any, callback: any) {
    super(event, callback, { resourceId: 'opportunityId' });
    this.galaxyUser = new User(event.requestContext.authorizer.lambda.user);
  }

  protected async checkAuthBeforeRequest(): Promise<void> {
    if (!this.resourceId) return;

    try {
      this.opportunity = new Opportunity(
        await ddb.get({ TableName: DDB_TABLES.opportunities, Key: { opportunityId: this.resourceId } })
      );
    } catch (err) {
      throw new RCError('Opportunity not found');
    }
  }

  protected async getResources(): Promise<Opportunity[]> {
    let opportunities: Opportunity[] = await ddb.scan({ TableName: DDB_TABLES.opportunities });
    opportunities = opportunities.map(x => new Opportunity(x));

    if (!this.galaxyUser.canManageOpportunities) opportunities = opportunities.filter(x => !x.isDraft());

    opportunities = opportunities.filter(x =>
      this.queryParams.archivedFromYear
        ? x.isArchived() && x.yearOfCreation === Number(this.queryParams.archivedFromYear)
        : !x.isArchived()
    );

    opportunities = opportunities.sort((a, b): number => b.createdAt.localeCompare(a.createdAt));

    await addStatisticEntry(this.galaxyUser, StatisticEntityTypes.OPPORTUNITIES);

    return opportunities;
  }

  private async putSafeResource(opts: { noOverwrite: boolean }): Promise<Opportunity> {
    const errors = this.opportunity.validate();
    if (errors.length) throw new RCError(`Invalid fields: ${errors.join(', ')}`);

    const putParams: any = { TableName: DDB_TABLES.opportunities, Item: this.opportunity };
    if (opts.noOverwrite) putParams.ConditionExpression = 'attribute_not_exists(opportunityId)';
    else this.opportunity.updatedAt = new Date().toISOString();

    await ddb.put(putParams);

    return this.opportunity;
  }

  protected async postResources(): Promise<Opportunity> {
    if (!this.galaxyUser.canManageOpportunities) throw new RCError('Unauthorized');

    this.opportunity = new Opportunity(this.body);
    this.opportunity.opportunityId = await ddb.IUNID(PROJECT);
    this.opportunity.createdAt = new Date().toISOString();
    this.opportunity.yearOfCreation = new Date(this.opportunity.createdAt).getFullYear();

    await this.putSafeResource({ noOverwrite: true });

    return this.opportunity;
  }

  protected async getResource(): Promise<Opportunity> {
    if (this.opportunity.isDraft() && !this.galaxyUser.canManageOpportunities) throw new RCError('Unauthorized');

    await addStatisticEntry(this.galaxyUser, StatisticEntityTypes.OPPORTUNITIES, this.resourceId);

    return this.opportunity;
  }

  protected async putResource(): Promise<Opportunity> {
    if (!this.galaxyUser.canManageOpportunities) throw new RCError('Unauthorized');

    const oldOpportunity = new Opportunity(this.opportunity);
    this.opportunity.safeLoad(this.body, oldOpportunity);

    return await this.putSafeResource({ noOverwrite: false });
  }

  protected async patchResource(): Promise<Opportunity | string[]> {
    switch (this.body.action) {
      case 'OPEN':
        return await this.manageStatus(true);
      case 'CLOSE':
        return await this.manageStatus(false);
      case 'ARCHIVE':
        return await this.manageArchive(true);
      case 'UNARCHIVE':
        return await this.manageArchive(false);
      default:
        throw new RCError('Unsupported action');
    }
  }
  private async manageStatus(open: boolean): Promise<Opportunity> {
    if (!this.galaxyUser.canManageOpportunities) throw new RCError('Unauthorized');

    if (open) delete this.opportunity.closedAt;
    else this.opportunity.closedAt = new Date().toISOString();

    await ddb.put({ TableName: DDB_TABLES.opportunities, Item: this.opportunity });
    return this.opportunity;
  }
  private async manageArchive(archive: boolean): Promise<Opportunity> {
    if (!this.galaxyUser.canManageOpportunities) throw new RCError('Unauthorized');

    if (archive) {
      this.opportunity.archivedAt = new Date().toISOString();
      if (!this.opportunity.closedAt) this.opportunity.closedAt = this.opportunity.archivedAt;
    } else delete this.opportunity.archivedAt;

    await ddb.put({ TableName: DDB_TABLES.opportunities, Item: this.opportunity });
    return this.opportunity;
  }

  protected async deleteResource(): Promise<void> {
    if (!this.galaxyUser.canManageOpportunities) throw new RCError('Unauthorized');

    await ddb.delete({ TableName: DDB_TABLES.opportunities, Key: { opportunityId: this.opportunity.opportunityId } });
  }
}
