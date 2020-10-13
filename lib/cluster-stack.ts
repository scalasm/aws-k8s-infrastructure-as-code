import * as cdk from '@aws-cdk/core';
import {StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as ec2 from '@aws-cdk/aws-ec2';

export interface ClusterStackProps extends StackProps {
  /**
   * The name of the project.
   */
  readonly clusterName: string,
}

export class ClusterStack extends cdk.Stack {
  readonly cluster: eks.Cluster;

  constructor(scope: cdk.Construct, id: string, props?: ClusterStackProps) {
    super(scope, id, props);

    const clusterName: string = props!!.clusterName + '-cluster';
    const stackId : string = props!!.clusterName;

    this.cluster = new eks.Cluster(this, stackId, {
      clusterName: clusterName,
      version: eks.KubernetesVersion.V1_17,
      defaultCapacity: 2,
      defaultCapacityInstance: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
    });

    new cdk.CfnOutput(this, 'ClusterArn', { value: this.cluster.clusterArn })
    new cdk.CfnOutput(this, 'ClusterAdminRoleArn', { value: this.cluster.adminRole.roleArn })
  }
}
