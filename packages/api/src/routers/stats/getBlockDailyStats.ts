import { timeFrameProcedure } from "../../middlewares/withTimeFrame";
import { BLOCK_BASE_PATH } from "./common";
import type { GetBlockDailyStatsOutputSchema } from "./getBlockDailyStats.schema";
import { getBlockDailyStatsOutputSchema } from "./getBlockDailyStats.schema";

export const getBlockDailyStats = timeFrameProcedure
  .meta({
    openapi: {
      method: "GET",
      path: `/${BLOCK_BASE_PATH}`,
      tags: ["blocks"],
      summary: "Get blocks time series stats",
    },
  })
  .output(getBlockDailyStatsOutputSchema)
  .query(({ ctx: { prisma, timeFrame } }) =>
    prisma.blockDailyStats
      .findMany({
        where: {
          day: {
            gte: timeFrame.initial.toDate(),
            lte: timeFrame.final.toDate(),
          },
        },
        orderBy: { day: "asc" },
      })
      .then((stats) =>
        stats.reduce<GetBlockDailyStatsOutputSchema>(
          (
            transformedStats,
            {
              day,
              totalBlocks,
              totalBlobGasUsed,
              totalBlobAsCalldataGasUsed,
              totalBlobFee,
              totalBlobAsCalldataFee,
              avgBlobFee,
              avgBlobAsCalldataFee,
              avgBlobGasPrice,
            }
          ) => {
            transformedStats.days.push(day.toISOString());
            transformedStats.totalBlocks.push(totalBlocks);
            transformedStats.totalBlobGasUsed.push(Number(totalBlobGasUsed));
            transformedStats.totalBlobAsCalldataGasUsed.push(
              Number(totalBlobAsCalldataGasUsed)
            );
            transformedStats.totalBlobFees.push(Number(totalBlobFee));
            transformedStats.totalBlobAsCalldataFees.push(
              Number(totalBlobAsCalldataFee)
            );
            transformedStats.avgBlobFees.push(avgBlobFee);
            transformedStats.avgBlobAsCalldataFees.push(avgBlobAsCalldataFee);
            transformedStats.avgBlobGasPrices.push(avgBlobGasPrice);

            return transformedStats;
          },
          {
            days: [],
            totalBlocks: [],
            totalBlobGasUsed: [],
            totalBlobAsCalldataGasUsed: [],
            totalBlobFees: [],
            totalBlobAsCalldataFees: [],
            avgBlobFees: [],
            avgBlobAsCalldataFees: [],
            avgBlobGasPrices: [],
          }
        )
      )
  );