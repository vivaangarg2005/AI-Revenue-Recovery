import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';

export class AwsInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC
    const vpc = new ec2.Vpc(this, 'RecoverAIVpc', {
      maxAzs: 2,
    });

    // Create ECS Cluster
    const cluster = new ecs.Cluster(this, 'RecoverAICluster', {
      vpc: vpc,
    });

    // Reference the existing ECR repository (auto-grants pull permissions)
    const repo = ecr.Repository.fromRepositoryName(this, 'ApiRepo', 'api-image');

    // API Service
    const apiService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'RecoverAIApi', {
      cluster: cluster,
      cpu: 512,
      memoryLimitMiB: 1024,
      desiredCount: 1,
      circuitBreaker: { enable: true, rollback: true },
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(repo, 'latest'),
        containerPort: 4000,
        environment: {
          NODE_ENV: 'production',
          PORT: '4000',
          DATABASE_URL: 'postgresql://postgres:password@localhost:5432/postgres',
          REDIS_URL: 'redis://localhost:6379',
        },
      },
      publicLoadBalancer: true,
    });

    // Output the ALB URL so the user knows where the API lives
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: apiService.loadBalancer.loadBalancerDnsName,
    });
  }
}
