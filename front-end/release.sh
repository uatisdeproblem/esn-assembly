#!/bin/bash

# project specific parameters
AWS_PROFILE='esn-ga'
DOMAIN_PROD='esn-ga.link'
DOMAIN_DEV='dev.esn-ga.link'

# other parameters
ACTION=$1
SRC_FOLDER="${PWD}/src"
BACK_END_FOLDER="back-end"
C='\033[4;32m' # color
NC='\033[0m'   # reset (no color)

# disable pagination in aws cli commands
export AWS_PAGER=""

# set the script to exit in case of errors
set -o errexit

# parameters validation
if [ "${ACTION}" != "dev" ] && [ "${ACTION}" != "prod" ]
then
  echo -e "${C}Target environment: dev|prod${NC}"
  echo -e "${C}\t - dev:    release the front-end in the development environment${NC}"
  echo -e "${C}\t - prod:   release the front-end in the production environment${NC}"
  exit -1
fi

if [ "${ACTION}" == 'prod' ]
then
  DOMAIN=${DOMAIN_PROD}
else
  DOMAIN=${DOMAIN_DEV}
fi
echo -e "${C}Target domain: ${DOMAIN}${NC}"

# install the npm modules
echo -e "${C}Installing npm modules...${NC}"
npm i --silent 1>/dev/null

# lint the code in search for errors
echo -e "${C}Linting...${NC}"
npm run lint ${SRC_FOLDER} 1>/dev/null

# compile the project's typescript code
echo -e "${C}Compiling...${NC}"
ionic build --prod 1>/dev/null

# get the target CloudFront distribution and S3 bucket (from the domain)
DISTRIBUTION=`aws cloudfront list-distributions --query "DistributionList.Items[*].{Id: Id, Aliases: Aliases.Items[?(@ == '${DOMAIN}')]} | [?Aliases].[Id]" --profile ${AWS_PROFILE} --output text`
BUCKET=`aws cloudfront get-distribution --id ${DISTRIBUTION} --profile ${AWS_PROFILE} --output text \
 --query "Distribution.DistributionConfig.Origins.Items[0].DomainName" | cut -d "." -f 1`

# upload the project's files to the S3 bucket
echo -e "${C}Uploading...${NC}"
aws s3 sync ./www s3://${BUCKET} --profile ${AWS_PROFILE} --exclude ".well-known/*" 1>/dev/null

# invalidate old common files from the CloudFront distribution
echo -e "${C}Cleaning...${NC}"
aws cloudfront create-invalidation --profile ${AWS_PROFILE} --distribution-id ${DISTRIBUTION} \
  --paths "/index.html" "/assets/i18n*" \
  1>/dev/null

echo -e "${C}Done!${NC}"