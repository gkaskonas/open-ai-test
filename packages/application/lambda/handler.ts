import { APIGatewayEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { Configuration, OpenAIApi } from "openai";
let statusCode = 200;
const headers = {
  "Content-Type": "application/json",
};
export async function handler(
  _event: APIGatewayEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {


  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);
  const response = await openai.createCompletion("text-davinci-001", {
    prompt: "Say this is a test",
    max_tokens: 6,
  });

  if (!response.data.choices) throw new Error("No text received from openAI")


  const body = response.data.choices[0].text

  if (!body) throw new Error("No text received from openAI")
  

  return {
    statusCode,
    body,
    headers,
  };
}

