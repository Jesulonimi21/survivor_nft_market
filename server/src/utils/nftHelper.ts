
/* eslint-disable no-async-promise-executor */
import algosdk, { Algodv2, Indexer, ABIValue } from "algosdk";
import fs from "fs";
import path from "path";
import * as algokit from "@algorandfoundation/algokit-utils";

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



const getAssetsForAddress = async (
  nftContractId: number,
  address: string
): Promise<{
  assets: [{ assetId?: number; isFractionalft?: boolean }?];
  app: number;
}> => {
  try {
    const client = getClient();
    const boxName = algosdk.decodeAddress(address).publicKey;
    const boxValue = await algokit.getAppBoxValue(
      nftContractId,
      boxName,
      client
    );
    const tupleCodec = new algosdk.ABITupleType([new algosdk.ABIUintType(64)]);
    const decodedBoxValue: ABIValue[] = tupleCodec.decode(
      boxValue
    ) as ABIValue[];

    const appAddress = algosdk.getApplicationAddress(
      Number(decodedBoxValue[0])
    );
    const indexer = getIndexerClient();
    const accountAssetInfo = await indexer.lookupAccountAssets(appAddress).do();
    const assets = accountAssetInfo.assets.map(
      (el: { "asset-id": number; amount: number }) => {
        const asset = {
          assetId: el["asset-id"],
          isFractionalNft: el.amount > 1,
        };
        return asset;
      }
    );
    return { assets, app: Number(decodedBoxValue[0]) };
  } catch (error) {
    return { assets: [], app: 0 };
  }
};

const fundAccount = async (account: algosdk.Account, amount: number = 100) => {
  await algokit.ensureFunded(
    {
      accountToFund: account.addr,
      minSpendingBalance: algokit.algos(amount),
    },
    getClient()
  );
};

const constructMetadataJsonFile = (decimals: number, imageUri:string,
  image_integrity: string, image_mimetype: string): unknown => {
  return {
    "title": "Token Metadata",
    "type": "object",
    "properties": {
      "name": "surcicors",
      "decimals": `${decimals}`,
      "description": "survivors",
      "image": imageUri,
      "image_integrity": image_integrity,
      "image_mimetype": image_mimetype,
      "background_color":"#ffffff",
      "external_url": "https://survivors.io",
      "external_url_integrity": "sha256 of file",
      "external_url_mimetype":"text/html",
      "animation_url": "none",
      "animation_url_integrity": "none",
      "animation_url_mimetype": "none",
      "properties": "will_be_added",
      "extra_metadata": "extra_metadata",
    }
  };
};

const getAllNfts = async (
  appId: number,
  nextToken: string | undefined
): Promise<
  [
    {
      assetsInfo: {
        app: number;
        assets: [{ assetId?: number; isFractionalft?: boolean }?];
      };
      appId: number;
      artistAddress: string;
    }?
  ]
> => {
  const indexer = getIndexerClient();
  if (!nextToken) {
    return [undefined];
  }
  const allArtists = await indexer
    .searchForApplicationBoxes(appId)
    .nextToken(nextToken === "begin" ? "" : nextToken)
    .do();
  const allAssets = await Promise.all(
    allArtists.boxes.map(async (artist) => {
      // const boxName = strType.encode(artist)
      try {
        const boxValue = await algokit.getAppBoxValue(
          appId,
          artist.name,
          getClient()
        );
        const tupleCodec = new algosdk.ABITupleType([
          new algosdk.ABIUintType(64),
        ]);
        const decodedBoxValue: ABIValue[] = tupleCodec.decode(
          boxValue
        ) as ABIValue[];
        const artistAddress = algosdk.encodeAddress(artist.name);
        const assetsInfo = await getAssetsForAddress(
          Number(appId),
          algosdk.encodeAddress(artist.name)
        );
        return {
          artistAddress,
          appId: Number(decodedBoxValue[0]),
          assetsInfo,
        };
      } catch (error) {
        return undefined;
      }
    })
  );
  const updatedAllAssets = allAssets.concat(
    await getAllNfts(appId, allArtists.nextToken)
  );
  const allDefinedAssets: [
    {
      assetsInfo: {
        app: number;
        assets: [{ assetId?: number; isFractionalft?: boolean }?];
      };
      appId: number;
      artistAddress: string;
    }?
  ] = [];
  updatedAllAssets.forEach((first) => {
    if (first != undefined) {
      allDefinedAssets.push(first);
    }
  });

  return allDefinedAssets;
};

const readNftData = async (
  appId: number,
  nftId: number
): Promise<{ nftId: number; price: number; owner: string }> => {
  const boxName = algosdk.encodeUint64(nftId);
  const boxValue = await algokit.getAppBoxValue(appId, boxName, getClient());
  const tupleCodec = new algosdk.ABITupleType([
    new algosdk.ABIUintType(64),
    new algosdk.ABIUintType(64),
    new algosdk.ABIAddressType(),
  ]);
  const decodedBoxValue: ABIValue[] = tupleCodec.decode(boxValue) as ABIValue[];

  return {
    nftId: Number(decodedBoxValue[0]),
    price: Number(decodedBoxValue[1]),
    owner: decodedBoxValue[2] as string,
  };
};


const getAssetsForApp = async (
  appId: number
): Promise<Array<{ nftId: number; price: number; owner: string }>> => {
  const appAddress = algosdk.getApplicationAddress(appId);
  const indexer = getIndexerClient();
  const accountAssetInfo = await indexer.lookupAccountAssets(appAddress).do();
  const assetsInfos = await Promise.all(
    accountAssetInfo.assets.map(async (asset: {"asset-id": number}) => {
      try {
        const nftData = await readNftData(appId, asset["asset-id"]);
        return nftData;
      } catch (error) {
        return undefined;
      }
    })
  );
  return assetsInfos.filter((el) => el != undefined);
};

export {
  waitForConfirmation,
  compileProgram,
  getClient,
  getAppRootDir,
  getIndexerClient,
  uint64ToBigEndianByteArray,
  getAssetsForAddress,
  fundAccount,
  constructMetadataJsonFile,
  getAllNfts,
  getAssetsForApp,
};
