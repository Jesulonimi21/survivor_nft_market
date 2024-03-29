import {
  waitForConfirmation,
  getClient,
  getAppRootDir,
  compileProgram,
  getIndexerClient, 
} from "./utils";
import fs from "fs";
import algosdk, { ABIValue } from "algosdk";
import * as algokit from "@algorandfoundation/algokit-utils";
import { SuggestedParamsWithMinFee } 
  from "algosdk/dist/types/types/transactions/base";

  

const creatorAccount = algosdk.generateAccount();
const textEncoder = new TextEncoder();

const createGasStation = async () => {
  const approvalProgramStr = fs
    .readFileSync(getAppRootDir() + "/src/build/gas_station.teal")
    .toString();

  const clearProgramStr = fs
    .readFileSync(getAppRootDir() + "/src/build/clear.teal")
    .toString();
  const client = getClient();
  const params = await client.getTransactionParams().do();
  const globalBytes = 5;
  const globalInts = 9;
  const localBytes = 1;
  const localInts = 1;
  const approvalProgram = await compileProgram(client, approvalProgramStr);
  const clearProgram = await compileProgram(client, clearProgramStr);
  const onComplete = algosdk.OnApplicationComplete.NoOpOC;
  const from = creatorAccount.addr;
  await algokit.ensureFunded(
    {
      accountToFund: from,
      minSpendingBalance: algokit.algos(100),
    },
    client
  );
  const createAppTxn = algosdk.makeApplicationCreateTxn(
    from,
    params,
    onComplete,
    approvalProgram,
    clearProgram,
    localInts,
    localBytes,
    globalInts,
    globalBytes,
    []
  );

  const signedTxn = createAppTxn.signTxn(creatorAccount.sk);
  const sentTX = await client.sendRawTransaction(signedTxn).do();
  await waitForConfirmation(client, sentTX.txId);
  const ptx = await client.pendingTransactionInformation(sentTX.txId).do();
  const appId = ptx["application-index"];
  await algokit.ensureFunded(
    {
      accountToFund: algosdk.getApplicationAddress(appId),
      minSpendingBalance: algokit.algos(100),
    },
    client
  );
  return appId;
};



const create_nft_contract = async(gasStationId: number) =>{
  const approvalProgramStr = fs
    .readFileSync(getAppRootDir() + "/src/build/index.teal")
    .toString();

  const clearProgramStr = fs
    .readFileSync(getAppRootDir() + "/src/build/clear.teal")
    .toString();
  const client = getClient();
  const params = await client.getTransactionParams().do();
  const globalBytes = 4;
  const globalInts = 2;
  const localBytes = 0;
  const localInts = 0;
  const approvalProgram = await compileProgram(client, approvalProgramStr);
  const clearProgram = await compileProgram(client, clearProgramStr);
  const onComplete = algosdk.OnApplicationComplete.NoOpOC;
  const appArgs = [
    algosdk.encodeUint64(gasStationId),
    algosdk.decodeAddress(algosdk.getApplicationAddress(gasStationId)).publicKey
  ];

  const createAppTxn = algosdk.makeApplicationCreateTxn(
    creatorAccount.addr,
    params,
    onComplete,
    approvalProgram,
    clearProgram,
    localInts,
    localBytes,
    globalInts,
    globalBytes,
    appArgs,
  );
  // const createAppTxId = createAppTxn.txID().toString();
  const signedTxn = createAppTxn.signTxn(creatorAccount.sk);
  const sentTX = await client.sendRawTransaction(signedTxn).do();
  await waitForConfirmation(client, sentTX.txId);
  const ptx = await client.pendingTransactionInformation(sentTX.txId).do();
  const appId = ptx["application-index"];
  await algokit.ensureFunded(
    {
      accountToFund: algosdk.getApplicationAddress(appId),
      minSpendingBalance: algokit.algos(100),
    },
    client
  );
  return appId;
};

const create_nft = async(gasStationId: number, nftContractId: number,
  artistAccount = creatorAccount) => {
  const unitName = "test";
  const assetName = "test-asset";
  const assetURL = "http://testurl";
  const assetMetadataHash = "16efaa3924a6fd9d3a4824799a4ac65d";
  const price = algosdk.encodeUint64(1000);
  const isFractionalNft = algosdk.encodeUint64(0);
  const balanceForBoxCreated = 0;
  const appArgs = [
    textEncoder.encode(Buffer.from("create_nft").toString()),
    textEncoder.encode(Buffer.from(assetName).toString()),
    textEncoder.encode(Buffer.from(assetMetadataHash).toString()),
    textEncoder.encode(Buffer.from(assetURL).toString()),
    textEncoder.encode(Buffer.from(unitName).toString()),
    price,
    isFractionalNft,
    algosdk.decodeAddress(artistAccount.addr).publicKey
  ];
  const from = artistAccount.addr;
  const client = getClient();
  const params: SuggestedParamsWithMinFee = await client
    .getTransactionParams()
    .do();
  const txFundTxn = algosdk.makePaymentTxnWithSuggestedParams(
    artistAccount.addr,
    algosdk.getApplicationAddress(nftContractId),
    balanceForBoxCreated + 1000000,
    undefined,
    undefined,
    params
  );
  const foreignAccounts = undefined;
  const foreignAssetsArray = undefined;
  const { app } = await getAssetsForAddress(nftContractId, from);
  const foreignApps = [gasStationId];
  if (app != 0){
    foreignApps.push(app);
  }
  const strType = algosdk.ABIAddressType.from("address");
  const appCallTxn = algosdk.makeApplicationNoOpTxn(
    creatorAccount.addr,
    { ...params, fee: params.minFee },
    nftContractId,
    appArgs,
    foreignAccounts,
    foreignApps,
    foreignAssetsArray,
    undefined,
    undefined,
    undefined,
    [
      {
        appIndex: nftContractId,
        name: strType.encode(algosdk.getApplicationAddress(nftContractId)),
      },
      {
        appIndex: nftContractId,
        name: strType.encode(artistAccount.addr),
      },
      {
        appIndex: nftContractId,
        name: strType.encode(creatorAccount.addr),
      },
      {
        appIndex: nftContractId,
        name: strType.encode(artistAccount.addr),
      },
    ]
  );

  const atc = new algosdk.AtomicTransactionComposer();
  atc.addTransaction({
    txn: txFundTxn,
    signer: algosdk.makeBasicAccountTransactionSigner(artistAccount),
  });
  atc.addTransaction({
    txn: appCallTxn,
    signer: algosdk.makeBasicAccountTransactionSigner(creatorAccount),
  });

  const stxns = (await atc.gatherSignatures()).map((stxn) => stxn);
  const txTest = await client.sendRawTransaction(stxns).do();

  await waitForConfirmation(client, txTest.txId);
  await getAssetsForAddress(nftContractId, from);
};


const set_price = async (price: number, assetId: number, artistAppId:number,
  artistAccount = creatorAccount) => {
  // const assetIDBytes = uint64ToBigEndianByteArray(BigInt(assetId));
  const foreignAssetsArray = [assetId];
  const foreignApps = undefined;
  const from = artistAccount.addr;
  const client = getClient();
  const params: SuggestedParamsWithMinFee = await client
    .getTransactionParams()
    .do();
  const appArgs = [
    textEncoder.encode(Buffer.from("set_price").toString()),
    algosdk.encodeUint64(price),
    algosdk.encodeUint64(assetId)
  ];
  const appCallTxn = algosdk.makeApplicationNoOpTxn(
    from,
    { ...params, fee: params.minFee },
    artistAppId,
    appArgs,
    undefined,
    foreignApps,
    foreignAssetsArray,
    undefined,
    undefined,
    undefined,
    [
      {
        appIndex: artistAppId,
        name: algosdk.encodeUint64(assetId),
      },
    ]
  );

  const atc = new algosdk.AtomicTransactionComposer();
  atc.addTransaction({
    txn: appCallTxn,
    signer: algosdk.makeBasicAccountTransactionSigner(artistAccount),
  });
  const stxns = (await atc.gatherSignatures()).map((stxn) => stxn);
  const txTest = await client.sendRawTransaction(stxns).do();

  await waitForConfirmation(client, txTest.txId);
};


const readNftData = 
  async(appId: number, nftId: number): Promise<{nftId: number,
     price: number, owner: string}> =>{
    const boxName = algosdk.encodeUint64(nftId);
    const boxValue = await algokit.getAppBoxValue(
      appId,
      boxName,
      getClient()
    );
    const tupleCodec = new algosdk.ABITupleType([
      new algosdk.ABIUintType(64),
      new algosdk.ABIUintType(64),
      new algosdk.ABIAddressType(),
    ]);
    const decodedBoxValue: ABIValue[] = tupleCodec.decode(
      boxValue
    ) as ABIValue[];
    
    return{
      nftId: Number(decodedBoxValue[0]),
      price: Number(decodedBoxValue[1]),
      owner: decodedBoxValue[2] as string
    };
  };


const optContractIntoAssets = async (
  nftContractId: number
): Promise<void> => {
 
  const client = getClient();
  const clearProgramStr = fs
    .readFileSync(`${getAppRootDir()}/src/build/clear.teal`)
    .toString();
  const ESCROW_HUSK = fs
    .readFileSync(getAppRootDir() + "/src/build/artist.teal")
    .toString();
  const params: SuggestedParamsWithMinFee = await client
    .getTransactionParams()
    .do();
  const approvalProgram = await compileProgram(client, ESCROW_HUSK);

  const clearProgram = await compileProgram(client, clearProgramStr);
  const strType = algosdk.ABIAddressType.from("address");
  const appArgs = [
    textEncoder.encode(Buffer.from("assets_opt_in").toString()),
    approvalProgram,
    clearProgram,
  ];
  const from = creatorAccount.addr;
  const appCallTxn = algosdk.makeApplicationNoOpTxn(
    from,
    { ...params, fee: params.minFee },
    nftContractId,
    appArgs,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    [
      {
        appIndex: nftContractId,
        name: strType.encode(algosdk.getApplicationAddress(nftContractId)),
      },
    ]
  );

  const txTest = await client
    .sendRawTransaction(appCallTxn.signTxn(creatorAccount.sk))
    .do();

  await waitForConfirmation(client, txTest.txId);

};

const getAssetsForAddress = async (
  nftContractId: number,
  address: string = creatorAccount.addr
):Promise<{assets: 
  [{assetId?: number; isFractionalft?: boolean}?], app: number}> => {
  try {
    const client = getClient();
    const boxName = algosdk.decodeAddress(address).publicKey;
    const boxValue = await algokit.getAppBoxValue(
      nftContractId,
      boxName,
      client
    );
    const tupleCodec = new algosdk.ABITupleType([new algosdk.ABIUintType(64) ]);
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
    console.error(error);
    return { assets: [], app: 0 };
  }
};

const buy_nft = async (
  assetId: number,
  artistId: number,
  quantity: number,
  price: number,
  owner: string,
  buyer: algosdk.Account = creatorAccount
) => {
  const strType = algosdk.ABIAddressType.from("address");
  const client = getClient();
  const params: SuggestedParamsWithMinFee = await client
    .getTransactionParams()
    .do();
  const from = buyer.addr;
  const appArgs = [
    textEncoder.encode(Buffer.from("buy_nft").toString()),
    algosdk.decodeAddress(buyer.addr).publicKey,
    algosdk.encodeUint64(quantity),
    algosdk.encodeUint64(assetId),
  ];
  const txFundTxn = algosdk.makePaymentTxnWithSuggestedParams(
    from,
    algosdk.getApplicationAddress(artistId),
    price + 10000,
    undefined,
    undefined,
    params
  );
  const buyerByteArray = strType.encode(buyer.addr);
  const assetIdByteArray = algosdk.encodeUint64(assetId);
  const mergedArray = 
  new Uint8Array(buyerByteArray.length + assetIdByteArray.length);
  mergedArray.set(buyerByteArray);
  mergedArray.set(assetIdByteArray, buyerByteArray.length);
  const appCallTxn = algosdk.makeApplicationNoOpTxn(
    from,
    { ...params, fee: params.minFee },
    artistId,
    appArgs,
    [from, owner],
    undefined,
    [assetId],
    undefined,
    undefined,
    undefined,
    [
      {
        appIndex: artistId,
        name: algosdk.encodeUint64(assetId),
      },
      {
        appIndex: artistId,
        name: mergedArray,
      },
    ]
  );

  const atc = new algosdk.AtomicTransactionComposer();
  atc.addTransaction({
    txn: txFundTxn,
    signer: algosdk.makeBasicAccountTransactionSigner(buyer),
  });
  atc.addTransaction({
    txn: appCallTxn,
    signer: algosdk.makeBasicAccountTransactionSigner(buyer),
  });

  const stxns = (await atc.gatherSignatures()).map((stxn) => stxn);
  const txTest = await client.sendRawTransaction(stxns).do();

  await waitForConfirmation(client, txTest.txId);
};
const optAccountIntoAsset = async (
  assetIndex: number,
  creatorAcc: algosdk.Account = creatorAccount
): Promise<void> => {
  const from = creatorAcc.addr;
  const client = getClient();
  const params = await client.getTransactionParams().do();
  const assetSendTxn1 = algosdk.makeAssetTransferTxnWithSuggestedParams(
    from,
    from,
    undefined,
    undefined,
    0,
    undefined,
    assetIndex,
    params
  );
  const atc = new algosdk.AtomicTransactionComposer();
  atc.addTransaction({
    txn: assetSendTxn1,
    signer: algosdk.makeBasicAccountTransactionSigner(creatorAcc),
  });
  const stxns = (await atc.gatherSignatures()).map((stxn) => stxn);
  await client.sendRawTransaction(stxns).do();
};

const fundAccount = async(account: algosdk.Account, amount:number = 100 ) =>{
  await algokit.ensureFunded(
    {
      accountToFund: account.addr,
      minSpendingBalance: algokit.algos(amount),
    },
    getClient()
  );
};

const getBalance = async (
  address: string,
  assetId: number
): Promise<number> => {
  const client = getClient();
  const accountInfo = await client.accountInformation(address).do();
  const assets = accountInfo.assets;
  let assetBalance = 0;

  if (assetId === 0) {
    return accountInfo.amount;
  }

  assets.forEach((asset: Record<string, number>) => {
    if (asset["asset-id"] === assetId) {
      assetBalance = asset["amount"];
    }
  });

  return assetBalance;
};

const sellNft = async(appId: number,
  nftId: number, price: number,
  sellerAccount: algosdk.Account = creatorAccount) =>{
  const from = sellerAccount.addr;
  const client = getClient();
  const params = await client.getTransactionParams().do();
  const appArgs = [
    textEncoder.encode(Buffer.from("resell_nft").toString()),
    algosdk.encodeUint64(price)
    
  ];
  const assetSendTxn1 = algosdk.makeAssetTransferTxnWithSuggestedParams(
    from,
    algosdk.getApplicationAddress(appId),
    undefined,
    undefined,
    1,
    undefined,
    nftId,
    params
  );
  
  const appCallTxn = algosdk.makeApplicationNoOpTxn(
    from,
    { ...params, fee: params.minFee },
    appId,
    appArgs,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    [
      {
        appIndex: appId,
        name: algosdk.encodeUint64(nftId),
      },
    ]
  );

  const atc = new algosdk.AtomicTransactionComposer();
  atc.addTransaction({
    txn: assetSendTxn1,
    signer: algosdk.makeBasicAccountTransactionSigner(sellerAccount),
  });
  atc.addTransaction({
    txn: appCallTxn,
    signer: algosdk.makeBasicAccountTransactionSigner(sellerAccount),
  });
  const stxns = (await atc.gatherSignatures()).map((stxn) => stxn);
  await client.sendRawTransaction(stxns).do();
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

const getAssetsForApp = async(appId: number) =>{
  const appAddress = algosdk.getApplicationAddress(appId);
  const indexer = getIndexerClient();
  const accountAssetInfo = await indexer.lookupAccountAssets(appAddress).do();
  const assetsInfos =  await 
  Promise.all(accountAssetInfo.assets.map(async(asset: {"asset-id": number}) =>{
    try{
      const nftData = await readNftData(appId, asset["asset-id"]);
      return nftData;
    }catch(error){
      return undefined;
    }
  }));
  return assetsInfos.filter(el => el != undefined);
};

export {
  createGasStation,
  create_nft_contract,
  optContractIntoAssets,
  getAssetsForAddress,
  create_nft,
  set_price,
  buy_nft,
  optAccountIntoAsset,
  fundAccount,
  readNftData,
  getBalance,
  sellNft,
  getAllNfts,
  getAssetsForApp
};