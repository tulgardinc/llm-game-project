import { appRouter } from "@/server/api/routers";
import { createContext } from "@/server/context";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

const handler = (req: Request) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
  });
};

export { handler as GET, handler as POST };
