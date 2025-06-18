import { Content, GoogleGenAI, Part, Type, Schema } from "@google/genai";
import tools from "@/lib/tools.json";
import { isToolName, mcpToGemini, toolCaller } from "@/lib/tools";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function getGeminiTools() {
  return tools.map((t) => mcpToGemini(t));
}

export async function makeGeminiRequestWithTools(
  pastContents: Content[],
  systemInstruction: string,
) {
  const geminiTools = getGeminiTools();

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  let response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: pastContents,
    config: {
      systemInstruction: systemInstruction,
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
      console.log(fc.name);
      if (!isToolName(fc.name!))
        throw new Error(`${fc.name} is not a registered tool`);

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
        systemInstruction: systemInstruction,
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

  return newContents;
}

export async function makeGeminiRequest(
  pastContents: Content[],
  systemInstruction: string,
  responseMimeType?: string,
  responseSchema?: Schema,
) {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: pastContents,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType,
      responseSchema,
      maxOutputTokens: 500,
    },
  });

  return response.candidates![0].content!;
}
