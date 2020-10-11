import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as InfrastructureAsCode from '../lib/infrastructure-as-code-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new InfrastructureAsCode.InfrastructureAsCodeStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
