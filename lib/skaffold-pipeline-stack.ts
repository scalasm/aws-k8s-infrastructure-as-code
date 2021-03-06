import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as eks from '@aws-cdk/aws-eks';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as iam from '@aws-cdk/aws-iam';

import {NestedStack, NestedStackProps, Stack} from '@aws-cdk/core';

export interface SkaffoldImageBuildProps {
  /**
   * The prefix for the Docker image repository.
   * Example: "015589054602.dkr.ecr.eu-central-1.amazonaws.com/hello-world/"
   */
  readonly repositoryPrefix: string,
  /**
   * The tag for the image to be deployed.
   * Example: "dev"
   */
  readonly tag: string
}

/**
 * CI/CD pipeline based on the use of Skaffold for building and deploying a microservice app.
 */
export interface SkaffoldPipelineStackProps extends NestedStackProps {
  /**
   * Git repository name (e.g., 'hello-world').
   */
  readonly repoName: string,
  /**
   * Branch name (if not present, branch 'master' will be assumed)
   */
  readonly branchName?: string,
  /**
   * If Git metata (.git directory) are to be present (e.g., Maven Git plugin may need them when including metadata within the final binary), this must be true. 
   * Otherwise no Git metadata will be available. 
   */
  readonly fetchGitMetadata?: boolean,

  /**
   * Skaffold profiles to be use when executing the skaffold command.
   */
  readonly skaffoldProfiles: string,

  /**
   * Target Kubernetes cluster (already correctly configured with admin role set).
   */
  readonly targetCluster: eks.Cluster;

  /**
   * This Skaffold build will trigger an image build (default is false, meaning that no access to ECR is required)
   */
  readonly imageBuildProps?: SkaffoldImageBuildProps,
}

export class SkaffoldPipelineStack extends NestedStack {

  private readonly _codeRepository: codecommit.IRepository;

  constructor(scope: Stack, id: string, props: SkaffoldPipelineStackProps) {
    super(scope, id, props);

    this._codeRepository = codecommit.Repository.fromRepositoryName(this, 'ImportedRepo',  props.repoName);

    // CodeBuild step
    // Note that this is where we may define an S3 bucket for managing cache artifacts (e.g., /root/.m2 for maven dependencies)
    const skaffoldBuild = new codebuild.PipelineProject(this, 'SkaffoldBuild', {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: this.prepareInstallCommands( props ),
          },
          pre_build: {
            commands: this.preparePreBuildCommands( props )
          },
          build: {
            commands: this.prepareBuildCommands( props ),
          },
        },
        
      }),
      environment: {
        privileged: true, // Required for building Docker images
        buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
      },
    });

    this.addRequiredPermissionsToSkaffoldBuild( skaffoldBuild, props );

    // Wrap together the source checkout (git clone) and build steps
    const sourceOutput = new codepipeline.Artifact();
    const skaffoldBuildOutput = new codepipeline.Artifact('SkaffoldBuildOutput');

    const branchName = props.branchName ? props.branchName : 'master';

    new codepipeline.Pipeline(this, 'Pipeline', {
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.CodeCommitSourceAction({
              actionName: 'CodeCommit_Source',
              repository: this._codeRepository,
              branch: branchName,
              output: sourceOutput,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Skaffold_Build',
              project: skaffoldBuild,
              input: sourceOutput,
              outputs: [skaffoldBuildOutput],
            }),
          ],
        },
      ],
    });
  }

  protected prepareInstallCommands(props: SkaffoldPipelineStackProps): string[] {
    return [
      'BIN_DIR=$HOME/bin',
      'mkdir -p $BIN_DIR',

      // Git metadata script
      `curl -o $BIN_DIR/codebuild-git-wrapper.sh https://raw.githubusercontent.com/TimothyJones/codepipeline-git-metadata-example/master/scripts/codebuild-git-wrapper.sh`,

      // Kubernetes Tools
      'curl -o $BIN_DIR/aws-iam-authenticator https://amazon-eks.s3.us-west-2.amazonaws.com/1.17.9/2020-08-04/bin/linux/amd64/aws-iam-authenticator',
      'curl -o $BIN_DIR/skaffold https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64',
      'curl -o $BIN_DIR/kubectl https://storage.googleapis.com/kubernetes-release/release/v1.19.0/bin/linux/amd64/kubectl',
// Skaffold 1.15 should now use Kustomize as embedded within Kubectl      
      'curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash && mv kustomize $BIN_DIR',
      'chmod +x $BIN_DIR/*',
      'export PATH=$BIN_DIR:$PATH',

// Adjust maven settings, if a file named 'settings.xml' is present
      'if [ -f settings.xml ]; then cp ./settings.xml /root/.m2/settings.xml; fi',

      // Just for debugging purposes
      'aws --version' 
    ];
  }

  protected preparePreBuildCommands(props: SkaffoldPipelineStackProps): string[] {
    let commands: string[] = [];

    if (props.fetchGitMetadata) {
      const repositoryUrl = this._codeRepository.repositoryCloneUrlHttp;
      const branchName = props.branchName ? props.branchName : 'master';

      commands = commands.concat( [
        // See https://aws.amazon.com/blogs/devops/multi-branch-codepipeline-strategy-with-event-driven-architecture/
        `git config --global credential.helper '!aws codecommit credential-helper $@'`,
        `git config --global credential.UseHttpPath true`,
        `codebuild-git-wrapper.sh ${repositoryUrl} ${branchName}`
      ]);
    }

    const eksAdminRole = props.targetCluster.adminRole.roleArn;
    const clusterName = props.targetCluster.clusterName;

    commands = commands.concat( [
      '$(aws ecr get-login --no-include-email --region eu-central-1)',
  //      'aws sts get-caller-identity',
      `CREDENTIALS=$(aws sts assume-role --role-arn ${eksAdminRole} --role-session-name codebuild-kubectl --duration-seconds 900)`,
  //    'echo $CREDENTIALS',
      'export AWS_ACCESS_KEY_ID="$(echo ${CREDENTIALS} | jq -r \'.Credentials.AccessKeyId\')"',
      'export AWS_SECRET_ACCESS_KEY="$(echo ${CREDENTIALS} | jq -r \'.Credentials.SecretAccessKey\')"',
      'export AWS_SESSION_TOKEN="$(echo ${CREDENTIALS} | jq -r \'.Credentials.SessionToken\')"',
      'export AWS_EXPIRATION=$(echo ${CREDENTIALS} | jq -r \'.Credentials.Expiration\')',
  //      'aws sts get-caller-identity',
  //      'aws eks list-clusters',
      `aws eks update-kubeconfig --name ${clusterName}`,
  //      'cat $KUBECONFIG',
    ] );

    return commands;
  }

  protected prepareBuildCommands(props: SkaffoldPipelineStackProps): string[] {
    let commands: string[];
    
    // If we have to build or deploy a container as part of this Kubernetes deployment, then let's inform Skaffold about 
    // the container's image we want to deploy
    const imageProps = props.imageBuildProps;
    if (imageProps) {
      // XXX Note that we had to process the repository uri coming from ECR, since it will be of form
      //    xxxxxxxxxxxx.dkr.ecr.eu-central-1.amazonaws.com/hello-world-app/hello-world
      // while we need it
      //    xxxxxxxxxxxx.dkr.ecr.eu-central-1.amazonaws.com/hello-world-app
      // This is because Skaffold will append "hello-world" for the image name again and we need to give it just the
      // <repo-prefix>/<namespace> part.
      // Sorry, I could not find a better solution beside using some additional scripting function ;)
      commands = [
        `SKAFFOLD_DEFAULT_REPO=\`echo ${imageProps.repositoryPrefix} | cut -d "/" -f1\`/\`echo ${imageProps.repositoryPrefix} | cut -d "/" -f2\``,
        `skaffold run -p ${props.skaffoldProfiles} --tag=${imageProps.tag}`
      ];
    } else {
      commands = [ 
        `skaffold run -p ${props.skaffoldProfiles}`
      ];
    }
    return commands;
  }

  protected addRequiredPermissionsToSkaffoldBuild( skaffoldBuild: codebuild.PipelineProject, props: SkaffoldPipelineStackProps ): void {
    const codebuildServiceRole = skaffoldBuild.role
    if (codebuildServiceRole) {
      // The skaffold build project will need permission to access and push images to ECR
      // See https://github.com/aws/aws-cdk/issues/1319 for more info (I've adapted it to new CDK API)
      const ecrPushPolicyStatement = new iam.PolicyStatement();
      ecrPushPolicyStatement.addActions( // From https://docs.aws.amazon.com/codebuild/latest/userguide/sample-docker.html
        'ecr:GetAuthorizationToken',
        'ecr:BatchCheckLayerAvailability',
        'ecr:CompleteLayerUpload',
        'ecr:InitiateLayerUpload',
        'ecr:PutImage',
        'ecr:BatchGetImage',
        'ecr:UploadLayerPart'
      );
      ecrPushPolicyStatement.addAllResources();

      skaffoldBuild.addToRolePolicy( ecrPushPolicyStatement );

      // Ensure that CodeBuild can assume the admin role over the EKS cluster
      const assumeRolePolicyStatement = new iam.PolicyStatement();
      assumeRolePolicyStatement.addActions('sts:AssumeRole');
      assumeRolePolicyStatement.addResources( props.targetCluster.adminRole.roleArn );

      skaffoldBuild.addToRolePolicy( assumeRolePolicyStatement );

      // See https://itnext.io/how-to-access-git-metadata-in-codebuild-when-using-codepipeline-codecommit-ceacf2c5c1dc
      if (props.fetchGitMetadata) {
        const pullFromGitPolicyStatement = new iam.PolicyStatement();
        pullFromGitPolicyStatement.addActions('codecommit:GitPull');
        pullFromGitPolicyStatement.addResources( this._codeRepository.repositoryArn );
  
        skaffoldBuild.addToRolePolicy( pullFromGitPolicyStatement );
      }    
    }
  }
}
