import {
  CreateBucketCommand, DeleteBucketCommand, ListBucketsCommand,
} from '@aws-sdk/client-s3'
import { CreateTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb'
import type { AttributeDefinition, KeySchemaElement } from '@aws-sdk/client-dynamodb'
import { CreateQueueCommand, ListQueuesCommand } from '@aws-sdk/client-sqs'
import { CreateTopicCommand, ListTopicsCommand } from '@aws-sdk/client-sns'
import { CreateStreamCommand, ListStreamsCommand } from '@aws-sdk/client-kinesis'
import { CreateRepositoryCommand, DescribeRepositoriesCommand } from '@aws-sdk/client-ecr'
import { CreateSecretCommand, ListSecretsCommand } from '@aws-sdk/client-secrets-manager'
import { CreateUserCommand, ListUsersCommand } from '@aws-sdk/client-iam'
import { CreateFunctionCommand, ListFunctionsCommand, Runtime } from '@aws-sdk/client-lambda'
import { CreateUserPoolCommand, ListUserPoolsCommand } from '@aws-sdk/client-cognito-identity-provider'
import {
  s3Client, dynamoClient, sqsClient, snsClient, kinesisClient,
  ecrClient, secretsClient, iamClient, lambdaClient, cognitoClient,
} from '../aws/clients'

export interface Tool {
  name: string
  description: string
  params: string   // human-readable params description
  execute: (params: Record<string, unknown>) => Promise<string>
}

export const TOOLS: Tool[] = [
  // ── S3 ────────────────────────────────────────────────────────────────────
  {
    name: 'list_s3_buckets',
    description: 'List all S3 buckets',
    params: '(none)',
    execute: async () => {
      const r = await s3Client.send(new ListBucketsCommand({}))
      const names = (r.Buckets ?? []).map(b => b.Name).filter(Boolean)
      return names.length ? `Buckets: ${names.join(', ')}` : 'No buckets found.'
    },
  },
  {
    name: 'create_s3_bucket',
    description: 'Create a new S3 bucket',
    params: '{ "name": string }',
    execute: async (p) => {
      await s3Client.send(new CreateBucketCommand({ Bucket: p.name as string }))
      return `Created S3 bucket: ${p.name}`
    },
  },
  {
    name: 'delete_s3_bucket',
    description: 'Delete an S3 bucket',
    params: '{ "name": string }',
    execute: async (p) => {
      await s3Client.send(new DeleteBucketCommand({ Bucket: p.name as string }))
      return `Deleted S3 bucket: ${p.name}`
    },
  },

  // ── DynamoDB ──────────────────────────────────────────────────────────────
  {
    name: 'list_dynamodb_tables',
    description: 'List all DynamoDB tables',
    params: '(none)',
    execute: async () => {
      const r = await dynamoClient.send(new ListTablesCommand({}))
      const names = r.TableNames ?? []
      return names.length ? `Tables: ${names.join(', ')}` : 'No tables found.'
    },
  },
  {
    name: 'create_dynamodb_table',
    description: 'Create a DynamoDB table',
    params: '{ "name": string, "partition_key": string, "sort_key"?: string }',
    execute: async (p) => {
      const attrs: AttributeDefinition[] = [
        { AttributeName: p.partition_key as string, AttributeType: 'S' },
      ]
      const keys: KeySchemaElement[] = [
        { AttributeName: p.partition_key as string, KeyType: 'HASH' },
      ]
      if (p.sort_key) {
        attrs.push({ AttributeName: p.sort_key as string, AttributeType: 'S' })
        keys.push({ AttributeName: p.sort_key as string, KeyType: 'RANGE' })
      }
      await dynamoClient.send(new CreateTableCommand({
        TableName: p.name as string,
        AttributeDefinitions: attrs,
        KeySchema: keys,
        BillingMode: 'PAY_PER_REQUEST',
      }))
      return `Created DynamoDB table: ${p.name} (partition key: ${p.partition_key}${p.sort_key ? `, sort key: ${p.sort_key}` : ''})`
    },
  },

  // ── SQS ───────────────────────────────────────────────────────────────────
  {
    name: 'list_sqs_queues',
    description: 'List all SQS queues',
    params: '(none)',
    execute: async () => {
      const r = await sqsClient.send(new ListQueuesCommand({}))
      const urls = r.QueueUrls ?? []
      const names = urls.map(u => u.split('/').pop())
      return names.length ? `Queues: ${names.join(', ')}` : 'No queues found.'
    },
  },
  {
    name: 'create_sqs_queue',
    description: 'Create an SQS queue (Standard or FIFO)',
    params: '{ "name": string, "fifo"?: boolean }',
    execute: async (p) => {
      const name = p.fifo ? `${p.name}.fifo` : p.name as string
      const attrs: Record<string, string> = p.fifo
        ? { FifoQueue: 'true', ContentBasedDeduplication: 'true' } : {}
      await sqsClient.send(new CreateQueueCommand({ QueueName: name, Attributes: attrs }))
      return `Created SQS ${p.fifo ? 'FIFO ' : ''}queue: ${name}`
    },
  },

  // ── SNS ───────────────────────────────────────────────────────────────────
  {
    name: 'list_sns_topics',
    description: 'List all SNS topics',
    params: '(none)',
    execute: async () => {
      const r = await snsClient.send(new ListTopicsCommand({}))
      const arns = (r.Topics ?? []).map(t => t.TopicArn?.split(':').pop())
      return arns.length ? `Topics: ${arns.join(', ')}` : 'No topics found.'
    },
  },
  {
    name: 'create_sns_topic',
    description: 'Create an SNS topic',
    params: '{ "name": string }',
    execute: async (p) => {
      const r = await snsClient.send(new CreateTopicCommand({ Name: p.name as string }))
      return `Created SNS topic: ${p.name} (ARN: ${r.TopicArn})`
    },
  },

  // ── Lambda ────────────────────────────────────────────────────────────────
  {
    name: 'list_lambda_functions',
    description: 'List all Lambda functions',
    params: '(none)',
    execute: async () => {
      const r = await lambdaClient.send(new ListFunctionsCommand({}))
      const names = (r.Functions ?? []).map(f => f.FunctionName)
      return names.length ? `Functions: ${names.join(', ')}` : 'No functions found.'
    },
  },
  {
    name: 'create_lambda_function',
    description: 'Create a Lambda function with a simple hello-world handler',
    params: '{ "name": string, "runtime"?: string }',
    execute: async (p) => {
      const runtime = (p.runtime as string) || 'nodejs20.x'
      const src = `exports.handler=async(e)=>({statusCode:200,body:JSON.stringify({message:'Hello from ${p.name}'})})`
      await lambdaClient.send(new CreateFunctionCommand({
        FunctionName: p.name as string,
        Runtime: (runtime as Runtime),
        Role: 'arn:aws:iam::000000000000:role/lambda-role',
        Handler: 'index.handler',
        Code: { ZipFile: buildMinimalZip(src) },
        Description: 'Created by AI Agent',
      }))
      return `Created Lambda function: ${p.name} (runtime: ${runtime})`
    },
  },

  // ── Kinesis ───────────────────────────────────────────────────────────────
  {
    name: 'list_kinesis_streams',
    description: 'List all Kinesis streams',
    params: '(none)',
    execute: async () => {
      const r = await kinesisClient.send(new ListStreamsCommand({}))
      const names = r.StreamNames ?? []
      return names.length ? `Streams: ${names.join(', ')}` : 'No streams found.'
    },
  },
  {
    name: 'create_kinesis_stream',
    description: 'Create a Kinesis data stream',
    params: '{ "name": string, "shards"?: number }',
    execute: async (p) => {
      await kinesisClient.send(new CreateStreamCommand({
        StreamName: p.name as string,
        ShardCount: (p.shards as number) ?? 1,
      }))
      return `Created Kinesis stream: ${p.name} (${(p.shards as number) ?? 1} shard(s))`
    },
  },

  // ── ECR ───────────────────────────────────────────────────────────────────
  {
    name: 'list_ecr_repositories',
    description: 'List all ECR repositories',
    params: '(none)',
    execute: async () => {
      const r = await ecrClient.send(new DescribeRepositoriesCommand({}))
      const names = (r.repositories ?? []).map(r => r.repositoryName)
      return names.length ? `Repositories: ${names.join(', ')}` : 'No repositories found.'
    },
  },
  {
    name: 'create_ecr_repository',
    description: 'Create an ECR container repository',
    params: '{ "name": string }',
    execute: async (p) => {
      await ecrClient.send(new CreateRepositoryCommand({ repositoryName: p.name as string }))
      return `Created ECR repository: ${p.name}`
    },
  },

  // ── Secrets Manager ───────────────────────────────────────────────────────
  {
    name: 'list_secrets',
    description: 'List all Secrets Manager secrets',
    params: '(none)',
    execute: async () => {
      const r = await secretsClient.send(new ListSecretsCommand({}))
      const names = (r.SecretList ?? []).map(s => s.Name)
      return names.length ? `Secrets: ${names.join(', ')}` : 'No secrets found.'
    },
  },
  {
    name: 'create_secret',
    description: 'Create a Secrets Manager secret',
    params: '{ "name": string, "value": string }',
    execute: async (p) => {
      await secretsClient.send(new CreateSecretCommand({
        Name: p.name as string,
        SecretString: p.value as string,
      }))
      return `Created secret: ${p.name}`
    },
  },

  // ── IAM ───────────────────────────────────────────────────────────────────
  {
    name: 'list_iam_users',
    description: 'List all IAM users',
    params: '(none)',
    execute: async () => {
      const r = await iamClient.send(new ListUsersCommand({}))
      const names = (r.Users ?? []).map(u => u.UserName)
      return names.length ? `Users: ${names.join(', ')}` : 'No users found.'
    },
  },
  {
    name: 'create_iam_user',
    description: 'Create an IAM user',
    params: '{ "name": string }',
    execute: async (p) => {
      await iamClient.send(new CreateUserCommand({ UserName: p.name as string }))
      return `Created IAM user: ${p.name}`
    },
  },

  // ── Cognito ───────────────────────────────────────────────────────────────
  {
    name: 'list_cognito_user_pools',
    description: 'List all Cognito user pools',
    params: '(none)',
    execute: async () => {
      const r = await cognitoClient.send(new ListUserPoolsCommand({ MaxResults: 20 }))
      const names = (r.UserPools ?? []).map(p => p.Name)
      return names.length ? `User Pools: ${names.join(', ')}` : 'No user pools found.'
    },
  },
  {
    name: 'create_cognito_user_pool',
    description: 'Create a Cognito user pool',
    params: '{ "name": string }',
    execute: async (p) => {
      const r = await cognitoClient.send(new CreateUserPoolCommand({ PoolName: p.name as string }))
      return `Created Cognito user pool: ${p.name} (ID: ${r.UserPool?.Id})`
    },
  },
]

export const TOOL_MAP = Object.fromEntries(TOOLS.map(t => [t.name, t]))

export const SYSTEM_PROMPT = `You are an AWS infrastructure assistant for Floci — a local AWS emulator supporting 47 services.

Help users create and manage AWS resources through natural language. When the user asks you to perform an AWS action, respond with a JSON block inside triple backticks:

\`\`\`json
{"action": "tool_name", "params": {"key": "value"}}
\`\`\`

Available tools:
${TOOLS.map(t => `- ${t.name}(${t.params}): ${t.description}`).join('\n')}

Rules:
- Always include a brief friendly explanation before or after the JSON block.
- If the user asks what services/resources exist, call the appropriate list_* tool.
- For bucket/table/queue names, use lowercase letters, numbers, and hyphens only.
- When no action is needed, respond conversationally without JSON.
- All resources are local (Floci emulator), not real AWS.`

// Minimal valid ZIP file builder for Lambda deployments
function buildMinimalZip(jsSource: string): Uint8Array {
  const encoder = new TextEncoder()
  const content = encoder.encode(jsSource)
  const filename = encoder.encode('index.js')

  const localHeader = new Uint8Array([
    0x50, 0x4B, 0x03, 0x04, // local file header signature
    0x14, 0x00,             // version needed
    0x00, 0x00,             // general purpose bit flag
    0x00, 0x00,             // compression method (stored)
    0x00, 0x00, 0x00, 0x00, // last mod time/date
    0x00, 0x00, 0x00, 0x00, // crc-32
    ...u32le(content.length), // compressed size
    ...u32le(content.length), // uncompressed size
    ...u16le(filename.length), // file name length
    0x00, 0x00,             // extra field length
  ])

  const centralDir = new Uint8Array([
    0x50, 0x4B, 0x01, 0x02, // central directory header signature
    0x14, 0x00, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    ...u32le(content.length),
    ...u32le(content.length),
    ...u16le(filename.length),
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ])

  const localOffset = localHeader.length + filename.length + content.length
  const cdSize = centralDir.length + filename.length

  const eocd = new Uint8Array([
    0x50, 0x4B, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x00,
    ...u32le(cdSize),
    ...u32le(localOffset),
    0x00, 0x00,
  ])

  const result = new Uint8Array(localOffset + cdSize + eocd.length)
  let offset = 0
  for (const chunk of [localHeader, filename, content, centralDir, filename, eocd]) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

function u32le(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]
}

function u16le(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff]
}
