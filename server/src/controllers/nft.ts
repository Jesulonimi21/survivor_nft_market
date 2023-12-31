import { Request, Response } from "express";
import algosdk from "algosdk";
import { getAssetsForAddress, getClient } from "../utils/nftHelper";
import { SuggestedParamsWithMinFee } from "algosdk/dist/types/types/transactions/base";
import dotenv from "dotenv";

dotenv.config();
const textEncoder = new TextEncoder();
export const getCreate = async (req: Request, res: Response) => {
  try{
    const unitName = req.body.unitName;
    const assetName = req.body.assetName;
    const assetURL = req.body.assetURL;
    const assetMetadataHash = req.body.assetMetadataHash;
    const price = algosdk.encodeUint64(req.body.price);
    const isFractionalNft = algosdk.encodeUint64(req.body.isFractionalNft);
    const balanceForBoxCreated = 0;
    const artistAddress = req.body.artistAddress;
    const nftContractId = Number(process.env.nftContractId);
    const gasStationId = Number(process.env.gasStationId);
    const creatorAccount = algosdk.mnemonicToSecretKey(
      String(process.env.creator)
    );
    const appArgs = [
      textEncoder.encode(Buffer.from("create_nft").toString()),
      textEncoder.encode(Buffer.from(assetName).toString()),
      textEncoder.encode(Buffer.from(assetMetadataHash).toString()),
      textEncoder.encode(Buffer.from(assetURL).toString()),
      textEncoder.encode(Buffer.from(unitName).toString()),
      price,
      isFractionalNft,
      algosdk.decodeAddress(artistAddress).publicKey,
    ];
    const from = artistAddress;
    const client = getClient();
    const params: SuggestedParamsWithMinFee = await client
      .getTransactionParams()
      .do();
    const txFundTxn = algosdk.makePaymentTxnWithSuggestedParams(
      artistAddress,
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
    if (app != 0) {
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
          name: strType.encode(artistAddress),
        },
        {
          appIndex: nftContractId,
          name: strType.encode(creatorAccount.addr),
        },
        {
          appIndex: nftContractId,
          name: strType.encode(artistAddress),
        },
      ]
    );
    let txns = [txFundTxn, appCallTxn];
    const groupId = algosdk.computeGroupID(txns);
    txns = txns.map((el) => {
      el.group = groupId;
      return el;
    });

    const signedCreatorTxn = Buffer.from(
      txns[1].signTxn(creatorAccount.sk)
    ).toString("base64"); ;
    const encodedArtistTxn  = Buffer.from(algosdk.encodeUnsignedTransaction(txns[0])).toString(
        "base64"
      );

    res.status(200).json({ encodedTxns: [encodedArtistTxn, signedCreatorTxn] });
  }catch(error){
    console.log(error);
    res.status(400).json(error);
  }

};


export const sendCreate = async(req: Request, res: Response) => {
  try{
    const client = getClient();
    const encodedArtisTxn = req.body.txns[0];
    const signedCreatorTxn = req.body.txns[1];
    const signedTxns = [
      Buffer.from(encodedArtisTxn, "base64"),
      Buffer.from(signedCreatorTxn, "base64"),
    ];
    const txTest = await client.sendRawTransaction(signedTxns).do();
    res.status(200).json(txTest.txId);
  }catch(error){
    res.status(400).json(error);
  }
    
}; 
