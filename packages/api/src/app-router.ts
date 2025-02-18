import { z } from "zod";

import { publicProcedure } from "./procedures";
import { blobRouter } from "./routers/blob";
import { blockRouter } from "./routers/block";
import { indexerRouter } from "./routers/indexer";
import { searchRouter } from "./routers/search";
import { statsRouter } from "./routers/stats";
import { syncStateRouter } from "./routers/sync-state";
import { transactionRouter } from "./routers/tx";
import { t } from "./trpc-client";

export const appRouter = t.router({
  block: blockRouter,
  tx: transactionRouter,
  blob: blobRouter,
  search: searchRouter,
  indexer: indexerRouter,
  stats: statsRouter,
  syncState: syncStateRouter,
  healthcheck: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/healthcheck",
        summary: "Connection healthcheck",
        tags: ["system"],
      },
    })
    .input(z.void())
    .output(z.string())
    .query(() => "yay!"),
});

// export type definition of API
export type AppRouter = typeof appRouter;
