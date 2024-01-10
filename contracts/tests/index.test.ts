import { create_nft_contract,
  createGasStation,
  optContractIntoAssets,
  create_nft,
  getAssetsForAddress,
  set_price,
  buy_nft,
  readNftData,
  optAccountIntoAsset,
  fundAccount,
  getBalance,
  sellNft,
} from "./test_helper";
import algosdk from "algosdk";

const TEST_TIMEOUT = 1000 * 120;

describe("tests", () =>{
  let gasStationId: number;
  let nftContractId: number;
  let globalTestAccount: algosdk.Account;
  let purchaserAccount: algosdk.Account;
  beforeAll(async() =>{
    gasStationId = await createGasStation();
    nftContractId = await create_nft_contract(gasStationId);
    await optContractIntoAssets(nftContractId);
    globalTestAccount = algosdk.generateAccount();
    purchaserAccount = algosdk.generateAccount();
    // await create_nft(gasStationId, nftContractId);
    // await create_nft(gasStationId, nftContractId);
    // await create_nft(gasStationId, nftContractId);
    // await create_nft(gasStationId, nftContractId);
    // const assetData = await getAssetsForAddress(nftContractId);

    // await optAccountIntoAsset(assetData.assets[0].assetId);
    // await buy_nft(assetData.assets[0].assetId, assetData.app, 4);
  }, TEST_TIMEOUT);

  test("cbcd", () =>{
    expect(1).toBe(1);
  });
  

  test("can create nft", async() =>{
    await fundAccount(globalTestAccount);
    await create_nft(gasStationId, nftContractId, globalTestAccount);
    //used to make sure program waits for indexer
    await fundAccount(globalTestAccount);
    const assetData = 
      await getAssetsForAddress(nftContractId, globalTestAccount.addr);
    expect(assetData.assets.length).toBeGreaterThan(0);
    await optAccountIntoAsset(assetData.assets![0]!.assetId as number,
      globalTestAccount);
  }, TEST_TIMEOUT);


  test ("can set nft price", async() =>{
    const assetData = await getAssetsForAddress(
      nftContractId,
      globalTestAccount.addr
    );
    const price = 121;
    await set_price(price, assetData.assets![0]!.assetId as number,
      assetData.app, globalTestAccount);
    
    const nftData = await readNftData(
      assetData.app,
      Number(assetData.assets![0]!.assetId),
    );
    expect(nftData.price).toBe(price);
  });

  test("nft can be purchased", async() =>{
    await fundAccount(purchaserAccount);
    const assetData = await getAssetsForAddress(
      nftContractId,
      globalTestAccount.addr
    );
    const nftData = await readNftData(
      assetData.app,
      Number(assetData.assets![0]!.assetId)
    );
    await optAccountIntoAsset(
        assetData.assets![0]!.assetId as number,
        purchaserAccount
    );
    await buy_nft(Number(assetData.assets![0]!.assetId), 
      assetData.app, 1, nftData.price, nftData.owner, purchaserAccount);

    const nftBalance = await getBalance(purchaserAccount.addr,
      Number(assetData.assets![0]!.assetId));
    expect(nftBalance).toBe(1);
  });

  test("Can put nft up for sale again", async() =>{
    const assetData = await getAssetsForAddress(
      nftContractId,
      globalTestAccount.addr
    );
    const nftData = await readNftData(
      assetData.app,
      Number(assetData.assets![0]!.assetId)
    );
    await sellNft(assetData.app, nftData.nftId, 123, purchaserAccount);
    const purchaserNftBalance = await getBalance(
      purchaserAccount.addr,
      Number(assetData.assets![0]!.assetId)
    );
    expect(purchaserNftBalance).toBe(0);

    const appAddress = algosdk.getApplicationAddress(assetData.app);
    expect(await getBalance(appAddress,
      Number(assetData.assets![0]!.assetId))).toBe(1);
  });
  //test asset that is resold can be bought again
  test("nft can be purchased again", async () => {
    const newPurchaserAccount = algosdk.generateAccount();
    await fundAccount(newPurchaserAccount);
    const assetData = await getAssetsForAddress(
      nftContractId,
      globalTestAccount.addr
    );
    const nftData = await readNftData(
      assetData.app,
      Number(assetData.assets![0]!.assetId)
    );
    await optAccountIntoAsset(
       assetData.assets![0]!.assetId as number,
       newPurchaserAccount
    );
    await buy_nft(
      Number(assetData.assets![0]!.assetId),
      assetData.app,
      1,
      nftData.price,
      nftData.owner,
      newPurchaserAccount
    );

    const nftBalance = await getBalance(
      newPurchaserAccount.addr,
      Number(assetData.assets![0]!.assetId)
    );
    expect(nftBalance).toBe(1);
  });
  

  test("Cannot purchase asset that does not have a price", async() =>{
    await create_nft(gasStationId, nftContractId, globalTestAccount);
    const assetData = 
      await getAssetsForAddress(nftContractId, globalTestAccount.addr);
    expect(assetData.assets.length).toBeGreaterThan(0);
    await optAccountIntoAsset(
      assetData.assets![assetData.assets!.length - 1 ]!.assetId as number,
      globalTestAccount
    );
    await expect(
      buy_nft(
        Number(assetData.assets![assetData.assets!.length - 1]!.assetId),
        assetData.app,
        1,
        1,
        globalTestAccount.addr,
        purchaserAccount
      )
    ).rejects.toThrow();
  });

});