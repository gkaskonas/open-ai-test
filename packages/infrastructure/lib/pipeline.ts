import { Construct } from "constructs";
import { ComputeType, LinuxBuildImage } from "aws-cdk-lib/aws-codebuild";
import { Stack, StackProps } from "aws-cdk-lib";
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep,
} from "aws-cdk-lib/pipelines";
import { BackendStage } from "./stages/backendStage";
import { TargetAccounts, TargetRegions } from "./utils/environments";

/**
 * The stack that defines the application pipeline
 */

function getPipeline(scope: Stack): CodePipeline {
  return new CodePipeline(scope, "Pipeline", {
    // The pipeline name
    pipelineName: "openai-pipeline",

    // How it will be built and synthesized
    synth: new ShellStep("Synth", {
      // Where the source can be found
      input: CodePipelineSource.connection("gkaskonas/open-ai-test", "main", {
        connectionArn: `arn:aws:codestar-connections:${scope.region}:${scope.account}:connection/a4848827-92c7-4203-b816-81ec422b6c26`,
      }),

      // Install dependencies, build and run cdk synth
      commands: ["yarn install", "yarn build", "yarn cdk synth"],
      primaryOutputDirectory: "packages/infrastructure/cdk.out",
    }),
    crossAccountKeys: true,
    codeBuildDefaults: {
      buildEnvironment: {
        computeType: ComputeType.SMALL,
        buildImage: LinuxBuildImage.STANDARD_5_0,

      },
    },
  });
}

export class WebsitePipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);


    // This is where we add the application stages

    const webDev = new BackendStage(this, "webDev", {
      env: {
        account: TargetAccounts.DEV,
        region: TargetRegions.EUROPE,
      },
    });

    const pipeline = getPipeline(this);


    pipeline.addStage(webDev);

  }
}
