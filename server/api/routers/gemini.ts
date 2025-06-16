import { makeGeminiRequest } from "@/lib/gemini-api";
import { publicProcedure, router } from "../trpc";
import { z } from "zod";
import { Content } from "@google/genai";
import { TRPCError } from "@trpc/server";
import {
  createCharacterSystemInstruction,
  WRITER_SYSTEM_INSTRUCTION,
} from "@/lib/system-instructions";
import { prisma } from "@/lib/prisma";
import { DialogueContent } from "@/lib/types";

export const geminiRouter = router({
  makeCharacterRequest: publicProcedure
    .input(z.object({ pastContents: z.custom<Content[]>() }))
    .mutation(async ({ input }) => {
      try {
        const newContent = await makeGeminiRequest(
          input.pastContents,
          createCharacterSystemInstruction(
            JSON.stringify(
              (await prisma.characters.findFirst({
                select: {
                  description: true,
                },
                where: {
                  name: {
                    equals: "Torvin Stonebeard",
                  },
                },
              }))!.description,
            ),
          ),
        );
        return newContent;
      } catch (error) {
        throw new TRPCError({
          message: (error as Error).message,
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),
  makeWriterRequest: publicProcedure
    .input(
      z.object({
        pastStory: z.string(),
        userRequest: z.custom<DialogueContent>(),
        charResponse: z.custom<DialogueContent>(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const formatedUserRequest: Content = {
          role: "user",
          parts: [
            {
              text: `
PREVIOUS STORY:

${input.pastStory}

NEW DIALOGUE:

${input.userRequest.characterName}:
${input.userRequest.content.parts?.[0].text}

${input.charResponse.characterName}:
${input.charResponse.content.parts?.[0].text}`,
            },
          ],
        };
        const newContent = await makeGeminiRequest(
          [formatedUserRequest],
          WRITER_SYSTEM_INSTRUCTION,
        );
        return { content: newContent, characterName: "Story" };
      } catch (error) {
        throw new TRPCError({
          message: (error as Error).message,
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),
});
