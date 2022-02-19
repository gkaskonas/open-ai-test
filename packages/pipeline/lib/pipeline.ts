import { Construct } from "constructs";

import { CfnCapabilities, SecretValue, Stack, StackProps } from "aws-cdk-lib";
import { Artifact, Pipeline } from "aws-cdk-lib/aws-codepipeline";
import {
  CloudFormationCreateReplaceChangeSetAction,
  CloudFormationExecuteChangeSetAction,
  CodeBuildAction,
  CodeBuildActionType,
  GitHubSourceAction,
} from "aws-cdk-lib/aws-codepipeline-actions";
import { Bucket } from "aws-cdk-lib/aws-s3";
import {
  BuildSpec,
  ComputeType,
  LinuxBuildImage,
  PipelineProject,
} from "aws-cdk-lib/aws-codebuild";
import { TargetAccounts, TargetRegions } from "./utils/environments";
import { Key } from "aws-cdk-lib/aws-kms";
import { Role } from "aws-cdk-lib/aws-iam";

/**
 * The stack that defines the application pipeline
 */

function getPipeline(scope: Stack): Pipeline {
  const sourceOutput = new Artifact();
  const buildOutput = new Artifact();

  const buildProject = new PipelineProject(scope, "build", {
    buildSpec: BuildSpec.fromObject({
      version: "0.2",
      phases: {
        install: {
          commands: ["npm install -g aws-cdk"],
        },
        build: {
          commands: [
            "yarn install",
            "yarn build",
            "yarn cdk synth",
            "yarn cdk deploy ai-pipeline-v2 --require-approval never --verbose",
          ],
        },
      },
    }),
    environment: {
      computeType: ComputeType.SMALL,
      buildImage: LinuxBuildImage.STANDARD_5_0,
    },
    role: Role.fromRoleArn(
      scope,
      "pipelineRole",
      "arn:aws:iam::269065460843:role/portfolioPipeline-PipelineUpdatePipelineSelfMutati-VUFYWAW94ECJ"
    ),
  });

  const buildAppProject = new PipelineProject(scope, "buildApp", {
    buildSpec: BuildSpec.fromObject({
      version: "0.2",
      phases: {
        install: {
          commands: ["npm install -g aws-cdk"],
        },
        build: {
          commands: [
            "yarn install",
            "yarn build",
            "mkdir -p packages/application/dist/lambda/node_modules/openai/ && cp -r node_modules/openai/ packages/application/dist/lambda/node_modules/",
            "cd packages/application/ && yarn cdk synth",
          ],
        },
      },
      artifacts: {
        "base-directory": "packages/**/**",
        files: "**/*",
      },
    }),
    environment: {
      computeType: ComputeType.SMALL,
      buildImage: LinuxBuildImage.STANDARD_5_0,
    },
  });

  const stackName = "openai";
  const changeSetName = "StagedChangeSet";

  const pipeline = new Pipeline(scope, "Pipeline", {
    pipelineName: "openai-pipeline",
    artifactBucket: Bucket.fromBucketAttributes(scope, "artifacts", {
      bucketName:
        "portfoliopipeline-pipelineartifactsbucketaea9a052-3wbgbw9b3fc1",
      encryptionKey: Key.fromKeyArn(
        scope,
        "key",
        "arn:aws:kms:eu-west-1:269065460843:key/724fcf2e-7a9f-4a27-ac44-7ccf8afb66de"
      ),
    }),
    crossAccountKeys: true,
    stages: [
      {
        stageName: "Source",
        actions: [
          new GitHubSourceAction({
            actionName: "GitHub_Source",
            owner: "gkaskonas",
            repo: "open-ai-test",
            oauthToken: SecretValue.secretsManager("github-access"),
            output: sourceOutput,
            branch: "main", // default: 'master'
          }),
        ],
      },
      {
        stageName: "SelfMutate",
        actions: [
          new CodeBuildAction({
            actionName: "build",
            project: buildProject,
            input: sourceOutput,
            runOrder: 2,
            type: CodeBuildActionType.BUILD,
          }),
        ],
      },
      {
        stageName: "buildApp",
        actions: [
          new CodeBuildAction({
            actionName: "build",
            project: buildAppProject,
            input: sourceOutput,
            runOrder: 2,
            type: CodeBuildActionType.BUILD,
            outputs: [buildOutput],
          }),
        ],
      },
    ],
    restartExecutionOnUpdate: true,
  });

  pipeline.addStage({
    stageName: "deployDev",
    actions: [
      new CloudFormationCreateReplaceChangeSetAction({
        actionName: "Prepare",
        adminPermissions: false,
        changeSetName,
        stackName,
        templatePath: buildOutput.atPath(
          "packages/application/cdk.out/ai-infra.template.json"
        ),
        account: TargetAccounts.DEV,
        region: TargetRegions.EUROPE,
        runOrder: 1,
        cfnCapabilities: [
          CfnCapabilities.NAMED_IAM,
          CfnCapabilities.AUTO_EXPAND,
        ],
        role: Role.fromRoleArn(
          scope,
          "changeSetRole",
          "arn:aws:iam::404319983256:role/cdk-hnb659fds-deploy-role-404319983256-eu-west-1"
        ),
        deploymentRole: Role.fromRoleArn(
          scope,
          "csDeployRole",
          "arn:aws:iam::404319983256:role/cdk-hnb659fds-deploy-role-404319983256-eu-west-1"
        ),
      }),
      new CloudFormationExecuteChangeSetAction({
        actionName: "execute",
        changeSetName,
        stackName,
        account: TargetAccounts.DEV,
        region: TargetRegions.EUROPE,
        runOrder: 2,
        role: Role.fromRoleArn(
          scope,
          "executeRole",
          "arn:aws:iam::404319983256:role/cdk-hnb659fds-deploy-role-404319983256-eu-west-1"
        ),
      }),
    ],
  });

  return pipeline;
}

export class OpenAIPipeline extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    getPipeline(this);
  }
}
