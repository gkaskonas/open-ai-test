#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { WebsitePipelineStack } from "../lib/pipeline";
import { OpenAIStack } from "../lib/stacks/openai";

const app = new App();

new WebsitePipelineStack(app, "ai-pipeline-v2", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

new OpenAIStack(app, "ai-infra", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
})

app.synth();
