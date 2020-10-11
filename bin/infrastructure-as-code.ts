#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { InfrastructureAsCodeStack } from '../lib/infrastructure-as-code-stack';

const app = new cdk.App();
new InfrastructureAsCodeStack(app, 'InfrastructureAsCodeStack');
