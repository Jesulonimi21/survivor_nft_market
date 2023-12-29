/* eslint-disable no-async-promise-executor */
import algosdk, { Algodv2, Indexer } from "algosdk";
import fs from "fs";
import path from "path";

const waitForConfirmation = async function (
  algodclient: Algodv2,
  txId: string
): Promise<void> {
  const response = await algodclient.status().do();
  let lastround = response["last-round"];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const pendingInfo = await algodclient
      .pendingTransactionInformation(txId)
      .do();
    if (
      pendingInfo["confirmed-round"] !== null &&
      pendingInfo["confirmed-round"] > 0
    ) {
      // Got the completed Transaction
      console.log(
        "Transaction " +
          txId +
          " confirmed in round " +
          pendingInfo["confirmed-round"]
      );
      break;
    }
    lastround++;
    await algodclient.statusAfterBlock(lastround).do();
  }
};

function getAppRootDir(): string {
  let currentDir = __dirname;
  while (!fs.existsSync(path.join(currentDir, "package.json"))) {
    currentDir = path.join(currentDir, "..");
  }
  return currentDir;
}

async function compileProgram(
  client: Algodv2,
  programSource: string
): Promise<Uint8Array> {
  return new Promise<Uint8Array>(async (resolve, reject) => {
    try {
      const results = await client.compile(programSource).do();
      const compiledBytes = new Uint8Array(
        Buffer.from(results.result, "base64")
      );
      resolve(compiledBytes);
    } catch (error) {
      reject(error);
    }
  });
}

const getClient = (): Algodv2 => {
  const token =
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const server = "http://localhost";
  const port = "4001";
  const client = new algosdk.Algodv2(token, server, port);
  return client;
};

function getIndexerClient(): Indexer {
  const token =
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const server = "http://localhost";
  const port = "8980";
  const client = new algosdk.Indexer(token, server, port);
  return client;
}
function uint64ToBigEndianByteArray(uint64: bigint): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);

  // Assuming uint64 is a 64-bit integer
  view.setBigUint64(0, uint64, false);

  const byteArray = new Uint8Array(buffer);

  return byteArray;
}

export {
  waitForConfirmation,
  compileProgram,
  getClient,
  getAppRootDir,
  getIndexerClient,
  uint64ToBigEndianByteArray,
};
