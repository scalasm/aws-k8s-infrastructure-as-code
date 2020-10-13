#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import {ClusterStack} from '../lib/cluster-stack';
import {MicroserviceCiCdStack} from "../lib/microservice-ci-cd-stack";
import {InternalArtifactsStack} from "../lib/internal-artifacts-stack";

const microserviceProjectName = 'hello-world';

const app = new cdk.App();

const clusterStack = new ClusterStack(app, 'InfrastructureAsCodeStack', {
    clusterName: 'dev-cluster',
});

const internalArtifactsStack = new InternalArtifactsStack( app, 'InternalArtifactsStack', {
    projectName: microserviceProjectName,
});

new MicroserviceCiCdStack(app, 'DevHelloWorldCiCdStack', {
    projectName: microserviceProjectName,
    targetCluster: clusterStack.cluster,

    sourceCodeRepository: internalArtifactsStack.codeRepository,
    branchName: 'master',

    targetImageRepository: internalArtifactsStack.ecrRepository,
    imageTag: 'dev'
} );
