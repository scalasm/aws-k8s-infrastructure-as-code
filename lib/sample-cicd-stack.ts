import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as iam from '@aws-cdk/aws-iam';
import * as ecr from '@aws-cdk/aws-ecr';

import { App, Construct, Stack, StackProps } from '@aws-cdk/core';
import { allowedNodeEnvironmentFlags } from 'process';
import { Pipeline } from '@aws-cdk/aws-codepipeline';
import { SkaffoldPipelineStack, SkaffoldPipelineStackProps } from './skaffold-pipeline-stack';

// [...] we define a new props interface for it, PipelineStackProps. This extends the 
// standard StackProps and is how clients of this class (including ourselves) pass 
// the Lambda code that the class needs.
export interface SparkasseCiCdStackProps extends StackProps {
    readonly clusterName: string,
    readonly eksAdminRoleArn: string,
}

const ECR_REPO_PREFIX = "015589054601.dkr.ecr.eu-central-1.amazonaws.com/sparkasse";

export class SampleCicdStack extends Stack {
    constructor(app: App, id: string, props: SparkasseCiCdStackProps) {
        super(app, id, props );

        // Kubernetes Stack with namespace, redis and common stuff
        // We add this as dependency for other stacks
        const commonKubernetesStuff = new SkaffoldPipelineStack(this, 'KubernetesStackPipeline', {
            clusterName: props.clusterName,
            eksAdminRoleArn: props.eksAdminRoleArn,    

            repoName: 'sparkasse-kubernetes-stack',
            branchName: 'master',

            skaffoldProfiles: 'local',
        });

        // Auth deployment
        new SkaffoldPipelineStack(this, 'AuthPipeline', {
            clusterName: props.clusterName,
            eksAdminRoleArn: props.eksAdminRoleArn,

            repoName: 'sparkasse-auth-service',
            branchName: 'master',
            fetchGitMetadata: true,

            skaffoldProfiles: 'build-image',

            imageBuildProps: {
                repositoryPrefix: ECR_REPO_PREFIX,
                name: "auth",
                tag: "test"
            },
        }).addDependency( commonKubernetesStuff );

        // Web App deployment
        new SkaffoldPipelineStack(this, 'CoreBankingPipeline', {
            clusterName: props.clusterName,
            eksAdminRoleArn: props.eksAdminRoleArn,

            repoName: 'sparkasse-core-banking-service',
            branchName: 'development',
            fetchGitMetadata: true,

            skaffoldProfiles: 'build-image,aws2',

            imageBuildProps: {
                repositoryPrefix: ECR_REPO_PREFIX,
                name: "core-banking-service",
                tag: "test"
            },
        }).addDependency( commonKubernetesStuff );
    }
}
