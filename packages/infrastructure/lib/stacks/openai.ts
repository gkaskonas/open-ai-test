import { Stack, StackProps } from "aws-cdk-lib";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import path from "path";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

/**
 * A stack for our simple Lambda-powered web service
 */
export class OpenAIStack extends Stack {
  /**
   * The URL of the API Gateway endpoint, for use in the integ tests
   */

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

     new Function(this, 'MyFunction', {
      runtime: Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: Code.fromAsset(path.join(__dirname, '../lambda')),
      environment: {
        "OPENAI_API_KEY": StringParameter.fromSecureStringParameterAttributes(this, "api", {
          parameterName: "OPEN_AI_API_KEY",
          version:1
        }).stringValue
      }
    });
  }
}
