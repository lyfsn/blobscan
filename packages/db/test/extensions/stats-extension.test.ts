/* eslint-disable @typescript-eslint/ban-ts-comment */
import type {
  BlobDailyStats,
  BlobOverallStats,
  BlockDailyStats,
  BlockOverallStats,
  TransactionDailyStats,
  TransactionOverallStats,
} from "@prisma/client";
import type { SuiteFactory } from "vitest";
import { beforeEach } from "vitest";
import { describe, it, expect } from "vitest";

import dayjs from "@blobscan/dayjs";
import { fixtures, omitDBTimestampFields } from "@blobscan/test";

import type { DatePeriod, RawDatePeriod } from "../../prisma";
import { prisma } from "../../prisma";
import {
  createNewData,
  dayToDatePeriod,
  getDailyBlobs,
  getDailyBlocks,
  getDailyStatsPrismaModel,
  getDailyTransactions,
  getOverallStatsPrismaModel,
} from "./stats-extension.test.utils";

function runDailyStatsFunctionsTests(
  modelName: "blobDailyStats" | "blockDailyStats" | "transactionDailyStats",
  {
    statsCalculationTestsSuite,
  }: {
    statsCalculationTestsSuite?: SuiteFactory;
  }
) {
  return describe("Daily stats functions", () => {
    const prismaModel = getDailyStatsPrismaModel(modelName);

    describe("populate", () => {
      async function checkStats(datePeriod?: RawDatePeriod) {
        await prismaModel.populate(datePeriod);

        // @ts-ignore
        const stats = await prismaModel.findMany({
          orderBy: {
            day: "asc",
          },
        });

        expect(stats).toMatchSnapshot();
      }

      if (statsCalculationTestsSuite) {
        describe("when filling in daily stats", statsCalculationTestsSuite);
      }

      describe("when filling in stats for a multiple days period", () => {
        it("should do it correctly when `YYYY-MM-DD` dates are passed", async () => {
          await checkStats({
            from: "2023-08-24",
            to: "2023-09-01",
          });
        });
      });

      it("should fill in stats correctly when `Date` objects are passed", async () => {
        await checkStats({
          from: new Date("2023-08-24"),
          to: new Date("2023-09-01"),
        });
      });

      it("should fill in stats correctly when `dayjs` objects are passed", async () => {
        await checkStats({
          from: dayjs("2023-08-24"),
          to: dayjs("2023-09-01"),
        });
      });

      it("should fill in stats for a period that doesn't have a starting date", async () => {
        await checkStats({
          to: "2023-08-24",
        });
      });

      it("should fill in stats for a period that doesn't have an ending date", async () => {
        await checkStats({
          from: "2023-08-24",
        });
      });

      it("should fill in stats up to current date if no period is specified", async () => {
        await checkStats();
      });

      it("should fill in stats for a period with no data", async () => {
        await checkStats({
          from: "2099-01-01",
          to: "2099-12-31",
        });
      });
    });

    describe("deleteAll", async () => {
      it("should delete all stats correctly", async () => {
        await prismaModel.populate({ from: "2022-01-01" });

        await prismaModel.deleteAll();

        // @ts-ignore
        const dailyStats = await prismaModel.findMany({
          orderBy: { day: "asc" },
        });

        expect(dailyStats).toHaveLength(0);
      });
    });
  });
}

function runOverallStatsFunctionsTests(
  modelName:
    | "blobOverallStats"
    | "blockOverallStats"
    | "transactionOverallStats",
  { statsCalculationTestsSuite }: { statsCalculationTestsSuite?: SuiteFactory }
) {
  return describe("Overall stats functions", () => {
    const prismaModel = getOverallStatsPrismaModel(modelName);

    if (statsCalculationTestsSuite) {
      describe("populate", () => {
        describe("when aggregating overall stats", statsCalculationTestsSuite);

        it("should populate stats after adding new items correctly", async () => {
          await prismaModel.populate();
          await createNewData();

          await prismaModel.populate();

          const result = await prismaModel
            // @ts-ignore
            .findFirst()
            // @ts-ignore
            .then((res) => (res ? omitDBTimestampFields(res) : res));

          expect(result).toMatchSnapshot();
        });
      });

      describe("increment", () => {
        it("should increment stats given a block range correctly", async () => {
          await prismaModel.populate();
          await createNewData();

          await prismaModel.populate();

          const result = await prismaModel
            // @ts-ignore
            .findFirst()
            // @ts-ignore
            .then((res) => (res ? omitDBTimestampFields(res) : res));

          expect(result).toMatchSnapshot();
        });

        it("should update already existing stats correctly", async () => {
          await prismaModel.increment({ from: 1000, to: 1001 });
          await createNewData();
          await prismaModel.increment({ from: 1000, to: 1001 });

          const result = await prismaModel
            // @ts-ignore
            .findFirst()
            // @ts-ignore
            .then((res) => (res ? omitDBTimestampFields(res) : res));

          expect(result).toMatchSnapshot();
        });
      });
    }
  });
}
describe("Stats Extension", () => {
  const dayPeriod: DatePeriod = dayToDatePeriod("2023-08-31");
  const fixtureBlobs = fixtures.blobsOnTransactions.map((btx) => {
    const blob = fixtures.blobs.find(
      (blob) => blob.versionedHash === btx.blobHash
    );

    if (!blob) throw new Error(`Blob with id ${btx.blobHash} not found`);

    return blob;
  });

  describe("Blob model", () => {
    runDailyStatsFunctionsTests("blobDailyStats", {
      statsCalculationTestsSuite() {
        const expectedDailyBlobs = getDailyBlobs(dayPeriod);
        let blobDailyStats: BlobDailyStats | null;

        beforeEach(async () => {
          await prisma.blobDailyStats.populate(dayPeriod);

          blobDailyStats = await prisma.blobDailyStats.findFirst();

          return async () => {
            await prisma.blobDailyStats.deleteMany();
          };
        });

        it("should calculate the total amount of blobs correctly", () => {
          const expectedTotalBlobs = expectedDailyBlobs.length;

          expect(blobDailyStats?.totalBlobs).toBe(expectedTotalBlobs);
        });

        it("should calculate the total amount of unique blobs correctly", () => {
          const expectedTotalUniqueBlobs = new Set(
            expectedDailyBlobs.map((b) => b.versionedHash)
          ).size;

          expect(blobDailyStats?.totalUniqueBlobs).toBe(
            expectedTotalUniqueBlobs
          );
        });

        it("should calculate the total blob size correctly", () => {
          const expectedTotalBlobSize = expectedDailyBlobs.reduce(
            (acc, b) => acc + b.size,
            0
          );

          expect(blobDailyStats?.totalBlobSize).toBe(
            BigInt(expectedTotalBlobSize)
          );
        });

        it("should calculate the average blob size correctly", () => {
          const expectedAvgBlobSize =
            expectedDailyBlobs.reduce((acc, b) => acc + b.size, 0) /
            expectedDailyBlobs.length;

          expect(blobDailyStats?.avgBlobSize).toBe(expectedAvgBlobSize);
        });
      },
    });

    runOverallStatsFunctionsTests("blobOverallStats", {
      statsCalculationTestsSuite() {
        let blobOverallStats: BlobOverallStats | null;

        beforeEach(async () => {
          await prisma.blobOverallStats.populate();

          blobOverallStats = await prisma.blobOverallStats.findFirst();

          return async () => {
            await prisma.blobOverallStats.deleteMany();
          };
        });

        it("should calculate the total amount of blobs correctly", async () => {
          const expectedTotalBlobs = fixtures.blobsOnTransactions.length;

          expect(blobOverallStats?.totalBlobs).toBe(expectedTotalBlobs);
        });

        it("should calculate the total amount of unique blobs correctly", async () => {
          const expectedTotalUniqueBlobs = fixtures.blobs.length;

          expect(blobOverallStats?.totalUniqueBlobs).toBe(
            expectedTotalUniqueBlobs
          );
        });

        it("should calculate the total blob size correctly", async () => {
          const expectedTotalBlobSize = fixtureBlobs.reduce(
            (acc, b) => acc + b.size,
            0
          );

          expect(blobOverallStats?.totalBlobSize).toBe(
            BigInt(expectedTotalBlobSize)
          );
        });

        it("should calculate the average blob size correctly", async () => {
          const expectedTotalBlobSize = fixtureBlobs.reduce(
            (acc, btx) => acc + btx.size,
            0
          );
          const expectedAvgBlobSize =
            expectedTotalBlobSize / fixtures.blobsOnTransactions.length;

          expect(blobOverallStats?.avgBlobSize).toBe(expectedAvgBlobSize);
        });
      },
    });
  });

  describe("Block model", () => {
    runDailyStatsFunctionsTests("blockDailyStats", {
      statsCalculationTestsSuite() {
        const expectedDailyBlocks = getDailyBlocks(dayPeriod);
        // const expectedDailyTxs = getDailyTransactions(dayPeriod);
        let blockDailyStats: BlockDailyStats | null;

        beforeEach(async () => {
          await prisma.blockDailyStats.populate(dayPeriod);

          blockDailyStats = await prisma.blockDailyStats.findFirst();

          return async () => {
            await prisma.blockDailyStats.deleteMany();
          };
        });

        it("should calculate the average blob as calldata fee correctly", () => {
          const expectedAvgBlobAsCalldataFee =
            expectedDailyBlocks.reduce(
              (acc, b) => acc + b.blobAsCalldataGasUsed * b.blobGasPrice,
              0
            ) / expectedDailyBlocks.length;

          expect(blockDailyStats?.avgBlobAsCalldataFee).toBe(
            expectedAvgBlobAsCalldataFee
          );
        });

        it("should calculate the average blob fee correctly", () => {
          const expectedAvgBlobFee =
            expectedDailyBlocks.reduce(
              (acc, b) => acc + b.blobGasUsed * b.blobGasPrice,
              0
            ) / expectedDailyBlocks.length;

          expect(blockDailyStats?.avgBlobFee).toBe(expectedAvgBlobFee);
        });

        it("should calculate the average blob gas price correctly", () => {
          const expectedAvgBlobGasPrice =
            expectedDailyBlocks.reduce((acc, b) => acc + b.blobGasPrice, 0) /
            expectedDailyBlocks.length;

          expect(blockDailyStats?.avgBlobGasPrice).toBe(
            expectedAvgBlobGasPrice
          );
        });

        // TODO: Fix this calculation
        // it("should calculate the total blob as calldata fee correctly", () => {
        //   const res = expectedDailyTxs.reduce(
        //     (acc, tx) => acc + tx.gasPrice * tx.blobAsCalldataGasUsed,
        //     0
        //   );

        //   expect(blockDailyStats?.totalBlobAsCalldataFee).toBe(BigInt(res));
        // });

        it("should calculate the total blob as calldata gas used correctly", () => {
          const expectedTotalBlobAsCalldataGasUsed = expectedDailyBlocks.reduce(
            (acc, b) => acc + b.blobAsCalldataGasUsed,
            0
          );

          expect(blockDailyStats?.totalBlobAsCalldataGasUsed.toNumber()).toBe(
            expectedTotalBlobAsCalldataGasUsed
          );
        });

        it("should calculate the total blob fee correctly", () => {
          const expectedTotalBlobFee = expectedDailyBlocks.reduce(
            (acc, b) => acc + b.blobGasUsed * b.blobGasPrice,
            0
          );

          expect(blockDailyStats?.totalBlobFee.toNumber()).toBe(
            expectedTotalBlobFee
          );
        });

        it("should calculate the total blob gas used correctly", () => {
          const expectedTotalBlobGasUsed = expectedDailyBlocks.reduce(
            (acc, b) => acc + b.blobGasUsed,
            0
          );

          expect(blockDailyStats?.totalBlobGasUsed.toNumber()).toBe(
            expectedTotalBlobGasUsed
          );
        });

        it("should calculate the total blocks correctly", () => {
          const expectedTotalBlocks = expectedDailyBlocks.length;

          expect(blockDailyStats?.totalBlocks).toBe(expectedTotalBlocks);
        });
      },
    });

    runOverallStatsFunctionsTests("blockOverallStats", {
      statsCalculationTestsSuite() {
        const blocks = fixtures.blocks;
        let overallStats: BlockOverallStats | null;

        beforeEach(async () => {
          await prisma.blockOverallStats.populate();

          overallStats = await prisma.blockOverallStats.findFirst();
        });

        // TODO: Fix this calculation
        it("should calculate the average blob as calldata fee correctly");

        it("should calculate the average blob fee correctly", () => {
          const expectedAvgBlobFee =
            blocks.reduce((acc, b) => acc + b.blobGasUsed * b.blobGasPrice, 0) /
            blocks.length;

          expect(overallStats?.avgBlobFee).toBe(expectedAvgBlobFee);
        });

        it("should calculate the average blob gas price correctly", () => {
          const expectedAvgBlobGasPrice =
            blocks.reduce((acc, b) => acc + b.blobGasPrice, 0) / blocks.length;

          expect(overallStats?.avgBlobGasPrice).toBe(expectedAvgBlobGasPrice);
        });

        // TODO: Fix this calculation
        it("should calculate the total blob as calldata fee correctly");

        it("should calculate the total blob as calldata gas used correctly", () => {
          const expectedTotalBlobAsCalldataGasUsed = blocks.reduce(
            (acc, b) => acc + b.blobAsCalldataGasUsed,
            0
          );

          expect(overallStats?.totalBlobAsCalldataGasUsed.toNumber()).toBe(
            expectedTotalBlobAsCalldataGasUsed
          );
        });

        it("should calculate the total blob fee correctly", () => {
          const expectedTotalBlobFee = blocks.reduce(
            (acc, b) => acc + b.blobGasUsed * b.blobGasPrice,
            0
          );

          expect(overallStats?.totalBlobFee.toNumber()).toBe(
            expectedTotalBlobFee
          );
        });

        it("should calculate the total blob gas used correctly", () => {
          const expectedTotalBlobGasUsed = blocks.reduce(
            (acc, b) => acc + b.blobGasUsed,
            0
          );

          expect(overallStats?.totalBlobGasUsed.toNumber()).toBe(
            expectedTotalBlobGasUsed
          );
        });

        it("should calculate the total blocks correctly", () => {
          const expectedTotalBlocks = blocks.length;

          expect(overallStats?.totalBlocks).toBe(expectedTotalBlocks);
        });
      },
    });
  });

  describe("Transaction model", () => {
    runDailyStatsFunctionsTests("transactionDailyStats", {
      statsCalculationTestsSuite() {
        const expectedDailyTransactions = getDailyTransactions(dayPeriod);
        let transactionDailyStats: TransactionDailyStats | null;

        beforeEach(async () => {
          await prisma.transactionDailyStats.populate(dayPeriod);

          transactionDailyStats =
            await prisma.transactionDailyStats.findFirst();
        });

        it("should calculate the average max fee per blob gas correctly", () => {
          const expectedAvgMaxBlobGasFee =
            expectedDailyTransactions.reduce(
              (acc, tx) => acc + tx.maxFeePerBlobGas,
              0
            ) / expectedDailyTransactions.length;

          expect(transactionDailyStats?.avgMaxBlobGasFee).toBe(
            expectedAvgMaxBlobGasFee
          );
        });

        it("should calculate the total transactions correctly", () => {
          const expectedTotalTransactions = expectedDailyTransactions.length;

          expect(transactionDailyStats?.totalTransactions).toBe(
            expectedTotalTransactions
          );
        });

        it("should calculate the total unique receivers correctly", () => {
          const expectedTotalUniqueReceivers = new Set(
            expectedDailyTransactions.map((tx) => tx.toId)
          ).size;

          expect(transactionDailyStats?.totalUniqueReceivers).toBe(
            expectedTotalUniqueReceivers
          );
        });

        it("should calculate the total unique senders correctly", () => {
          const expectedTotalUniqueSenders = new Set(
            expectedDailyTransactions.map((tx) => tx.fromId)
          ).size;

          expect(transactionDailyStats?.totalUniqueSenders).toBe(
            expectedTotalUniqueSenders
          );
        });
      },
    });

    runOverallStatsFunctionsTests("transactionOverallStats", {
      statsCalculationTestsSuite() {
        const transactions = fixtures.txs;
        let overallStats: TransactionOverallStats | null;

        beforeEach(async () => {
          await prisma.transactionOverallStats.populate();

          overallStats = await prisma.transactionOverallStats.findFirst();
        });

        it("should calculate the average max fee per blob gas correctly", () => {
          const expectedAvgMaxBlobGasFee =
            transactions.reduce((acc, tx) => acc + tx.maxFeePerBlobGas, 0) /
            transactions.length;

          expect(overallStats?.avgMaxBlobGasFee).toBe(expectedAvgMaxBlobGasFee);
        });

        it("should calculate the total transactions correctly", () => {
          const expectedTotalTransactions = transactions.length;

          expect(overallStats?.totalTransactions).toBe(
            expectedTotalTransactions
          );
        });

        it("should calculate the total unique receivers correctly", () => {
          const expectedTotalUniqueReceivers = new Set(
            transactions.map((tx) => tx.toId)
          ).size;

          expect(overallStats?.totalUniqueReceivers).toBe(
            expectedTotalUniqueReceivers
          );
        });

        it("should calculate the total unique senders correctly", () => {
          const expectedTotalUniqueSenders = new Set(
            transactions.map((tx) => tx.fromId)
          ).size;

          expect(overallStats?.totalUniqueSenders).toBe(
            expectedTotalUniqueSenders
          );
        });
      },
    });
  });
});
