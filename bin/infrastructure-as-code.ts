#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ClusterStack } from '../lib/cluster-stack';

const app = new cdk.App();
new ClusterStack(app, 'InfrastructureAsCodeStack');
