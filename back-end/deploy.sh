#!/bin/bash

# project-specific parameters
AWS_PROFILE='esn-assembly-lt'
PROJECT='esn-assembly-lt'

# other parameters
ACTION=$1
STAGE=$2
SRC_FOLDER='src/'
C='\033[4;32m' # color
NC='\033[0m'   # reset (no color)

# disable pagination in aws cli commands
export AWS_PAGER=""

# set the script to exit in case of errors
set -o errexit

# parameters validation
if [ "${ACTION}" == "" ]
then
  echo -e "${C}First parameter: quick|dev|prod${NC}"
  echo -e "${C}\t - quick:    quickly deploy a single lambda function's code, specified by the second parameter${NC}"
  echo -e "${C}\t - dev:      deploy the development back-end environment${NC}"
  echo -e "${C}\t - prod:     deploy the production back-end environment${NC}"
  echo -e "${C}Second parameter: Lambda function's handler name${NC}"
  echo -e "${C}\t (only if the first parameter is 'quick')${NC}"
  exit -1
fi
if [ "${ACTION}" != "quick" ] && [ "${ACTION}" != "dev" ] && [ "${ACTION}" != "prod" ]
then
   >&2 echo -e "${C}The first parameter is the ACTION: quick|dev|prod${NC}"
  exit -1
fi

# run the deploy-quick script with AWS CDK and exit
if [ "${ACTION}" == "quick" ]
then
  npm run compile && npm run deploy "${PROJECT}-dev-api" \
    -- --context stage=dev --exclusively --hotswap --profile ${AWS_PROFILE}
  exit 0
fi

# install the npm modules
echo -e "${C}Installing npm modules...${NC}"
npm i --silent 1>/dev/null

# lint the code in search for errors
echo -e "${C}Linting...${NC}"
npm run lint ${SRC_FOLDER} 1>/dev/null

# compiling models
echo -e "${C}Compiling...${NC}"
npm run compile 1>/dev/null

# build and deploy with AWS CDK
echo -e "${C}Deploying CDK stacks...${NC}"
npm run deploy -- --context stage=${ACTION} --all --require-approval never --profile ${AWS_PROFILE}