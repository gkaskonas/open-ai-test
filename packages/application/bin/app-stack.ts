#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { OpenAIApplication } from "../stacks/openai";

const app = new App();

new OpenAIApplication(app, "ai-app", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

app.synth();
