#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import {ClusterStack} from '../lib/cluster-stack';
import {MicroserviceCiCdStack} from "./microservice-ci-cd-stack";
import {InternalArtifactsStack} from "../lib/internal-artifacts-stack";

const applicationName = 'hello-world-app';
const app = new cdk.App();

//
// Target environment
//
const devClusterStack = new ClusterStack(app, 'DevClusterStack', {
    clusterName: 'dev-cluster',
    namespaceName: applicationName,
});

//
// Source Code and Image repositories
//
const microserviceName = 'hello-world';
const internalArtifactsStack = new InternalArtifactsStack(app, 'HelloWorldArtifactsStack', {
    applicationName: applicationName,
    microserviceName: microserviceName,
});

//
// CI/CD environment
//
new MicroserviceCiCdStack( app, 'HelloWorldCiCdStack', {
    microserviceName: microserviceName,
    targetCluster: devClusterStack.cluster,

    codeRepository: internalArtifactsStack.codeRepository,
    ecrRepository: internalArtifactsStack.ecrRepository,
} );
