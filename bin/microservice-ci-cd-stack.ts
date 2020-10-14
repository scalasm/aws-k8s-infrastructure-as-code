import * as eks from '@aws-cdk/aws-eks';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as ecr from '@aws-cdk/aws-ecr';
import {App, Stack, StackProps} from '@aws-cdk/core';
import {SkaffoldPipelineStack} from '../lib/skaffold-pipeline-stack';
import {InternalArtifactsStack} from "../lib/internal-artifacts-stack";

/**
 * Configuration properties for the CI/CD stack
 */
export interface MicroserviceCiCdStackProps extends StackProps {
    readonly microserviceProjectName: string,

    readonly targetCluster: eks.Cluster,
}

/**
 * Implements the default stack for developing a microservice, including source code repository, Docker image
 * repository, and one CI/CD for building the image from the master branch and deploy it into the target cluster.
 */
export class MicroserviceCiCdStack extends Stack {

    readonly codeRepository: codecommit.Repository;
    readonly ecrRepository: ecr.Repository;

    constructor(app: App, id: string, props: MicroserviceCiCdStackProps) {
        super(app, id, props );

        const internalArtifactsStack = new InternalArtifactsStack(this, 'InternalArtifactsStack', {
            projectName: props.microserviceProjectName,
        });
        this.codeRepository = internalArtifactsStack.codeRepository;
        this.ecrRepository = internalArtifactsStack.ecrRepository;

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

            repoName: this.codeRepository.repositoryName,
            branchName: 'master',
            fetchGitMetadata: true,

            skaffoldProfiles: 'build-image',

            imageBuildProps: {
                repositoryPrefix: this.ecrRepository.repositoryUri,
                name: this.ecrRepository.repositoryName,
                tag: 'dev'
            },
        });
    }
}
