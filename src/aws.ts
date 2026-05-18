import { S3Client } from '@aws-sdk/client-s3'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { SQSClient } from '@aws-sdk/client-sqs'
import { SNSClient } from '@aws-sdk/client-sns'
import { LambdaClient } from '@aws-sdk/client-lambda'
import { IAMClient } from '@aws-sdk/client-iam'
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs'
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import { KinesisClient } from '@aws-sdk/client-kinesis'

const cfg = {
  region: 'us-east-1',
  endpoint: 'http://localhost:4566',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  forcePathStyle: true,
}

export const s3 = new S3Client(cfg)
export const dynamo = new DynamoDBClient(cfg)
export const sqs = new SQSClient(cfg)
export const sns = new SNSClient(cfg)
export const lambda = new LambdaClient(cfg)
export const iam = new IAMClient(cfg)
export const cwlogs = new CloudWatchLogsClient(cfg)
export const secrets = new SecretsManagerClient(cfg)
export const kinesis = new KinesisClient(cfg)
