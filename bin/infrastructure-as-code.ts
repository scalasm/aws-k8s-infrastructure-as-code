#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import {ClusterStack} from '../lib/cluster-stack';
import {MicroserviceCiCdStack} from "./microservice-ci-cd-stack";

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
// CI/CD environment
//
new MicroserviceCiCdStack( app, 'HelloWorldCiCdStack', {
    microserviceProjectName: 'hello-world',
    targetCluster: devClusterStack.cluster
} );
