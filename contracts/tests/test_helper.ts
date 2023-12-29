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
  console.log("cmp ar");
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

  const createAppTxId = createAppTxn.txID().toString();
  console.log(createAppTxId);
  const signedTxn = createAppTxn.signTxn(creatorAccount.sk);
  console.log("Signed transaction with txID: %s", createAppTxId);
  const sentTX = await client.sendRawTransaction(signedTxn).do();
  await waitForConfirmation(client, sentTX.txId);
  const ptx = await client.pendingTransactionInformation(sentTX.txId).do();
  const appId = ptx["application-index"];
  console.log("Gas station created");
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
  console.log("cmp ar", approvalProgram.length);
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
  const createAppTxId = createAppTxn.txID().toString();
  console.log(createAppTxId);
  const signedTxn = createAppTxn.signTxn(creatorAccount.sk);
  console.log("Signed transaction with txID: %s", createAppTxId);
  const sentTX = await client.sendRawTransaction(signedTxn).do();
  await waitForConfirmation(client, sentTX.txId);
  const ptx = await client.pendingTransactionInformation(sentTX.txId).do();
  const appId = ptx["application-index"];
  console.log("NFT contract created");
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
  const isFractionalNft = algosdk.encodeUint64(1);
  const balanceForBoxCreated = 0;
  const appArgs = [
    textEncoder.encode(Buffer.from("create_nft").toString()),
    textEncoder.encode(Buffer.from(assetName).toString()),
    textEncoder.encode(Buffer.from(assetMetadataHash).toString()),
    textEncoder.encode(Buffer.from(assetURL).toString()),
    textEncoder.encode(Buffer.from(unitName).toString()),
    price,
    isFractionalNft
  ];
  const from = artistAccount.addr;
  const client = getClient();
  const params: SuggestedParamsWithMinFee = await client
    .getTransactionParams()
    .do();
  const txFundTxn = algosdk.makePaymentTxnWithSuggestedParams(
    from,
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
    from,
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
    signer: algosdk.makeBasicAccountTransactionSigner(artistAccount),
  });

  const stxns = (await atc.gatherSignatures()).map((stxn) => stxn);
  const txTest = await client.sendRawTransaction(stxns).do();

  await waitForConfirmation(client, txTest.txId);
  console.log({ createNft: txTest });
  await getAssetsForAddress(nftContractId, from);
};


const set_price = async (assetId: number, artistAppId:number,
  artistAccount = creatorAccount) => {
  // const assetIDBytes = uint64ToBigEndianByteArray(BigInt(assetId));
  const foreignAssetsArray = [assetId];
  const foreignApps = undefined;
  const from = creatorAccount.addr;
  const client = getClient();
  const params: SuggestedParamsWithMinFee = await client
    .getTransactionParams()
    .do();
  const appArgs = [
    textEncoder.encode(Buffer.from("set_price").toString()),
    algosdk.encodeUint64(10000),
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
  console.log({ set_price: txTest });
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
  console.log({
    artistApprovalProgram: approvalProgram.length,
    artistClearProgram: clearProgram.length,
  });
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
  console.log({ assetsOptIn: txTest });
};

const getAssetsForAddress = async (
  nftContractId: number,
  address: string = creatorAccount.addr
) => {
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
    console.log(Number(decodedBoxValue[0]));

    const appAddress = algosdk.getApplicationAddress(
      Number(decodedBoxValue[0])
    );
    const indexer = getIndexerClient();
    console.log(appAddress);
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

const buy_nft = async (
  assetId: number,
  artistId: number,
  quantity: number,
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
    50000,
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
    undefined,
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
  console.log({ buynft: txTest });
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
  const txTest = await client.sendRawTransaction(stxns).do();

  console.log({ optAccountIntoAsset: txTest });
};


export { createGasStation, 
  create_nft_contract, 
  optContractIntoAssets, 
  getAssetsForAddress,
  create_nft, set_price,
  buy_nft, optAccountIntoAsset };