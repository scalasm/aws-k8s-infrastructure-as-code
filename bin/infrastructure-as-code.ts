#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ClusterStack } from '../lib/cluster-stack';
import {InternalArtifactsStack} from "../lib/internal-artifacts-stack";

const microserviceProjectName = 'hello-world';

const app = new cdk.App();

new ClusterStack(app, 'InfrastructureAsCodeStack');

new InternalArtifactsStack( app, 'InternalArtifactsStack', {
    projectName: microserviceProjectName,
});
