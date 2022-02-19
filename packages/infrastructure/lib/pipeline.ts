import { Construct } from "constructs";

import { SecretValue, Stack, StackProps } from "aws-cdk-lib";
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
            "yarn cdk deploy ",
          ],
        },
      },
      artifacts: {
        "base-directory": "packages/infrastructure/cdk.out",
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
    ],
  });

  pipeline.addStage({
    stageName: "deployDev",
    actions: [
      new CloudFormationCreateReplaceChangeSetAction({
        actionName: "deployDev",
        adminPermissions: true,
        changeSetName,
        stackName,
        templatePath: sourceOutput.atPath(
          "packages/infrastructure/cdk.out/assembly-ai-pipeline-webDev/aipipelinewebDevopenai720CBD04.template.json"
        ),
        account: TargetAccounts.DEV,
        region: TargetRegions.EUROPE,
        runOrder: 1,
        role: Role.fromRoleArn(
          scope,
          "deployRole",
          "arn:aws:iam::404319983256:role/cdk-hnb659fds-cfn-exec-role-404319983256-eu-west-1"
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
          "arn:aws:iam::404319983256:role/cdk-hnb659fds-cfn-exec-role-404319983256-eu-west-1",
          {
            mutable: true
          }
        ),
      }),
    ],
  });

  return pipeline;
}

export class WebsitePipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    getPipeline(this);
  }
}
