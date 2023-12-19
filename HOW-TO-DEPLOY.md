# How to (re)create the app environment

Hello, there! This is a guide to deploy the app on a new environment; it only takes ~1 hour and it's almost fully-automated.

**The back-end is implemented on AWS** ([Amazon Web Services](https://aws.amazon.com/)) resources. _Note: you don't need to have particular knowledge on AWS to complete this walkthrough._

## Pre-requirements

1. Ideally, you are running these instructions from a Mac (MacOS) or Linux computer; if you're using a Windows PC, [make sure you can run shell script files (.sh)](https://superuser.com/questions/120045/how-to-execute-sh-file-on-windows).
1. Choose an AWS account you own, or [create a new one](https://aws.amazon.com/getting-started/). Make sure to link a valid credit card to avoid issues later on.
1. To completely automate the deployment process, make sure to [purchase a new domain name](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-register.html) or import an existing one inside the [Route53](https://aws.amazon.com/route53) AWS service. _Note: for the domain `esn-ga.link` purchased through Route53 we pay only 4$/year._
1. Identify one [AWS region](https://aws.amazon.com/about-aws/global-infrastructure/regions_az/) to use, i.e. where all your cloud resources will be deployed. Suggested regions — since they are close and they support all the cloud resources we use in the project:
   - Frankfurt (`eu-central-1`),
   - Ireland (`eu-west-1`).
1. Install the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html) and [configure a **named profile** with the credentials linked to your AWS account](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html).
1. Install [NodeJS](https://nodejs.org/en/); the app is built on Typescript and NodeJS, so it's a mandatory development tool.
1. Install the [AWS Cloud Development Kit (CDK)](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html); this toolkit will deploy the app environment for us.
1. [Boostrap CDK](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html) in the account/region identified by running the terminal/prompt command:
   ```
   cdk bootstrap aws://ACCOUNT_ID/REGION
   ```

## Deployment

The suggested IDE is [Visual Studio Code](https://code.visualstudio.com/); we included some handy shortcuts built for it.

1. Fork the [repository on GitHub](https://github.com/uatisdeproblem/esn-assembly) and download the project's files.
1. Open the project folder in the IDE.
1. Make sure you have installed the project's libraries and dependencies by running in the terminal, from project's root:
   ```
   cd back-end
   npm install
   cd ../front-end
   npm install
   ```
1. Identify the file `/back-end/deploy/environments.ts` and fix the configuration with your values; explanation:
   - `PROJECT`: choose a key to identify the project and its resources. _Tip: try not to use a key too simple, to avoid naming-overlapping on global resources. An optimal name would be something like: esn-italy-assembly_. **Please use only smaller case letters and dashes to avoid uncompatibility issues later on.**
   - `DOMAIN`: the domain name you purchased/imported earlier. Example: _esn-italy-assembly.link_.
1. You can create as many enviroments (stages) as you like; a common (the default) configuration is with _prod_ and _dev_ stages, but you can also create only a production stage or whatever you like.
1. From the terminal/prompt, make sure to be in the `/back-end` folder of the project, substitute the STAGE variable (based on the stage/environment you want to deploy) and run:
   ```
   cdk deploy --context stage=STAGE --all --require-approval never --outputs-file output-config.json
   ```
1. _...it will take some time!_ If prompeted, confirm all the requests to create new resources.
1. At the end of the deployment, identify the generated file `/back-end/output-config.json` to get some important configurations to set in a few support files; _note: the same values also appear in the terminal while the resources are being created_:

   - `/back-end/deploy.sh`:
     - `AWS_PROFILE`: only if you need to use named profiles to identify the AWS account, _i.e. this account is not your default's one_.
     - `PROJECT`
   - `/front-end/release.sh`; note: this script supports out-of-the-box two environments: _dev_ and _prod_. To complete the file, fill-in the stage-specific parameters after each stage's deployment:
     - `AWS_PROFILE`: only if you need to use named profiles to identify the AWS account, _i.e. this account is not your default's one_.
     - `DOMAIN_PROD`: e.g. _esn-italy-assembly.link_
     - `DOMAIN_DEV`: e.g. _dev.esn-italy-assembly.link_

1. From Visual Studio Code menu:
   1. "Terminal > Run build task", select "Deploy back-end environment" and select the stage you've just created.
   1. "Terminal > Run build task", select "Deploy front-end environment" and select the stage you've just created.
1. **Repeat the deployment steps for each of the desired stages (e.g. _prod_, _dev_)**. Note: after you deployed the 2nd, 3rd, etc. stage, you only need to change/set project-specific parameters: the rest of those you've already set during the deployment of the first stage.
1. Feel free to commit the few changed files in the forked GitHub repository. Please, if you do any changes to the source code, commit them to the forked repository so that other NOs/sections can take advantage of your improvements.
1. Some of the internal features require the sending of email messages. To enable our AWS account to send emails (through the [SES service](https://aws.amazon.com/ses/)), we need to request to AWS to be taken out of the default sandbox of SES. [Read here for more information](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html). To do this, you can start by running the following command in the terminal, then follow AWS instructions (you will receive a follow-up email) accordingly. Basically, you have to prove that you can handle the project's email sending without generating too much SPAM or receiving too many email bounces.

   ```
   aws sesv2 put-account-details \
   --profile {AWS_PROFILE}
   --production-access-enabled \
   --mail-type TRANSACTIONAL \
   --website-url https://{FRONT-END-DOMAIN} \
   --use-case-description "We send transactional emails following user-requested actions. All the target email addreses are verified. We implemented a mechanism to detect and manage bounces." \
   --additional-contact-email-addresses {YOUR_EMAIL_ADDRESS} \
   --contact-language EN
   ```
