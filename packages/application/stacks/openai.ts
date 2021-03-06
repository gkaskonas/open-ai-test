import { Stack, StackProps } from "aws-cdk-lib";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import path from "path";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

/**
 * A stack for our simple Lambda-powered web service
 */
export class OpenAIApplication extends Stack {

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

     new Function(this, 'MyFunction', {
      runtime: Runtime.NODEJS_14_X,
      handler: 'handler.handler',
      code: Code.fromAsset(path.join(__dirname, '../lambda')),
      environment: {
        "OPENAI_API_KEY": StringParameter.fromStringParameterAttributes(this, "api", {
          parameterName: "OPEN_AI_API_KEY",
        }).stringValue
      }
    });
  }
}
