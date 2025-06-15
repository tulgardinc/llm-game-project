import { router } from "../trpc";
import { geminiRouter } from "./gemini";

export const appRouter = router({
  gemini: geminiRouter,
});

export type AppRouter = typeof appRouter;
