import SwaggerParser from '@apidevtools/swagger-parser';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import * as IAM from 'aws-cdk-lib/aws-iam';
import * as ApiGw from 'aws-cdk-lib/aws-apigatewayv2';
import * as DDB from 'aws-cdk-lib/aws-dynamodb';
import * as S3 from 'aws-cdk-lib/aws-s3';
import * as S3Deployment from 'aws-cdk-lib/aws-s3-deployment';

export interface ApiProps extends cdk.StackProps {
  project: string;
  stage: string;
  firstAdminEmail: string;
  apiDomain: string;
  apiDefinitionFile: string;
  resourceControllers: ResourceController[];
  tables: { [tableName: string]: DDBTable };
  mediaBucketArn: string;
  removalPolicy: RemovalPolicy;
}
export interface ResourceController {
  name: string;
  paths?: string[];
  isAuthFunction?: boolean;
}
export interface DDBTable {
  PK: DDB.Attribute;
  SK?: DDB.Attribute;
  indexes?: DDB.GlobalSecondaryIndexProps[];
  stream?: DDB.StreamViewType;
  expiresAtField?: string;
}

const defaultLambdaFnProps: NodejsFunctionProps = {
  runtime: Lambda.Runtime.NODEJS_14_X,
  timeout: Duration.seconds(10),
  memorySize: 1024,
  bundling: { minify: true, sourceMap: true },
  environment: { NODE_OPTIONS: '--enable-source-maps' },
  logRetention: RetentionDays.TWO_WEEKS
};

const defaultDDBTableProps: DDB.TableProps | any = {
  billingMode: DDB.BillingMode.PAY_PER_REQUEST,
  pointInTimeRecovery: true
};

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id, props);
    this.init(scope, id, props);
  }

  private async init(_: Construct, id: string, props: ApiProps): Promise<void> {
    const { api } = await this.createAPIAndStage({
      stackId: id,
      stage: props.stage,
      apiDomain: props.apiDomain,
      apiDefinitionFile: props.apiDefinitionFile
    });
    new cdk.CfnOutput(this, 'HTTPApiURL', { value: api.attrApiEndpoint });

    const { lambdaFunctions } = this.createLambdaFunctionsAndLinkThemToAPI({
      api,
      resourceControllers: props.resourceControllers,
      defaultLambdaFnProps,
      project: props.project,
      stage: props.stage
    });
    this.allowLambdaFunctionsToAccessIDEATablesAndFunctions({ lambdaFunctions: Object.values(lambdaFunctions) });
    this.allowLambdaFunctionsToAccessMediaBucketFoldersAndUploadAssets({
      stage: props.stage,
      lambdaFunctions: Object.values(lambdaFunctions),
      mediaBucketArn: props.mediaBucketArn,
      assetsFolder: 'assets',
      otherFolders: ['attachments', 'downloads', 'images']
    });
    this.allowLambdaFunctionsToSecretsManager({ lambdaFunctions: Object.values(lambdaFunctions) });

    this.createDDBTablesAndAllowLambdaFunctions({
      stackId: id,
      tables: props.tables,
      defaultTableProps: defaultDDBTableProps,
      removalPolicy: props.removalPolicy,
      lambdaFunctions: Object.values(lambdaFunctions)
    });

    //
    // PROJECT CUSTOM
    //

    // @idea insert here project-custom constructs if needed
  }

  //
  // HELPERS
  //

  private async createAPIAndStage(params: {
    stackId: string;
    stage: string;
    apiDefinitionFile: string;
    apiDomain: string;
  }): Promise<{ api: cdk.aws_apigatewayv2.CfnApi }> {
    const api = new ApiGw.CfnApi(this, 'HttpApi');

    // parse the OpenAPI (Swagger) definition, to integrate it with AWS resources
    const apiDefinition: any = await SwaggerParser.dereference(params.apiDefinitionFile);
    apiDefinition['x-amazon-apigateway-cors'] = {
      allowOrigins: ['*'],
      allowMethods: ['*'],
      allowHeaders: ['Content-Type', 'Authorization']
    };

    // set metadata to recognize the API in the API Gateway console
    apiDefinition.info.description = apiDefinition.info.title;
    apiDefinition.info.title = params.stackId;

    // note: it's important to set it here and not earlier, so we are sure all the attributes have been already set
    api.body = apiDefinition;

    const apiStage = new ApiGw.CfnStage(this, 'HttpApiDefaultStage', {
      apiId: api.ref,
      stageName: '$default',
      autoDeploy: true
    });

    new ApiGw.CfnApiMapping(this, 'HttpApiMapping', {
      domainName: params.apiDomain,
      apiId: api.ref,
      apiMappingKey: params.stage,
      stage: apiStage.ref
    });

    return { api };
  }

  private createLambdaFunctionsAndLinkThemToAPI(params: {
    project: string;
    stage: string;
    resourceControllers: ResourceController[];
    defaultLambdaFnProps: NodejsFunctionProps;
    api: cdk.aws_apigatewayv2.CfnApi;
  }): {
    lambdaFunctions: { [resourceName: string]: NodejsFunction };
  } {
    const lambdaFunctions: { [resourceName: string]: NodejsFunction } = {};

    const resourceIntegrationSetting = {
      type: 'AWS_PROXY',
      httpMethod: 'POST',
      payloadFormatVersion: '2.0'
    };

    // create a Lambda function for each Resource Controller
    params.resourceControllers.forEach(resource => {
      const lambdaFnName = params.project.concat('_', params.stage, '_', resource.name);
      const lambdaFn = new NodejsFunction(this, resource.name.concat('Function'), {
        ...params.defaultLambdaFnProps,
        functionName: lambdaFnName,
        entry: `./src/handlers/${resource.name}.ts`
      });

      // link the Lambda function to the Resource Controller's paths (if any)
      if (resource.paths) {
        resource.paths.forEach(path => {
          if (params.api.body.paths[path]) {
            Object.keys(params.api.body.paths[path]).forEach(method => {
              params.api.body.paths[path][method]['x-amazon-apigateway-integration'] = {
                ...resourceIntegrationSetting,
                uri: lambdaFn.functionArn
              };
            });
          }
        });
      }

      // allow the api to execute the Lambda function
      const region = cdk.Stack.of(this).region;
      const account = cdk.Stack.of(this).account;
      lambdaFn.addPermission(`${resource.name}-permission`, {
        principal: new IAM.ServicePrincipal('apigateway.amazonaws.com'),
        action: 'lambda:InvokeFunction',
        sourceArn: `arn:aws:execute-api:${region}:${account}:${params.api.ref}/*/*/*`
      });

      // integrate the AuthFunction into the Api definition
      if (resource.isAuthFunction)
        params.api.body.components.securitySchemes['AuthFunction']['x-amazon-apigateway-authorizer'] = {
          type: 'request',
          identitySource: '$request.header.Authorization',
          authorizerUri: `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${region}:${account}:function:${lambdaFnName}/invocations`,
          authorizerPayloadFormatVersion: '2.0',
          authorizerResultTtlInSeconds: 300,
          enableSimpleResponses: true
        };

      lambdaFn.addEnvironment('PROJECT', params.project);
      lambdaFn.addEnvironment('STAGE', params.stage);
      lambdaFn.addEnvironment('RESOURCE', resource.name);

      lambdaFunctions[resource.name] = lambdaFn;
    });

    return { lambdaFunctions };
  }
  private allowLambdaFunctionsToAccessIDEATablesAndFunctions(params: { lambdaFunctions: NodejsFunction[] }): void {
    const region = cdk.Stack.of(this).region;
    const account = cdk.Stack.of(this).account;
    const accessIDEAResources = new IAM.Policy(this, 'AccessIDEAResources', {
      statements: [
        new IAM.PolicyStatement({
          effect: IAM.Effect.ALLOW,
          actions: ['dynamodb:*', 'lambda:InvokeFunction'],
          resources: [
            `arn:aws:dynamodb:${region}:${account}:table/idea_*`,
            `arn:aws:lambda:${region}:${account}:function:idea_*`
          ]
        })
      ]
    });

    params.lambdaFunctions.forEach(lambdaFn => {
      if (lambdaFn.role) lambdaFn.role.attachInlinePolicy(accessIDEAResources);
    });
  }
  private allowLambdaFunctionsToAccessMediaBucketFoldersAndUploadAssets(params: {
    stage: string;
    lambdaFunctions: NodejsFunction[];
    mediaBucketArn: string;
    assetsFolder: string;
    otherFolders: string[];
  }): void {
    const s3MediaBucket = S3.Bucket.fromBucketArn(this, 'MediaBucket', params.mediaBucketArn);
    const accessMediaBucketPolicy = new IAM.Policy(this, 'AccessMediaBucket', {
      statements: [
        new IAM.PolicyStatement({
          effect: IAM.Effect.ALLOW,
          actions: ['s3:Get*', 's3:Put*', 's3:Delete*'],
          resources: [params.assetsFolder, ...params.otherFolders].map(
            folder => `arn:aws:s3:::${s3MediaBucket.bucketName}/${folder}/${params.stage}/*`
          )
        })
      ]
    });
    params.lambdaFunctions.forEach(lambdaFn => {
      if (lambdaFn.role) lambdaFn.role.attachInlinePolicy(accessMediaBucketPolicy);
      lambdaFn.addEnvironment('S3_BUCKET_MEDIA', s3MediaBucket.bucketName);
      lambdaFn.addEnvironment('S3_ASSETS_FOLDER', params.assetsFolder.concat('/', params.stage));
      params.otherFolders.forEach(folder => {
        if (folder !== params.assetsFolder)
          lambdaFn.addEnvironment(`S3_${folder.toUpperCase()}_FOLDER`, folder.concat('/', params.stage));
      });
    });

    new S3Deployment.BucketDeployment(this, 'Assets', {
      sources: [S3Deployment.Source.asset(params.assetsFolder)],
      exclude: ['.DS_Store'],
      destinationBucket: s3MediaBucket,
      destinationKeyPrefix: params.assetsFolder.concat('/', params.stage)
    });
  }
  private allowLambdaFunctionsToSecretsManager(params: { lambdaFunctions: NodejsFunction[] }): void {
    const accessSecretsManagerPolicy = new IAM.Policy(this, 'AccessSecretsManager', {
      statements: [
        new IAM.PolicyStatement({
          effect: IAM.Effect.ALLOW,
          actions: ['secretsmanager:GetSecretValue'],
          resources: ['*']
        })
      ]
    });
    params.lambdaFunctions.forEach(lambdaFn => {
      if (lambdaFn.role) lambdaFn.role.attachInlinePolicy(accessSecretsManagerPolicy);
    });
  }

  private createDDBTablesAndAllowLambdaFunctions(params: {
    stackId: string;
    tables: { [tableName: string]: DDBTable };
    defaultTableProps: DDB.TableProps;
    removalPolicy: RemovalPolicy;
    lambdaFunctions: NodejsFunction[];
  }): { tables: { [tableName: string]: DDB.Table } } {
    const tables: { [tableName: string]: DDB.Table } = {};

    for (const tableName in params.tables) {
      const physicalTableName = params.stackId.concat('_', tableName);
      const table = new DDB.Table(this, tableName.concat('-Table'), {
        ...params.defaultTableProps,
        tableName: physicalTableName,
        partitionKey: params.tables[tableName].PK,
        sortKey: params.tables[tableName].SK,
        removalPolicy: params.removalPolicy,
        stream: params.tables[tableName].stream,
        timeToLiveAttribute: params.tables[tableName].expiresAtField
      });

      (params.tables[tableName].indexes || []).forEach(GSI => table.addGlobalSecondaryIndex(GSI));

      params.lambdaFunctions.forEach(lambdaFn => {
        table.grantReadWriteData(lambdaFn);
        lambdaFn.addEnvironment('DDB_TABLE_'.concat(tableName), physicalTableName);
      });

      tables[tableName] = table;
    }

    return { tables };
  }
}
