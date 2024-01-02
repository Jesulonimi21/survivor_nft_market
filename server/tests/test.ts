import { spec } from "pactum";
import app from "../src/index";
import algosdk  from "algosdk";
import { AddressInfo } from 'net';
import { fundAccount } from "../src/utils/nftHelper";
import fs from "fs";

const TEST_TIMEOUT = 1000 * 120;
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



  // test("Can get create nft transaction", async() =>{ 
  //   await fundAccount(newAccount);
  //   const getResult = await spec()
  //     .get(port + "/get-create")
  //     .withBody({
  //       artistAddress: newAccount.addr,
  //       unitName: "test",
  //       assetName: "test-asset",
  //       assetURL: "http://testurl",
  //       assetMetadataHash: "16efaa3924a6fd9d3a4824799a4ac65d",
  //       price: 1000,
  //       isFractionalNft: 0,
  //     }).expectStatus(200);
  //   expect(getResult.statusCode).toBe(200);
  //   expect(getResult.body.encodedTxns.length).toBe(2); 
  // }, TEST_TIMEOUT);



  test(
    "Can sign and send valid create txn gotten from server",
    async () => {
      await fundAccount(newAccount);
      const getResult = await spec()
        .get(port + "/get-create")
        // .withBody({
        //   artistAddress: newAccount.addr,
        //   unitName: "test",
        //   assetName: "test-asset",
        //   assetURL: "http://testurl",
        //   assetMetadataHash: "16efaa3924a6fd9d3a4824799a4ac65d",
        //   price: 1000,
        //   isFractionalNft: 0,
        // })
        .withFile(__dirname + "/t_img.png")
        .withRequestTimeout(12000)
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
    },
    TEST_TIMEOUT
  );


  afterAll(() =>{
    app.close();
  });
});