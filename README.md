# Welcome to your CDK TypeScript project!

This is a blank project for TypeScript development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template


# Bootstrap CDK

CDK needs a staging S3 bucket to be present in your AWS account in order to perform its job. So, just run
```shell script
cdk bootstrap aws://<ACCOUNT-ID>/<AWS-REGION>
```

```shell script
cdk bootstrap aws://321723152483/eu-central-1
```

# Install your stack

```
cdk deploy
```

(This may require 10-15 minutes, depending on the complexity of your infrastructure)

# Destroy your stack

```
cdk destroy
```

