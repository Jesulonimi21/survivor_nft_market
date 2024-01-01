import algosdk from "algosdk";
import {getClient,
  compileProgram, waitForConfirmation } from "./src/utils/nftHelper";
import fs from "fs";
import * as algokit from "@algorandfoundation/algokit-utils";
import path from "path";
import { SuggestedParamsWithMinFee } 
  from "algosdk/dist/types/types/transactions/base";

const creatorAccount = algosdk.generateAccount();

const textEncoder = new TextEncoder();

const createGasStation = async () => {
  const approvalProgramStr = fs
    .readFileSync("../contracts/src/build/gas_station.teal")
    .toString();

  const clearProgramStr = fs
    .readFileSync("../contracts/src/build/clear.teal")
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

const create_nft_contract = async (gasStationId: number) => {
  const approvalProgramStr = fs
    .readFileSync("../contracts/src/build/index.teal")
    .toString();

  const clearProgramStr = fs
    .readFileSync("../contracts/src/build/clear.teal")
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
    algosdk.decodeAddress(algosdk.getApplicationAddress(gasStationId))
      .publicKey,
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
    appArgs
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
const writeToEnvFile = (data: string) => {
  const envFilePath = path.join(__dirname, ".env");

  fs.writeFileSync(envFilePath, data);
};
const optContractIntoAssets = async (nftContractId: number): Promise<void> => {
  const client = getClient();
  const clearProgramStr = fs
    .readFileSync("../contracts/src/build/clear.teal")
    .toString();
  const ESCROW_HUSK = fs
    .readFileSync( "../contracts/src//build/artist.teal")
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


(async() =>{
  const gasStationId = await createGasStation();
  const nftContractId = await create_nft_contract(gasStationId);
  await optContractIntoAssets(nftContractId);
  console.log({gasStationId, nftContractId});
  const stringToWrite = `creator=${algosdk.secretKeyToMnemonic(
    creatorAccount.sk
  )}
 nftContractId=${nftContractId}
 gasStationId=${gasStationId}
 `;
  writeToEnvFile(stringToWrite);
})();
