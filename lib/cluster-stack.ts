import * as cdk from '@aws-cdk/core';
import {StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as ec2 from '@aws-cdk/aws-ec2';

export interface ClusterStackProps extends StackProps {
  /**
   * The name of the project.
   */
  readonly clusterName: string,

  /**
   * (optional) The Kubernetes stack name that should be created by default
   */
  readonly namespaceName?: string,
}

/**
 * Defines a EKS Cluster for a given application
 */
export class ClusterStack extends cdk.Stack {
  readonly cluster: eks.Cluster;

  constructor(scope: cdk.Construct, id: string, props: ClusterStackProps) {
    super(scope, id, props);

    const vpcId: string = props.clusterName + '-vpc';
    const stackId : string = props.clusterName;

    const vpc = new ec2.Vpc(this, vpcId);

    this.cluster = new eks.Cluster(this, stackId, {
      vpc: vpc,
      clusterName: props.clusterName,
      version: eks.KubernetesVersion.V1_17,
      defaultCapacity: 2,
      defaultCapacityInstance: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
    });

    // We setup a namespace for the application within our cluster
    if (props.namespaceName) {
      const namespace = this.cluster.addManifest('my-namespace', {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: { name: props!!.namespaceName }
      });
    }

    new cdk.CfnOutput(this, 'ClusterArn', { value: this.cluster.clusterArn })
    new cdk.CfnOutput(this, 'ClusterAdminRoleArn', { value: this.cluster.adminRole.roleArn })
  }
}
