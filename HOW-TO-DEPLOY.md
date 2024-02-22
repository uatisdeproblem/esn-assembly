# How to (re)create the app environment

Hello, there! This is a guide to deploy the app on a new environment; it only takes about one hour and it's almost fully-automated.

**The back-end is implemented on AWS** ([Amazon Web Services](https://aws.amazon.com/)) resources. _Note: you don't need to have particular knowledge on AWS to complete this walkthrough._

If you're following this guide to implement the tool for a National Organization, you may want to use [this email template](https://docs.google.com/document/d/1o9HHcC_hKjlFrVs9g53jh_VfJwZaNsg7qnL7tT-Hzug/edit#heading=h.3c135plyvtua).

## Pre-requirements

### Set up the AWS Account

1. Choose an AWS account you own, or [create a new one](https://aws.amazon.com/getting-started/). **Make sure to link a valid credit card** to avoid issues later on.
1. To completely automate the deployment process, [purchase a new domain name](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-register.html) inside the [Route53](https://aws.amazon.com/route53) service in the target AWS account. The operation takes approximately 30 minutes, and the expected result is a new domain registered and a new hosted zone (created automatically) inside Route53. _Note: for the domain `esn-ga.link` purchased through Route53, we pay only 5$/year._
1. Identify an [IAM user](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users.html) ([or create a new one](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html) — [here's a small video guide](https://drive.google.com/file/d/1Ko_F91PczCZwQCIMeLk7YJx5J8qDNtaJ/view?usp=drive_link)); then, [create a new set of access keys](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html): these will be later on saved in your computer (in a profile) and used to access and manage AWS cloud resources.
1. Identify one [AWS region](https://aws.amazon.com/about-aws/global-infrastructure/regions_az/) to use, i.e. where all your cloud resources will be deployed. Suggested regions — since they are close and support all the cloud resources that we use in the project: **Frankfurt** (`eu-central-1`) or **Ireland** (`eu-west-1`).

### Set up your local computer

1. Ideally, you are running these instructions from a Mac (MacOS) or Linux computer; if you're using a Windows PC, [make sure you can run shell script files (.sh)](https://superuser.com/questions/120045/how-to-execute-sh-file-on-windows).
1. Install the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html).
1. Open your terminal (command prompt) and [configure a **named profile**](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) with the credentials (access keys) linked to your AWS account. You can choose any name for your profile, but make sure to use it consistently later on.

   ```sh
   aws configure --profile {AWS_PROFILE}

   # example:
   aws configure --profile esn-assembly-italy
   # AWS Access Key ID [None]: {YOUR_ACCESS_KEY_ID}
   # AWS Secret Access Key [None]: {YOUR_ACCESS_KEY_SECRET}
   # Default region name [None]: eu-central-1
   # Default output format [None]: json
   ```

1. Install [NodeJS](https://nodejs.org/en/). The app is built on Typescript and NodeJS, so it's a mandatory development tool.
1. Install the [AWS Cloud Development Kit (CDK)](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html); this Infrastructure as Code (IaC) toolkit will deploy the app environment for us.

## Deployment

The suggested IDE is [Visual Studio Code](https://code.visualstudio.com/); we included some handy shortcuts built for it.

1. Open the terminal (command prompt) and [boostrap CDK](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html) in the account/region identified by running:

   ```sh
   cdk bootstrap aws://{AWS_ACCOUNT_ID}/{AWS_REGION} --profile {AWS_PROFILE}
   ```

1. Fork the [repository on GitHub](https://github.com/uatisdeproblem/esn-assembly) (or create a new branch from the `main` one) and download the project's files.
1. Open the project folder in the IDE.
1. Make sure you have installed the project's libraries and dependencies by running in the terminal, from project's root:
   ```sh
   cd back-end
   npm install
   cd ../front-end
   npm install
   ```
1. Identify the file `/back-end/deploy/environments.ts` and fix the configuration with your values; explanation:
   - `PROJECT`: choose a key to identify the project and its resources. **Try not to use a key too simple, to avoid naming-overlapping on global resources**. An optimal name would be something like: _esn-assembly-italy_. **Please use only smaller case letters and dashes to avoid uncompatibility issues later on.**
   - `DOMAIN`: the domain name you purchased/imported earlier. Example: _esn-assembly-italy.link_.
   - `PROD_CUSTOM_DOMAIN`: set it to `null`, following the example in the comment next to the constant.
1. Configure the following two deploy scripts, by setting the necessary variables:

   - `/back-end/deploy.sh`:
     - `AWS_PROFILE`.
     - `PROJECT`.
   - `/front-end/release.sh`; note: this script supports out-of-the-box two environments: _dev_ and _prod_:
     - `AWS_PROFILE`.
     - `DOMAIN_PROD`: e.g. _esn-assembly-italy.link_
     - `DOMAIN_DEV`: e.g. _dev.esn-assembly-italy.link_

1. Create a random secure string (`{VALUE}`) that the app will use to create authentication tokens. Note: `{PROJECT}` must be the same one just set above.
   ```
   aws ssm put-parameter --profile {AWS_PROFILE} --type "SecureString" --name "/{PROJECT}/auth" --value "{VALUE}"
   ```
1. You can create as many enviroments (stages) as you like; a common (the default) configuration includes _prod_ and _dev_ stages. **Repeat this step for each of the desired stages**. From the terminal, make sure to be in the `/back-end` folder of the project, substitute the `{STAGE}` variable (based on the stage/environment you want to deploy) and run:
   ```sh
   cdk deploy --profile {AWS_PROFILE} --context stage={STAGE} --all --require-approval never
   ```
1. _...it will take some time!_ If prompeted, confirm all the requests to create new resources.
1. From Visual Studio Code menu:
   1. "Terminal > Run build task", select "Deploy back-end environment" and select a stage you've created.
   1. "Terminal > Run build task", select "Deploy front-end environment" and select a stage you've created.
1. Feel free to commit the few changed files in the forked GitHub repository (or branch). _Please, if you make any changes to the source code, commit them to the forked repository (or branch) so that other NOs can take advantage of your improvements._
1. **Note well.** The first user to access a given app environment will automatically be administrator.
1. Some of the internal features require the sending of email messages. To enable our AWS account to send emails (through the [SES service](https://aws.amazon.com/ses/)), we need to request to AWS to be taken out of the default sandbox of SES. [Read here for more information](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html). To do this, you can start by running the following command in the terminal, then follow AWS instructions (you will receive a follow-up email within a day or two) accordingly. Basically, you have to prove that you can handle the project's email sending without generating too much SPAM or receiving too many email bounces.

   ```sh
   aws sesv2 put-account-details \
   --profile {AWS_PROFILE}
   --production-access-enabled \
   --mail-type TRANSACTIONAL \
   --website-url https://{FRONT-END-DOMAIN} \
   --use-case-description "We send transactional emails following user-requested actions. All the target email addreses are verified. We implemented a mechanism to detect and manage bounces." \
   --additional-contact-email-addresses {YOUR_EMAIL_ADDRESS} \
   --contact-language EN
   ```

## Deploying new changes

If you make changes to the code (or the infrastructure), to deploy them, you can run "Terminal > Run build task" (keyboard shortcut: `shift+cmd+b`), select whether you want to deploy the back-end environment or release the front-end environment, and finally pick the desired target stage. [Learn more in the CONTRIBUTING doc](/CONTRIBUTING.md).

## Post-installation: custom domain

If you want to have your production environment available to a custom domain (e.g. _assembly.esn.it_), there are a few more steps to follow.

If you're following this guide on behalf of another National Organization, you may want to use [this email template](https://docs.google.com/document/d/1o9HHcC_hKjlFrVs9g53jh_VfJwZaNsg7qnL7tT-Hzug/edit#heading=h.9jlqqqv3bhun).

1. We need to create an SSL certificate that is linked to the custom domain; note: the certificate must be always created in the region `us-east-1`, regardless of the region where you deployed the application. The `{CUSTOM_DOMAIN_NAME}` it's the full custom domain name you chose: `assembly.esn.it`. You can achieve this by running the following command in the terminal:
   ```
   aws --profile {AWS_PROFILE} --region us-east-1 acm request-certificate \
   --domain-name {CUSTOM_DOMAIN_NAME} --validation-method DNS
   ```
1. Once the certificate is created, it needs to be validated: we need to prove to AWS that we own the custom domain we specified. To do so, we have to add two domain records to the custom domain's DNS. First of all, we gather the first CNAME record to put in the custom domain's DNS. Run terminal command below. The `{CERTIFICATE_ARN}` is the ARN that was in the output of the previous command (e.g. `arn:aws:acm:us-east-1:111111111111:certificate/xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`). _In case you've lost it, you can still recovering it through the AWS Console in the service ACM (AWS Certificate Manager)._

   ```sh
   aws --profile {AWS_PROFILE} --region us-east-1 acm describe-certificate \
   --certificate-arn {CERTIFICATE_ARN}

   # output
   # "Certificate": {
   #   ...
   #   "DomainValidationOptions": [
   #     {
   #       "DomainName": "assembly.esn.it",
   #       "ValidationDomain": "assembly.esn.it",
   #       "ValidationStatus": "PENDING_VALIDATION",
   #       "ResourceRecord": {
   #          "Name": "xxxxx.assembly.esn.it.",
   #          "Type": "CNAME",
   #          "Value": "yyyyy.mhbtsbpdnt.acm-validations.aws."
   #       },
   #       ...
   ```

1. From the output of the previous command we can gather the CNAME name/value record (`ResourceRecord`) that should be added to the custom domain's DNS to validate the certificate we created. _To check on the validation status, you can run again the previous command (or check the ACM service in the AWS Console)._
1. The other CNAME record that we need to add to the custom domain's DNS represents a link between our distributed app and the custom domain. The `name` of the record is the `CUSTOM_DOMAIN_NAME`; the value is the result of the following terminal command. The variable `DOMAIN_YOU_BOUGHT` is the domain of the production environment, e.g. `esn-assembly-italy.link`.

   ```sh
   aws cloudfront list-distributions --profile {AWS_PROFILE} --output text \
   --query "DistributionList.Items[?Aliases.Items[0] == '{DOMAIN_YOU_BOUGHT}'].DomainName | [0]"

   # output
   zzzzzzzzz.cloudfront.net
   ```

1. Add (or ask to add) the two CNAME records that we gathered in the previous steps. Once you did, or you receive confirmation that the records have been successfully implemented, we can go on with the last few steps.
1. Open the file `/back-end/deploy/environments.ts` and fix the `PROD_CUSTOM_DOMAIN` value with your chosen custom domain, e.g.:
   ```typescript
   export const PROD_CUSTOM_DOMAIN = 'assembly.esn.it';
   ```
1. From Visual Studio Code menu: "Terminal > Run build task", select "Deploy back-end environment" and select "prod". _Note: this deploy will fail in case the certificate hasn't been validated yet._
1. Wait a few minutes and your production environment should be available at the new custom domain: well done!
1. Don't forget to commit this changes in the forked repository (or branch).
