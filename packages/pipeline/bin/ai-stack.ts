#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { OpenAIPipeline } from "../lib/pipeline";

const app = new App();

new OpenAIPipeline(app, "ai-pipeline-v2", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

app.synth();
