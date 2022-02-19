#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { WebsitePipelineStack } from "../lib/pipeline";

const app = new App();

new WebsitePipelineStack(app, "ai-pipeline", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

app.synth();
