import { Request, Response } from "express";
import algosdk from "algosdk";
import {
  getAssetsForAddress,
  getClient,
  constructMetadataJsonFile,
  getAllNfts,
  getAssetsForApp
} from "../utils/nftHelper";
import { SuggestedParamsWithMinFee }
  from "algosdk/dist/types/types/transactions/base";
import dotenv from "dotenv";
import  IpfsHelper from "../utils/IpfsHelpers";
import { File } from "web3.storage";
import fs from "fs";

dotenv.config();
const textEncoder = new TextEncoder();
const strType = algosdk.ABIAddressType.from("address");


export const getCreate = async (req: Request, res: Response) => {
  try{
    const unitName = req.body.unitName;
    const assetName = req.body.assetName;
    // const assetURL = req.body.assetURL;
    const assetMetadataHash = req.body.assetMetadataHash;
    const price = algosdk.encodeUint64(parseInt(req.body.price));
    const isFractionalNft =
     algosdk.encodeUint64(parseInt(req.body.isFractionalNft));
    const balanceForBoxCreated = 0;
    const artistAddress = req.body.artistAddress;
    const nftContractId = Number(process.env.nftContractId);
    const gasStationId = Number(process.env.gasStationId);
    const creatorAccount = algosdk.mnemonicToSecretKey(
      String(process.env.creator)
    );
    const ipfs = new IpfsHelper();
    await ipfs.initialize();
    console.log(req.file.path);
    const {data} = await ipfs.putFile(
      [new File([fs.readFileSync((req.file?.path) as string)], "img.png")]
    );
    
    const metadataJson = constructMetadataJsonFile(
      0,
      `https://${data}.ipfs.w3s.link`,
      "will_be_added",
      "image/png"
    );
    const metadata = await ipfs.putFile([
      new File([JSON.stringify(metadataJson)], "metadata.json"),
    ]);
    await fs.promises.unlink(fs.readFileSync((req.file?.path) as string));
    const appArgs = [
      textEncoder.encode(Buffer.from("create_nft").toString()),
      textEncoder.encode(Buffer.from(assetName).toString()),
      textEncoder.encode(Buffer.from(assetMetadataHash).toString()),
      textEncoder.encode(Buffer.
        from(`https://${metadata.data}.ipfs.w3s.link`).toString()),
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
    ).toString("base64"); 
    const encodedArtistTxn = 
      Buffer.from(algosdk.encodeUnsignedTransaction(txns[0])).toString(
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
    console.log({txTest});
    res.status(200).json({txId: txTest.txId});
  }catch(error){
    console.log({error});
    res.status(400).json(error);
  }
}; 


export const getPurchase = async (req: Request, res: Response) => {
  try{
    const client = getClient();
    const params: SuggestedParamsWithMinFee = await client
      .getTransactionParams()
      .do();
    const appId = Number(req.body.appId);
    const assetId = Number(req.body.assetId);
    // const artistAddress = String(req.body.artistAddress);
    // const owner = String(req.body.owner);
    const quantity = Number(req.body.quantity);
    const buyerAddress = String(req.body.buyer);
    const appArgs = [
      textEncoder.encode(Buffer.from("buy_nft").toString()),
      algosdk.decodeAddress(buyerAddress).publicKey,
      algosdk.encodeUint64(quantity),
      algosdk.encodeUint64(assetId),
    ];

    const assetsData = await getAssetsForApp(
      appId,
    );
    const assetData = assetsData.find(el => el.nftId == assetId);
    if(assetData == undefined){
      throw "Asset id does not belong to this app";
    }
    const price = assetData.price;
    const owner = assetData.owner;
    //assert that the  asset id belongs to that app

    const txFundTxn = algosdk.makePaymentTxnWithSuggestedParams(
      buyerAddress,
      algosdk.getApplicationAddress(appId),
      (price * quantity) + 10000,
      undefined,
      undefined,
      params
    );
    const buyerByteArray = strType.encode(buyerAddress);
    const assetIdByteArray = algosdk.encodeUint64(assetId);
    const mergedArray = new Uint8Array(
      buyerByteArray.length + assetIdByteArray.length
    );
    mergedArray.set(buyerByteArray);
    mergedArray.set(assetIdByteArray, buyerByteArray.length);
    const appCallTxn = algosdk.makeApplicationNoOpTxn(
      buyerAddress,
      { ...params, fee: params.minFee },
      appId,
      appArgs,
      [buyerAddress, owner],
      undefined,
      [assetId],
      undefined,
      undefined,
      undefined,
      [
        {
          appIndex: appId,
          name: algosdk.encodeUint64(assetId),
        },
        {
          appIndex: appId,
          name: mergedArray,
        },
      ]
    );
    let txns = [txFundTxn, appCallTxn];
    const groupId = algosdk.computeGroupID(txns);
    txns = txns.map((el) => {
      el.group = groupId;
      return el;
    });
    const optInTxn = Buffer.from(
      algosdk. encodeUnsignedTransaction(
        algosdk.makeAssetTransferTxnWithSuggestedParams(
          buyerAddress,
          buyerAddress,
          undefined,
          undefined,
          0,
          undefined,
          assetId,
          params
        ))
    ).toString("base64");

  
    const encodedBuyerTxn =  txns.map(txn =>Buffer.from(
      algosdk.encodeUnsignedTransaction(txn)
    ).toString("base64"));

    res.status(200).json({ assetBuyTxn: encodedBuyerTxn, optInTxn });

  }catch(error){
    console.error(error);
    res.status(400).json(error);
  }
};

export const sendPurchase = async(req: Request, res: Response) => {
  try{
    const client = getClient();
    const optInTxn = Buffer.from(req.body.txns[0], "base64");
    const txFundTxn = Buffer.from(req.body.txns[1], "base64");
    const appCallTxn = Buffer.from(req.body.txns[2], "base64");
    const signedTxns = [
      txFundTxn,
      appCallTxn
    ];
    await client.sendRawTransaction(optInTxn).do();
    const txTest = await client.sendRawTransaction(signedTxns).do();
    console.log({txTest});
    res.status(200).json({txId: txTest.txId});
  }catch(error){
    console.log({error});
    res.status(400).json(error);
  }
};


export const getNfts = async(req: Request, res: Response) =>{
  try{
    const appId = Number(req.body.appId);
    const nfts = await getAllNfts(appId, "begin");
    res.status(200).json(nfts);
  }catch(error){
    res.status(400).json(error);
  }
};


export const getResell = async(req: Request, res: Response) =>{
  try {
    const from = req.body.seller;
    const price = Number(req.body.price);
    const nftId = Number(req.body.nftId);
    const appId = Number(req.body.appId);
    const client = getClient();
    const params = await client.getTransactionParams().do();
    const appArgs = [
      textEncoder.encode(Buffer.from("resell_nft").toString()),
      algosdk.encodeUint64(price),
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

    let txns = [assetSendTxn1, appCallTxn];
    const groupId = algosdk.computeGroupID(txns);
    txns = txns.map((el) => {
      el.group = groupId;
      return el;
    });


    const encodedTxns = txns.map((el) =>
      Buffer.from(algosdk.encodeUnsignedTransaction(el)).toString("base64")
    );
    res.status(200).json({ encodedTxns });
  } catch (error) {
    res.status(400).json(error);
  }
};


export const sendSell = async (req: Request, res: Response) => {
  try {
    const client = getClient();
    const assetSend = Buffer.from(req.body.txns[0], "base64");
    const appCallTxn = Buffer.from(req.body.txns[1], "base64");
    const signedTxns = [assetSend, appCallTxn];
    const txTest = await client.sendRawTransaction(signedTxns).do();
    console.log({ txTest });
    res.status(200).json({ txId: txTest.txId });
  } catch (error) {
    console.log({ error });
    res.status(400).json(error);
  }
};