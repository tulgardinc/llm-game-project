import { publicProcedure, router } from "../trpc";
import { z } from "zod";

export const helloRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return { greeting: `Hello, ${input.name}` };
    }),
});
