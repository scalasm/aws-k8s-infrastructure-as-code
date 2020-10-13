import * as eks from '@aws-cdk/aws-eks';

import {App, Stack, StackProps} from '@aws-cdk/core';
import {SkaffoldPipelineStack} from './skaffold-pipeline-stack';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as ecr from '@aws-cdk/aws-ecr';

// [...] we define a new props interface for it, PipelineStackProps. This extends the 
// standard StackProps and is how clients of this class (including ourselves) pass 
// the Lambda code that the class needs.
export interface MicroserviceCiCdStackProps extends StackProps {
    readonly projectName: string,

    readonly targetCluster: eks.Cluster,

    readonly sourceCodeRepository: codecommit.Repository,
    readonly branchName: string,

    readonly targetImageRepository: ecr.Repository,
    readonly imageTag: string
}

export class MicroserviceCiCdStack extends Stack {
    constructor(app: App, id: string, props: MicroserviceCiCdStackProps) {
        super(app, id, props );

        // Kubernetes Stack with namespace, redis and common stuff
        // We add this as dependency for other stacks
        const commonKubernetesStuff = new SkaffoldPipelineStack(this, 'KubernetesStackPipeline', {
            clusterName: props.targetCluster.clusterName,
            eksAdminRoleArn: props.targetCluster.adminRole.roleArn,

            repoName: 'kubernetes-common-stack',
            branchName: 'master',

            skaffoldProfiles: 'local',
        });

        const buildPipeline = new SkaffoldPipelineStack(this, 'HelloWorldPipeline', {
            clusterName: props.targetCluster.clusterName,
            eksAdminRoleArn: props.targetCluster.adminRole.roleArn,

            repoName: props.sourceCodeRepository.repositoryName,
            branchName: props.branchName,
            fetchGitMetadata: true,

            skaffoldProfiles: 'build-image',

            imageBuildProps: {
                repositoryPrefix: props.targetImageRepository.repositoryUri,
                name: props.targetImageRepository.repositoryName,
                tag: props.imageTag
            },
        }).addDependency( commonKubernetesStuff );
    }
}
