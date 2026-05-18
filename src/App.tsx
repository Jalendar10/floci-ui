import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { ToastProvider } from './components/Toast'
import Dashboard from './pages/Dashboard'
import S3Page from './pages/s3/S3'
import DynamoDBPage from './pages/dynamodb/DynamoDB'
import LambdaPage from './pages/lambda/Lambda'
import SQSPage from './pages/sqs/SQS'
import SNSPage from './pages/sns/SNS'
import IAMPage from './pages/iam/IAM'
import EC2Page from './pages/ec2/EC2'
import ECSPage from './pages/ecs/ECS'
import RDSPage from './pages/rds/RDS'
import CloudWatchPage from './pages/cloudwatch/CloudWatch'
import KinesisPage from './pages/kinesis/Kinesis'
import SecretsPage from './pages/secrets/Secrets'
import KMSPage from './pages/kms/KMS'
import CognitoPage from './pages/cognito/Cognito'
import APIGatewayPage from './pages/apigateway/APIGateway'
import EventBridgePage from './pages/eventbridge/EventBridge'
import StepFunctionsPage from './pages/sfn/StepFunctions'
import ECRPage from './pages/ecr/ECR'
import CloudFormationPage from './pages/cloudformation/CloudFormation'
import Placeholder from './pages/Placeholder'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/s3/*" element={<S3Page />} />
            <Route path="/dynamodb/*" element={<DynamoDBPage />} />
            <Route path="/lambda/*" element={<LambdaPage />} />
            <Route path="/sqs/*" element={<SQSPage />} />
            <Route path="/sns/*" element={<SNSPage />} />
            <Route path="/iam/*" element={<IAMPage />} />
            <Route path="/ec2/*" element={<EC2Page />} />
            <Route path="/ecs/*" element={<ECSPage />} />
            <Route path="/rds/*" element={<RDSPage />} />
            <Route path="/cloudwatch/*" element={<CloudWatchPage />} />
            <Route path="/kinesis/*" element={<KinesisPage />} />
            <Route path="/secrets/*" element={<SecretsPage />} />
            <Route path="/kms/*" element={<KMSPage />} />
            <Route path="/cognito/*" element={<CognitoPage />} />
            <Route path="/apigateway/*" element={<APIGatewayPage />} />
            <Route path="/eventbridge/*" element={<EventBridgePage />} />
            <Route path="/sfn/*" element={<StepFunctionsPage />} />
            <Route path="/ecr/*" element={<ECRPage />} />
            <Route path="/cloudformation/*" element={<CloudFormationPage />} />
            <Route path="/placeholder/:service" element={<Placeholder />} />
          </Routes>
        </Layout>
      </ToastProvider>
    </BrowserRouter>
  )
}
