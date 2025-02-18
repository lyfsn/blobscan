import { BlobStorageManager } from "./BlobStorageManager";
import { env } from "./env";
import { GoogleStorage, PostgresStorage, SwarmStorage } from "./storages";

let blobStorageManager: BlobStorageManager | undefined;

export async function getBlobStorageManager(): Promise<BlobStorageManager> {
  if (!blobStorageManager) {
    const googleStorage = await GoogleStorage.tryCreateFromEnv(env);
    const postgresStorage = await PostgresStorage.tryCreateFromEnv(env);
    const swarmStorage = await SwarmStorage.tryCreateFromEnv(env);

    blobStorageManager = new BlobStorageManager(
      {
        GOOGLE: googleStorage,
        POSTGRES: postgresStorage,
        SWARM: swarmStorage,
      },
      env.CHAIN_ID
    );
  }

  return blobStorageManager;
}
