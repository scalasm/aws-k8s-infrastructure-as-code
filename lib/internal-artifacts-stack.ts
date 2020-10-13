import * as codecommit from '@aws-cdk/aws-codecommit';
import * as ecr from '@aws-cdk/aws-ecr';
import * as cdk from '@aws-cdk/core';
import {App, RemovalPolicy, Stack, StackProps} from '@aws-cdk/core';

// [...] we define a new props interface for it, PipelineStackProps. This extends the 
// standard StackProps and is how clients of this class (including ourselves) pass 
// the Lambda code that the class needs.
export interface InternalArtifactsStackProps extends StackProps {
    /**
     * The name of the project.
     */
    readonly projectName: string,

    /**
     * Docker image tags that are not to be removed when cleaning up operations are periodically performed. If not set,
     * the following will be used:
     *  * 'dev', 'prod'
     */
    readonly imageTags?: string[];
}

/**
 * Stack for Source Code and Docker Image(s) repositories.
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
            repositoryName: props.projectName,
            description: 'Source code for project ' + props.projectName, // optional property
        });

        new cdk.CfnOutput(this, 'sourceCodeRepositoryArn', { value: codeRepository.repositoryArn })
        new cdk.CfnOutput(this, 'sourceCodeRepositoryCloneUrl', { value: codeRepository.repositoryCloneUrlHttp })

        return codeRepository;
    }

    private createEcrImageRepository(props: InternalArtifactsStackProps): ecr.Repository {
        const repository = new ecr.Repository(this, 'ImageRepo', {
            repositoryName: props.projectName,
            imageScanOnPush: true,
            removalPolicy: RemovalPolicy.DESTROY
        });

        let imageTags = props.imageTags;
        if (!imageTags) {
            imageTags = ['dev', 'prod']
        }

        // Keep images tagged
        repository.addLifecycleRule({tagPrefixList: imageTags, maxImageCount: 999});
        repository.addLifecycleRule({maxImageAge: cdk.Duration.days(5)});

        new cdk.CfnOutput(this, 'imageRepositoryArn', { value: repository.repositoryArn })
        new cdk.CfnOutput(this, 'imageRepositoryUri', { value: repository.repositoryUri })

        return repository;
    }
}
