# Welcome to your CDK TypeScript project!

This project contains the companion code for a [series of Medium articles](https://marioscalas.medium.com/an-example-of-development-workflow-for-microservices-on-aws-a3795850cc07) 
demonstrating my CI/CD for microservices.

# Pre-requisites

You must have:
* a [valid AWS account](https://aws.amazon.com/free) and be ready to spend some real money since some of the 
infrastructure is out of free tier.
* [AWS CDK](https://docs.aws.amazon.com/cdk/) installed on your machine (v 1.68.0 was tested), along with a NodeJs 12.x 
runtime.

**Warning** Note that the [CDK EKS Module](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-eks-readme.html) is still 
marked as experimental, so this example may get broken by future changes.

# 0. Start Bootstrap CDK

CDK needs a staging S3 bucket to be present in your target AWS account in order to perform its job. 
If you want to use your currently configured AWS account, just run: 
```shell script
cdk bootstrap
```

Alternatively, you can specify the target account:
```shell script
cdk bootstrap aws://<ACCOUNT-ID>/<AWS-REGION>
```

# 1. How to Install each stack

You can run `cdk deploy` and list the available stacks. For example:
```shell script
C:\src\demo\infrastructure-as-code>cdk deploy
Since this app includes more than a single stack, specify which stacks to use (wildcards are supported)
Stacks: DevClusterStack HelloWorldArtifactsStack HelloWorldCiCdStack
``` 

## 1.1. Prepare the cluster
```
cdk deploy DevClusterStack
```
(This may require 10-15 minutes, depending on the complexity of your infrastructure)

Then update your local `kubeconfig file` accordingly, so that you can watch the cluster state using Kubectl and other K8S
utilities. For example:

```shell script
37/38 | 19:08:16 | CREATE_COMPLETE      | Custom::AWSCDK-EKS-KubernetesResource | dev-cluster/manifest-my-namespace/Resource/Default (devclustermanifestmynamespace0B522685)
 38/38 | 19:08:19 | CREATE_COMPLETE      | AWS::CloudFormation::Stack            | DevClusterStack

 ✅  DevClusterStack

Outputs:
...
DevClusterStack.devclusterConfigCommand52B8AF52 = aws eks update-kubeconfig --name dev-cluster --region eu-central-1 --role-arn arn:aws:iam::321723152483:role/DevClusterStack-devclusterMastersRole773DB746-ANYILHZC2OEP
...
```

As you may see, the namespace is there:
```shell script
C:\src\demo\infrastructure-as-code>kubectl get ns
NAME              STATUS   AGE
default           Active   11m
hello-world-app   Active   2m21s
kube-node-lease   Active   11m
kube-public       Active   11m
kube-system       Active   11m
```

This configuration has been coded into `lib/cluster-stack.ts`.

## 1.2. Create Git and Docker image repositories

Two repositories are needed:
* AWS CodeCommit (Git) repository, for hosting our source code;
* AWS Elastic Container Registry (ECR) repository, for hosting the built images and allow the cluster to fetch them.

```
cdk deploy HelloWorldArtifactsStack
```

This has been coded into `lib/internal-artifacts-stack.ts`.

Clone and push the [hello world microservice's code](https://github.com/scalasm/aws-k8s-hello-world) to this newly 
created CodeCommit repository. For example, the output from CDK included something like:

```shell script
...
HelloWorldArtifactsStack.sourceCodeRepositoryCloneUrl = https://git-codecommit.eu-central-1.amazonaws.com/v1/repos/hello-world
...
```

Now you have three ways for connecting to CodeCommit Git repositories, all of them requiring some configurations by your 
part if you never did them before:
 1. [HTTPS with Git Credentials](https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up-gc.html);
 2. [SSH key access](https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up-ssh-unixes.html);
 3. [HTTPS with git-remote-codecommit](https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up-git-remote-codecommit.html)

After your set up you Git connection, you are ready to go. In my case, I decided to use the SSH Access key method, which
repository URL you may adapt for the HTTP that was provided in the CDK output log.

So we add a new Git remote and push the `hello-world` sourcecode we just cloned from GitHub. In my case (please, be 
aware that your region may be different):

```
C:\src\demo\hello-world>git remote add aws ssh://git-codecommit.eu-central-1.amazonaws.com/v1/repos/hello-world

C:\src\spektor\hello-world>git push aws
Enumerating objects: 63, done.
Counting objects: 100% (63/63), done.
Delta compression using up to 12 threads
Compressing objects: 100% (50/50), done.
Writing objects: 100% (63/63), 60.06 KiB | 1.58 MiB/s, done.
Total 63 (delta 10), reused 0 (delta 0)
To ssh://git-codecommit.eu-central-1.amazonaws.com/v1/repos/hello-world
 * [new branch]      master -> master
```

## 1.2. Create the CI/CD pipeline

In this sample, our CI/CD pipeline will be configured to:
1. take the `master` branch;
2. build an image and tag it with `dev`;
3. deploy the tagged image to remote AWS ECR repository;
4. trigger the cluster to create/update the deployment configuration

This has been coded into `bin/microservice-ci-cd-stack.ts` and `lib/skaffold-pipeline-stack.ts` modules. The latter contains
the build steps:
1. Download required dependencies (e.g., skaffold, kubectl, ... from remote repositories);
2. Assume the correct AWS role before running skaffold;
3. run skaffold (which, in turn, will trigger the maven + jib build).

At the end, the image will get published into the ECR repository, which the Cluster will pull from. For more details, 
take a look at the [sample project's Git repository]().

To create the deployment pipeline that has been configured for this sample stack, run:
```
cdk deploy HelloWorldCiCdStack
```

Once the pipeline have been deployed the first time, a build will be triggered automatically (so if you did not import 
the source code into CodeCommit in previous step it will fail). From now on, everytime to you merge something into the 
master branch, a build will automatically will be triggered and a new image deployed.

# Destroy everything

```
cdk destroy *
```

# Nice to have / TO-DO features

* Build artifacts caching - actually, the SkaffoldPipelineStack will download every required dependency everytime, which
  is just a waste (this includes all maven dependencies, executables like Kubectl and skaffold and so on).

* Actually, we do both steps of build & deploy through CodeBuild (which in turn runs Skaffold). 

