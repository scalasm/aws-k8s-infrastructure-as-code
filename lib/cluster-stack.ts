import * as cdk from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as ec2 from '@aws-cdk/aws-ec2';

export class ClusterStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const cluster = new eks.Cluster(this, 'HelloEKS', {
      version: eks.KubernetesVersion.V1_17,
      defaultCapacity: 2,
      defaultCapacityInstance: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
    });

    new cdk.CfnOutput(this, 'ClusterArn', { value: cluster.clusterArn })
    new cdk.CfnOutput(this, 'ClusterAdminRoleArn', { value: cluster.adminRole.roleArn })
  }
}
