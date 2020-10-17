import * as eks from '@aws-cdk/aws-eks';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as ecr from '@aws-cdk/aws-ecr';
import {App, Stack, StackProps} from '@aws-cdk/core';
import {SkaffoldPipelineStack} from '../lib/skaffold-pipeline-stack';

/**
 * Configuration properties for the CI/CD stack
 */
export interface MicroserviceCiCdStackProps extends StackProps {
    readonly microserviceName: string,

    readonly targetCluster: eks.Cluster,

    readonly codeRepository: codecommit.Repository;
    readonly ecrRepository: ecr.Repository;
}

/**
 * Implements the default stack for CI/CD workflow.
 *
 * By Default it uses SkaffoldPipelineStack as default implementation, which is fine for my use case.
 */
export class MicroserviceCiCdStack extends Stack {

    constructor(app: App, id: string, props: MicroserviceCiCdStackProps) {
        super(app, id, props );

        this.defineCiCdPipelines(props);
    }

    /**
     * Redefine in a derived class to build different logic.
     * @param props the configuration for this CI/CD stack
     * @protected
     */
    protected defineCiCdPipelines(props: MicroserviceCiCdStackProps) {
        new SkaffoldPipelineStack(this, 'HelloWorldDevPipeline', {
            clusterName: props.targetCluster.clusterName,
            eksAdminRoleArn: props.targetCluster.adminRole.roleArn,

            repoName: props.codeRepository.repositoryName,
            branchName: 'master',
            fetchGitMetadata: true,

            skaffoldProfiles: 'aws',

            imageBuildProps: {
                repositoryPrefix: props.ecrRepository.repositoryUri,
//                repositoryPrefix: this.getSkaffoldRepositoryPrefix(props),
                tag: 'dev'
            },
        });
    }
}
