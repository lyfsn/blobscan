import dayjs from "@blobscan/dayjs";
import { fixtures } from "@blobscan/test";

import { prisma } from "../../prisma";
import type { BlockNumberRange, DatePeriod, RawDatePeriod } from "../../prisma";
import { NEW_DATA } from "./stats-extension.test.fixtures";

function hasDailyStatsExtensionFns(model: unknown): model is {
  populate: (datePeriod: RawDatePeriod) => void;
  findMany: () => unknown;
} {
  return (
    typeof model === "object" &&
    model !== null &&
    "populate" in model &&
    "deleteAll" in model
  );
}

function hasOverallStatsExtensionFns(model: unknown): model is {
  populate: () => unknown;
  increment: (range: BlockNumberRange) => void;
} {
  return (
    typeof model === "object" &&
    model !== null &&
    "populate" in model &&
    "increment" in model
  );
}

export function dayToDatePeriod(day: string): DatePeriod {
  const day_ = dayjs(day);

  return {
    from: day_.startOf("day").toISOString(),
    to: day_.endOf("day").toISOString(),
  };
}

export function getDailyBlocks(datePeriod: DatePeriod) {
  return fixtures.blocks.filter((b) =>
    dayjs(b.timestamp).isBetween(datePeriod.from, datePeriod.to)
  );
}

export function getDailyTransactions(datePeriod: DatePeriod) {
  const dailyBlocks = getDailyBlocks(datePeriod).filter((b) =>
    dayjs(b.timestamp).isBetween(datePeriod.from, datePeriod.to)
  );

  return fixtures.txs.filter((tx) =>
    dailyBlocks.find((block) => block.number === tx.blockNumber)
  );
}

export function getDailyBlobs(datePeriod: DatePeriod) {
  const dailyBlockTxs = getDailyTransactions(datePeriod);

  return fixtures.blobsOnTransactions
    .filter((btx) => dailyBlockTxs.find((tx) => tx.hash === btx.txHash))
    .map((btx) => {
      const blob = fixtures.blobs.find(
        (blob) => blob.versionedHash === btx.blobHash
      );

      if (!blob) throw new Error(`Blob with id ${btx.blobHash} not found`);

      return blob;
    });
}

export function getDailyStatsPrismaModel(
  modelName: "blobDailyStats" | "blockDailyStats" | "transactionDailyStats"
) {
  const model = prisma[modelName];

  if (hasDailyStatsExtensionFns(model)) {
    return model;
  }

  throw new Error(`Model ${modelName.toString()} has no daily stats functions`);
}

export function getOverallStatsPrismaModel(
  modelName:
    | "blobOverallStats"
    | "blockOverallStats"
    | "transactionOverallStats"
) {
  const model = prisma[modelName];

  if (hasOverallStatsExtensionFns(model)) {
    return model;
  }

  throw new Error(
    `Model ${modelName.toString()} has no overall stats functions`
  );
}

export function createNewData() {
  return prisma.$transaction([
    prisma.block.createMany({ data: NEW_DATA.blocks }),
    prisma.transaction.createMany({ data: NEW_DATA.transactions }),
    prisma.blob.createMany({ data: NEW_DATA.blobs }),
    prisma.blobsOnTransactions.createMany({
      data: NEW_DATA.blobsOnTransactions,
    }),
  ]);
}
