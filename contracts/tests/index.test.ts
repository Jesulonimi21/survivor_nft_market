import { create_nft_contract,
  createGasStation,
  optContractIntoAssets,
  create_nft,
  getAssetsForAddress,
  set_price,
  buy_nft,
  optAccountIntoAsset
} from "./test_helper";

const TEST_TIMEOUT = 1000 * 120;

describe("tests", () =>{
  
  beforeAll(async() =>{
    const gasStationId = await createGasStation();
    const nftContractId = await create_nft_contract(gasStationId);
    await optContractIntoAssets(nftContractId);
    console.log({nftContractId});
    await create_nft(gasStationId, nftContractId);
    await create_nft(gasStationId, nftContractId);
    await create_nft(gasStationId, nftContractId);
    await create_nft(gasStationId, nftContractId);
    const assetData = await getAssetsForAddress(nftContractId);
    await set_price(assetData.assets[0].assetId, assetData.app);
    await optAccountIntoAsset(assetData.assets[0].assetId);
    await buy_nft(assetData.assets[0].assetId, assetData.app, 4);
  }, TEST_TIMEOUT);

  test("cbcd", () =>{
    expect(1).toBe(1);
  });
  
});