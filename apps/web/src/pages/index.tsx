import type { NextPage } from "next";
import NextError from "next/error";
import { useRouter } from "next/router";

import { Logo } from "~/components/BlobscanLogo";
import { Button } from "~/components/Button";
import { BlobTransactionCard } from "~/components/Cards/BlobTransactionCard";
import { TransactionCardSkeleton } from "~/components/Cards/BlobTransactionCard/Skeleton";
import { BlockCard } from "~/components/Cards/BlockCard";
import { BlockCardSkeleton } from "~/components/Cards/BlockCard/Skeleton";
import { SectionCard } from "~/components/Cards/SectionCard";
import { Link } from "~/components/Link";
import { SearchInput } from "~/components/SearchInput";
import { api } from "~/api";

const BLOCKS_LIMIT = 4;
const TXS_LIMIT = 5;

const Home: NextPage = () => {
  const router = useRouter();
  const blocksQuery = api.block.getAll.useQuery({
    limit: BLOCKS_LIMIT,
  });
  const txsQuery = api.tx.getAll.useQuery({ limit: TXS_LIMIT });
  const error = blocksQuery.error || txsQuery.error;

  if (error) {
    return (
      <NextError
        title={error.message}
        statusCode={error.data?.httpStatus ?? 500}
      />
    );
  }

  const { data: blocks } = blocksQuery;
  const { data: txs } = txsQuery;

  return (
    <div className="flex flex-col items-center justify-center gap-12 md:gap-24">
      <div className=" flex flex-col items-center justify-center gap-8 md:w-8/12">
        <Logo size="lg" />
        <div className="flex flex-col items-stretch justify-center space-y-2  md:w-8/12">
          <SearchInput />
          <span className="text- text-center text-sm  text-contentSecondary-light dark:text-contentSecondary-dark">
            Blob transaction explorer for the{" "}
            <Link href="https://www.eip4844.com/" isExternal>
              EIP-4844
            </Link>
          </span>
        </div>
      </div>
      <div className="flex w-11/12 flex-col gap-8 md:gap-16">
        <SectionCard
          header={
            <div className="flex items-center justify-between">
              <div>Latest Blocks</div>{" "}
              <Button
                variant="outline"
                label="View All Blocks"
                onClick={() => console.log("TODO: View all blocks")}
              />
            </div>
          }
        >
          <div className="flex flex-col gap-5 md:flex-row">
            {blocksQuery.isLoading
              ? Array(BLOCKS_LIMIT)
                  .fill(0)
                  .map((_, i) => (
                    <div className="flex-grow" key={i}>
                      <BlockCardSkeleton />
                    </div>
                  ))
              : blocks?.map((b) => <BlockCard key={b.hash} block={b} />)}
          </div>
        </SectionCard>
        <SectionCard
          header={
            <div className="flex items-center justify-between">
              <div>Latest Blob Transactions</div>{" "}
              <Button
                variant="outline"
                label="View All Transactions"
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                onClick={() => router.push("/txs")}
              />
            </div>
          }
        >
          <div className=" flex flex-col gap-5">
            {txsQuery.isLoading
              ? Array(TXS_LIMIT)
                  .fill(0)
                  .map((_, i) => <TransactionCardSkeleton key={i} />)
              : txs?.map((tx) => {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { block, blockNumber, ...filteredTx } = tx;

                  return (
                    <BlobTransactionCard
                      key={tx.hash}
                      transaction={filteredTx}
                      block={{ ...tx.block, number: blockNumber }}
                    />
                  );
                })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default Home;
