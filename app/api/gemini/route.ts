import { NextRequest, NextResponse } from "next/server";
import { Content, GoogleGenAI, Part } from "@google/genai";
import tools from "@/lib/tools.json";
import { isToolName, mcpToGemini, toolCaller } from "@/lib/tools";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  const { contents: pastContents } = (await request.json()) as {
    contents: Content[];
  };

  const geminiTools = tools.map((t) => mcpToGemini(t));

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: pastContents,
    config: {
      tools: [
        {
          functionDeclarations: geminiTools,
        },
      ],
    },
  });

  if (response.functionCalls && response.functionCalls.length > 0) {
    const modelContent = response.candidates![0].content!;
    const newContent = [...pastContents, modelContent];
    const parts: Part[] = [];

    for (let i = 0; i < response.functionCalls.length; i++) {
      const functionCall = modelContent!.parts![i].functionCall!;
      if (!isToolName(functionCall.name!)) return;

      const functionResult = await toolCaller(
        functionCall.name,
        functionCall.args!,
      );

      parts.push({
        functionResponse: {
          name: functionCall.name!,
          response: { output: functionResult },
        },
      });
    }

    newContent.push({
      role: "user",
      parts,
    });

    const finalResponse = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: newContent,
    });

    newContent.push({ role: "model", parts: [{ text: finalResponse.text }] });

    return NextResponse.json({
      contents: newContent.slice(
        newContent.length - 1 - response.functionCalls.length,
      ),
    });
  }

  return NextResponse.json({
    contents: [{ role: "model", parts: [{ text: response.text }] }],
  });
}
