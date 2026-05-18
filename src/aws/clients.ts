import { S3Client } from '@aws-sdk/client-s3'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { SQSClient } from '@aws-sdk/client-sqs'
import { SNSClient } from '@aws-sdk/client-sns'
import { LambdaClient } from '@aws-sdk/client-lambda'
import { IAMClient } from '@aws-sdk/client-iam'
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs'
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import { KinesisClient } from '@aws-sdk/client-kinesis'
import { EC2Client } from '@aws-sdk/client-ec2'
import { RDSClient } from '@aws-sdk/client-rds'
import { ECSClient } from '@aws-sdk/client-ecs'
import { ApiGatewayV2Client } from '@aws-sdk/client-apigatewayv2'
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider'
import { SFNClient } from '@aws-sdk/client-sfn'
import { EventBridgeClient } from '@aws-sdk/client-eventbridge'
import { KMSClient } from '@aws-sdk/client-kms'
import { ECRClient } from '@aws-sdk/client-ecr'
import { ElasticLoadBalancingV2Client } from '@aws-sdk/client-elastic-load-balancing-v2'
import { SSMClient } from '@aws-sdk/client-ssm'
import { CloudFormationClient } from '@aws-sdk/client-cloudformation'

// Proxy all requests through Vite dev server (/floci → localhost:4566)
// This avoids CORS issues since the browser stays on the same origin.
const PROXY = `${window.location.origin}/floci`

const base = {
  region: 'us-east-1',
  endpoint: PROXY,
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
}

export const s3Client = new S3Client({ ...base, forcePathStyle: true })
export const dynamoClient = new DynamoDBClient(base)
export const sqsClient = new SQSClient(base)
export const snsClient = new SNSClient(base)
export const lambdaClient = new LambdaClient(base)
export const iamClient = new IAMClient(base)
export const logsClient = new CloudWatchLogsClient(base)
export const secretsClient = new SecretsManagerClient(base)
export const kinesisClient = new KinesisClient(base)
export const ec2Client = new EC2Client(base)
export const rdsClient = new RDSClient(base)
export const ecsClient = new ECSClient(base)
export const apigwClient = new ApiGatewayV2Client(base)
export const cognitoClient = new CognitoIdentityProviderClient(base)
export const sfnClient = new SFNClient(base)
export const ebClient = new EventBridgeClient(base)
export const kmsClient = new KMSClient(base)
export const ecrClient = new ECRClient(base)
export const elbClient = new ElasticLoadBalancingV2Client(base)
export const ssmClient = new SSMClient(base)
export const cfnClient = new CloudFormationClient(base)
