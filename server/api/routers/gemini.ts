import { makeGeminiRequestWithTools } from "@/lib/gemini-api";
import { publicProcedure, router } from "../trpc";
import { z } from "zod";
import { Content } from "@google/genai";
import { TRPCError } from "@trpc/server";
import {
  createCharacterSystemInstruction,
  WRITER_SYSTEM_INSTRUCTION,
} from "@/lib/system-instructions";
import { prisma } from "@/lib/prisma";

export const geminiRouter = router({
  makeCharacterRequest: publicProcedure
    .input(z.object({ pastContents: z.custom<Content[]>() }))
    .mutation(async ({ input }) => {
      try {
        const newContents = await makeGeminiRequestWithTools(
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
        return newContents;
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
        userRequest: z.custom<Content>(),
        charResponse: z.custom<Content>(),
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

user:
${input.userRequest?.parts?.[0].text}

character:
${input.charResponse?.parts?.[0].text}`,
            },
          ],
        };
        const newContents = await makeGeminiRequestWithTools(
          [formatedUserRequest],
          WRITER_SYSTEM_INSTRUCTION,
        );
        return newContents[newContents.length - 1];
      } catch (error) {
        throw new TRPCError({
          message: (error as Error).message,
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),
});
