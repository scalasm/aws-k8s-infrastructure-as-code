import * as codecommit from '@aws-cdk/aws-codecommit';
import * as ecr from '@aws-cdk/aws-ecr';
import * as cdk from '@aws-cdk/core';
import {App, RemovalPolicy, Stack, StackProps} from '@aws-cdk/core';

/**
 * Configuration options for InternalArtifactsStack.
 */
export interface InternalArtifactsStackProps extends StackProps {
    /**
     * The optional application name: if provided it will be used when creating the Docker image registry using this as
     * namespace definition (e.g., <applicationname>/<microserviceName>:<tag>)
     */
    readonly applicationName?: string

    /**
     * The name of the project (typically a microservice, like 'order-service').
     */
    readonly microserviceName: string,

    /**
     * Docker image tags that are not to be removed when cleaning up operations are periodically performed. If not set,
     * automatic clean up for dangling images will not be performed.
     */
    readonly preservedImageTags?: string[];
}

/**
 * Stack for Source Code and Docker Image(s) repositories. If so configured, Docker images can be cleaned up
 * automatically.
 *
 * This class can be subclassed in roder to perform additional configuration work on AWS resources.
 */
export class InternalArtifactsStack extends Stack {

    readonly codeRepository: codecommit.Repository;

    readonly ecrRepository: ecr.Repository;

    constructor(app: App, id: string, props: InternalArtifactsStackProps) {
        super(app, id, props );
        this.codeRepository = this.createCodeCommitSourceCodeRepository(props);
        this.ecrRepository = this.createEcrImageRepository(props);
    }

    private createCodeCommitSourceCodeRepository(props: InternalArtifactsStackProps): codecommit.Repository {
        const codeRepository = new codecommit.Repository(this, 'CodeRepository' ,{
            repositoryName: props.microserviceName,
            description: 'Source code for project ' + props.microserviceName, // optional property
        });

        new cdk.CfnOutput(this, 'sourceCodeRepositoryArn', { value: codeRepository.repositoryArn })
        new cdk.CfnOutput(this, 'sourceCodeRepositoryCloneUrl', { value: codeRepository.repositoryCloneUrlHttp })

        return codeRepository;
    }

    private createEcrImageRepository(props: InternalArtifactsStackProps): ecr.Repository {
        // From the Web Console: "A namespace can be included with your repository name (e.g. namespace/repo-name).
        const registryNamespace = props.applicationName? props.applicationName : props.microserviceName;
        const repositoryName = `${registryNamespace}/${props.microserviceName}`

        const repository = new ecr.Repository(this, 'ImageRepo', {
            repositoryName: repositoryName,
            imageScanOnPush: false,
            removalPolicy: RemovalPolicy.DESTROY
        });

        // Keep images tagged
        const imageTags = props.preservedImageTags;
        if (imageTags) {
            repository.addLifecycleRule({tagPrefixList: imageTags, maxImageCount: 999});
            repository.addLifecycleRule({maxImageAge: cdk.Duration.days(5)});
        }

        new cdk.CfnOutput(this, 'imageRepositoryArn', { value: repository.repositoryArn });
        new cdk.CfnOutput(this, 'imageRepositoryUri', { value: repository.repositoryUri });

        return repository;
    }
}
