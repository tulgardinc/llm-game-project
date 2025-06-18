import { makeGeminiRequest } from "@/lib/gemini-api";
import { publicProcedure, router } from "../trpc";
import { z } from "zod";
import { Content, Type } from "@google/genai";
import { TRPCError } from "@trpc/server";
import {
  createCharacterSystemInstruction,
  LINEARIZER_SYSTEM_INSTRUCTION,
  WRITER_SYSTEM_INSTRUCTION,
} from "@/lib/system-instructions";
import { prisma } from "@/lib/prisma";

export const geminiRouter = router({
  makeCharacterRequest: publicProcedure
    .input(
      z.object({
        charName: z.string(),
        pastIntentions: z.custom<Content[]>(),
        gameState: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const characterInput: Content[] = [];
        for (let i = 0; i < input.gameState.length; i++) {
          characterInput.push({
            role: "user",
            parts: [{ text: input.gameState[i] }],
          });
          input.pastIntentions.push(input.pastIntentions[i]);
        }

        const characterIntention = await makeGeminiRequest(
          characterInput,
          createCharacterSystemInstruction(
            JSON.stringify(
              (await prisma.characters.findFirst({
                select: {
                  description: true,
                },
                where: {
                  name: {
                    equals: input.charName,
                  },
                },
              }))!.description,
            ),
          ),

          "application/json",
          {
            type: Type.OBJECT,
            properties: {
              thoughts: {
                type: Type.STRING,
                description:
                  "The internal thoughts of the character based on their circumstances and context. In first person mononlogue format.",
              },
              actions: {
                type: Type.STRING,
                description: "The actions the character is intending to take",
              },
            },
            required: ["actions", "thoughts"],
          },
        );
        return characterIntention;
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
        gameState: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const formatedUserRequest: Content = {
          role: "user",
          parts: [
            {
              text: `
STORY:

${input.pastStory}

EVENTS:

${input.gameState}:
`,
            },
          ],
        };
        const newContent = await makeGeminiRequest(
          [formatedUserRequest],
          WRITER_SYSTEM_INSTRUCTION,
        );
        return newContent;
      } catch (error) {
        throw new TRPCError({
          message: (error as Error).message,
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),
  makeLinearizerRequest: publicProcedure
    .input(
      z.object({
        gameState: z.string(),
        intentions: z.array(
          z.object({
            characterName: z.string(),
            currentIntention: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      const linearizerInput = [];
      for (const intention of input.intentions) {
        linearizerInput.push(
          `${intention.characterName}:\n${intention.currentIntention}\n`,
        );
      }

      const response = await makeGeminiRequest(
        [{ parts: [{ text: linearizerInput.join("\n") }] }],
        LINEARIZER_SYSTEM_INSTRUCTION,
      );

      return response.parts![0].text!;
    }),
});
