import { FunctionDeclaration } from "@google/genai";
import { readFile } from "fs/promises";

import tools from "@/lib/tools.json";
type MCPFunctionDecleration = (typeof tools)[0];

export function mcpToGemini(
  functionDesc: MCPFunctionDecleration,
): FunctionDeclaration {
  const newDecl = { ...functionDesc };
  newDecl.parameters.type = newDecl.parameters.type.toUpperCase();

  const props = newDecl.parameters.properties;
  for (const key of Object.keys(newDecl.parameters.properties) as Array<
    keyof typeof props
  >) {
    const val = props[key];
    props[key] = {
      ...val,
      type: val.type.toUpperCase(),
    };
  }

  return newDecl as FunctionDeclaration;
}

export function toolCaller<T extends ToolFunctionName>(
  functionName: T,
  parameters: Record<string, unknown>,
): ToolReturn<T> {
  return toolFunctions[functionName](
    parameters as ToolParameters<T>,
  ) as ToolReturn<T>;
}

const toolFunctions = {
  getCharacter: async (params: { charName: string }): Promise<string> => {
    return readFile(`./data/${params.charName}.json`, "utf-8");
  },
};

type ToolFunctionMap = typeof toolFunctions;
export type ToolFunctionName = keyof ToolFunctionMap;
export type ToolParameters<T extends ToolFunctionName> = Parameters<
  ToolFunctionMap[T]
>[0];
type ToolReturn<T extends ToolFunctionName> = ReturnType<ToolFunctionMap[T]>;

export function isToolName(name: string): name is ToolFunctionName {
  return name in toolFunctions;
}
