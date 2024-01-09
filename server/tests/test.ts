import {spec } from "pactum";
import app from "../src/index";
import algosdk  from "algosdk";
import { AddressInfo } from 'net';
import { fundAccount, getAssetsForAddress,
  waitForConfirmation, getClient, getIndexerClient } from "../src/utils/nftHelper";

const TEST_TIMEOUT = 10000 * 120;
jest.useFakeTimers();


describe("test create endpoints", () =>{
  let port: string; 
  const newAccount = algosdk.generateAccount();

  beforeAll(() => {
    const addressInfo = app.address() as string | AddressInfo;
    if (typeof addressInfo === "string") {
      port = `http://localhost:${typeof addressInfo}`;
    } else {
      port = `http://localhost:${addressInfo!.port}`;
    }
    console.log;
  });


  test("Cannot get create nft transaction with invalid data", async() =>{ 
    await fundAccount(newAccount);
    const getResult = await spec()
      .get(port + "/get-create")
      .withBody({
        artistAddress: newAccount.addr,
        unitName: "test",
        assetName: "test-asset",
        assetURL: "http://testurl",
        assetMetadataHash: "16efaa3924a6fd9d3a4824799a4ac65d",
        price: 1000,
        isFractionalNft: 0,
      }).expectStatus(403);
    expect(getResult.statusCode).toBe(403);
  }, TEST_TIMEOUT);


  test(
    "Can get create nft transaction with valid data",
    async () => {
      await fundAccount(newAccount);
      const getResult = await spec()
        .get(port + "/get-create")
        .withFile(__dirname + "/t_img.png")
        .withRequestTimeout(20000)
        .withMultiPartFormData({
          artistAddress: newAccount.addr,
          unitName: "test",
          assetName: "test-asset",
          assetURL: "http://testurl",
          assetMetadataHash: "16efaa3924a6fd9d3a4824799a4ac65d",
          price: 1000,
          isFractionalNft: 0,
        })
        .expectStatus(200);
      expect(getResult.statusCode).toBe(200);
    },
    TEST_TIMEOUT
  );



  test(
    "Can sign and send valid create txn gotten from server",
    async () => {
      console.log("second test");
      await fundAccount(newAccount);
      const getResult = await spec()
        .get(port + "/get-create")
        .withFile(__dirname + "/t_img.png")
        .withRequestTimeout(20000)
        .withMultiPartFormData({
          artistAddress: newAccount.addr,
          unitName: "test",
          assetName: "test-asset",
          assetURL: "http://testurl",
          assetMetadataHash: "16efaa3924a6fd9d3a4824799a4ac65d",
          price: 1000,
          isFractionalNft: 0,
        })
        .expectStatus(200);

      const algoSendTxn = algosdk.decodeUnsignedTransaction(
        Buffer.from(getResult.body.encodedTxns[0], "base64")
      );
      const signedAlgoSendTxn = Buffer.from(
        algoSendTxn.signTxn(newAccount.sk)
      ).toString("base64");
      console.log({ signedAlgoSendTxn });

      const sendResult = await spec()
        .post(port + "/send-create")
        .withBody({
          txns: [signedAlgoSendTxn, getResult.body.encodedTxns[1]],
        });
      expect(getResult.statusCode).toBe(200);
      expect(getResult.body.encodedTxns.length).toBe(2);
      expect(!!sendResult.body.txId).toBe(true);
      await waitForConfirmation(getClient(), sendResult.body.txId as string);
    },
    TEST_TIMEOUT
  );

  test("Can get and set price txn", async() => {
    let nftInfo = await getAssetsForAddress(
      Number(process.env.nftContractId), newAccount.addr);
    nftInfo = await getAssetsForAddress(
      Number(process.env.nftContractId),
      newAccount.addr
    );
    nftInfo = await getAssetsForAddress(
      Number(process.env.nftContractId),
      newAccount.addr
    );
    nftInfo = await getAssetsForAddress(
      Number(process.env.nftContractId),
      newAccount.addr
    );
    console.log({nftInfo});
    const result = await spec()
      .get(port + "/get-price")
      .withBody({
        appId: nftInfo.app,
        nftId: nftInfo.assets[0].assetId,
        seller: newAccount.addr,
        price: 1000
      });
    console.log({
      appId: nftInfo.app,
      assetId: nftInfo.assets[0].assetId,
      seller: newAccount.addr,
    });
    console.log(result.body);
    expect(result.body.error).toBeUndefined();
    expect(result.statusCode).toBe(200);
    const txn = algosdk.decodeUnsignedTransaction(
      Buffer.from(result.body.encodedTxn, "base64")
    );
    const appSendTxn = Buffer.from(
      txn.signTxn(newAccount.sk)
    ).toString("base64");
    const sendResult = await spec()
      .post(port + "/send-price")
      .withBody({
        txn: appSendTxn,
      })
      .withRequestTimeout(10000);
    
    expect(!!sendResult.body.txId).toBe(true);
  }, TEST_TIMEOUT);

  test("Can get all nfts", async() => {
    const result = await spec()
      .get(port + "/get-all-nfts")
      .withRequestTimeout(12000)
      .expectStatus(200);
    expect(result.body.nfts).toBeDefined();
  }, TEST_TIMEOUT);

  test("can get purchase transaction", async() => {
    const nftResult = await spec()
      .get(port + "/get-all-nfts")
      .withRequestTimeout(12000)
      .expectStatus(200);
    expect(nftResult.body.nfts).toBeDefined();
    // const firstAsset = nftResult.body.nfts[0];
    console.log(nftResult.body);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const nftToBuy = nftResult.body.nfts.reduce((previous, current) => {
      console.log({ current });
      if (current.artistAddress == newAccount.addr) {
        return current;
      }
      return previous;

    });
    console.log({nftToBuy});
    const result = await spec()
      .get(port + "/get-purchase")
      .withBody({
        appId: nftToBuy.assetsInfo.app,
        assetId: nftToBuy.assetsInfo.assets[0].assetId,
        quantity: 1,
        buyer: newAccount.addr,
      })
      .expectStatus(200);

    expect(result.body.assetBuyTxn).toBeDefined();
    expect(result.body.optInTxn).toBeDefined();
  }, TEST_TIMEOUT);



  test("can get sign and send purchase transaction", async () => {
    const nftResult = await spec()
      .get(port + "/get-all-nfts")
      .withRequestTimeout(12000)
      .expectStatus(200);
    const firstAsset = nftResult.body.nfts[0];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    console.log({ addr: newAccount.addr });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const nftToBuy = nftResult.body.nfts.reduce((previous, current) => {
      if (current.artistAddress == newAccount.addr) {
        return current;
      }
      return previous;
    });
    const result = await spec()
      .get(port + "/get-purchase")
      .withBody({
        appId: nftToBuy.assetsInfo.app,
        assetId: nftToBuy.assetsInfo.assets[0].assetId,
        quantity: 1,
        buyer: newAccount.addr,
      })
      .expectStatus(200);
    console.log({
      appId: firstAsset.appId,
      assetId: firstAsset.assetsInfo.assets[0].assetId,
      quantity: 1,
      buyer: newAccount.addr,
      appAddr: algosdk.getApplicationAddress(firstAsset.appId),
    });
    const indexer = getIndexerClient();
    console.log(
      await indexer
        .lookupAccountAssets(algosdk.getApplicationAddress(firstAsset.appId))
        .do()
    );
    const optInTxn = algosdk.decodeUnsignedTransaction(
      Buffer.from(result.body.optInTxn, "base64")
    );

    const algoSendTxn = algosdk.decodeUnsignedTransaction(
      Buffer.from(result.body.assetBuyTxn[0], "base64")
    );
    const appCallTxn = algosdk.decodeUnsignedTransaction(
      Buffer.from(result.body.assetBuyTxn[1], "base64")
    );
    const signedAlgoSendTxn = Buffer.from(
      algoSendTxn.signTxn(newAccount.sk)
    ).toString("base64");
    const signedAppCallTxn = Buffer.from(
      appCallTxn.signTxn(newAccount.sk)
    ).toString("base64");
    const signedOptInTxn = Buffer.from(
      optInTxn.signTxn(newAccount.sk)
    ).toString("base64");
    const sendResult = await spec()
      .post(port + "/send-purchase")
      .withBody({
        txns: [signedOptInTxn, signedAlgoSendTxn, signedAppCallTxn],
      });
    expect(sendResult.statusCode).toBe(200);
  }, TEST_TIMEOUT);

  test("can get resell transaction", async() => {
    const nftResult = await spec()
      .get(port + "/get-all-nfts")
      .withRequestTimeout(12000)
      .expectStatus(200);
    expect(nftResult.body.nfts).toBeDefined();
    // const firstAsset = nftResult.body.nfts[0];
    const nftToSell = nftResult.body.nfts.reduce((previous, current) => {
      if (current.artistAddress == newAccount.addr) {
        return current;
      }
      return previous;
    });
    const result = await spec()
      .get(port + "/get-sell")
      .withBody({
        appId: nftToSell.assetsInfo.app,
        nftId: nftToSell.assetsInfo.assets[0].assetId,
        price: 1000,
        seller: newAccount.addr,
      })
      .expectStatus(200);

    expect(result.body.encodedTxns).toBeDefined();
    expect(result.body.encodedTxns.length).toBe(2);
  }, TEST_TIMEOUT);


  test("can get resell and send transaction", async () => {
    const nftResult = await spec()
      .get(port + "/get-all-nfts")
      .withRequestTimeout(12000)
      .expectStatus(200);
    // const firstAsset = nftResult.body.nfts[0];
    const nftToSell = nftResult.body.nfts.reduce((previous, current) => {
      if (current.artistAddress == newAccount.addr) {
        return current;
      }
      return previous;
    });
    const result = await spec()
      .get(port + "/get-sell")
      .withBody({
        appId: nftToSell.assetsInfo.app,
        nftId: nftToSell.assetsInfo.assets[0].assetId,
        price: 1000,
        seller: newAccount.addr,
      })
      .expectStatus(200);
    const assetSendTxn1 = algosdk.decodeUnsignedTransaction(
      Buffer.from(result.body.encodedTxns[0], "base64")
    );
    const appCallTxn = algosdk.decodeUnsignedTransaction(
      Buffer.from(result.body.encodedTxns[1], "base64")
    );
    const signedAssetSendTxn = Buffer.from(
      assetSendTxn1.signTxn(newAccount.sk)
    ).toString("base64");
    const signedAppCallTxn = Buffer.from(
      appCallTxn.signTxn(newAccount.sk)
    ).toString("base64");
    const sendResult = await spec()
      .post(port + "/send-sell")
      .withBody({
        txns: [signedAssetSendTxn, signedAppCallTxn],
      });
    expect(sendResult.statusCode).toBe(200);
  }, TEST_TIMEOUT);

  afterAll(() =>{
    app.close();
  });
});