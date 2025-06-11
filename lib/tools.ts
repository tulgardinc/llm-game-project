import { FunctionDeclaration } from "@google/genai";

import { prisma } from "./prisma";

type MCPFunctionDecleration = {
  name: string;
  description: string;
  function: string;
  parameters?: {
    type: string;
    properties: {
      [key: string]:
        | {
            type: string;
            description: string;
          }
        | undefined;
    };
    required: string[];
  };
};

export function mcpToGemini(
  functionDesc: MCPFunctionDecleration,
): FunctionDeclaration {
  const newDecl = { ...functionDesc };

  if (!newDecl.parameters) return functionDesc as FunctionDeclaration;

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

type ParamOf<F> = F extends (arg: infer P) => unknown ? P : never;
type ReturnOf<F> = F extends (...args: readonly unknown[]) => infer R
  ? R
  : never;

export function toolCaller<T extends ToolFunctionName>(
  functionName: T,
  parameters: ToolParameters<T>,
): ToolReturn<T> {
  const fn = toolFunctions[functionName] as unknown as (
    p: ToolParameters<T>,
  ) => ToolReturn<T>;
  return fn(parameters);
}

const toolFunctions = {
  getAllCharacterNames: async () => {
    const chars = await prisma.characters.findMany({
      select: {
        name: true,
      },
    });
    return chars;
  },
  getCharacter: async (params: { charName: string }) => {
    const char = await prisma.characters.findFirst({
      select: {
        name: true,
        description: true,
      },
      where: {
        name: {
          equals: params.charName,
        },
      },
    });
    return char;
  },
  addCharacter: async (params: { name: string; description: string }) => {
    await prisma.characters.create({
      data: {
        name: params.name,
        description: params.description,
      },
    });
    return {
      name: params.name,
      description: params.description,
    };
  },
  setCharacterDescription: async (params: {
    name: string;
    description: string;
  }) => {
    await prisma.characters.updateMany({
      where: {
        name: params.name,
      },
      data: {
        description: {
          set: params.description,
        },
      },
    });
    return true;
  },
};

type ToolFunctionMap = typeof toolFunctions;
export type ToolFunctionName = keyof ToolFunctionMap;
export type ToolParameters<T extends ToolFunctionName> = ParamOf<
  ToolFunctionMap[T]
>;
type ToolReturn<T extends ToolFunctionName> = ReturnOf<ToolFunctionMap[T]>;

export function isToolName(name: string): name is ToolFunctionName {
  return name in toolFunctions;
}
