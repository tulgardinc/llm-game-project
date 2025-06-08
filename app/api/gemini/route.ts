import { NextRequest, NextResponse } from "next/server";
import { Content, GoogleGenAI, Part } from "@google/genai";
import tools from "@/lib/tools.json";
import { isToolName, mcpToGemini, toolCaller } from "@/lib/tools";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_INSTRUCTION = `
Your primary goal is to satisfy the user’s request by using your memory or invoking the appropriate function(s) in as few turns as possible.  
- Only make function calls if the answer is not already in your context.
- Always analyze the user’s input and decide if a function call is needed.  
- After the function returns, immediately process its output and, if further function calls are necessary, again emit the next function call.  
- Continue chaining back-to-back function calls across turns without any intervening assistant messages until the user’s request is fully satisfied.  
- Once no further function calls are needed, provide the final response text to the user.  
`;

export async function POST(request: NextRequest) {
  const { contents: pastContents } = (await request.json()) as {
    contents: Content[];
  };

  const geminiTools = tools.map((t) => mcpToGemini(t));

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  let response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: pastContents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [
        {
          functionDeclarations: geminiTools,
        },
      ],
    },
  });

  const modelContent = response.candidates![0].content!;
  const newContents = [modelContent];

  while (response.functionCalls && response.functionCalls.length > 0) {
    const parts: Part[] = [];

    for (const fc of response.functionCalls) {
      if (!isToolName(fc.name!)) return;

      console.log(fc.name);

      const functionResult = await toolCaller(fc.name, fc.args!);

      parts.push({
        functionResponse: {
          name: fc.name!,
          response: { output: functionResult },
        },
      });
    }

    newContents.push({
      role: "user",
      parts,
    });

    response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [...pastContents, ...newContents],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [
          {
            functionDeclarations: geminiTools,
          },
        ],
      },
    });

    const modelContent = response.candidates![0].content!;
    newContents.push(modelContent);
  }

  return NextResponse.json({
    contents: newContents,
  });
}
