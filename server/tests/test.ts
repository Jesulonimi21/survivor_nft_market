// import axios from "axios"
import request from "supertest";
import app from "../src/index";
const TEST_TIMEOUT = 1000 * 120;
jest.useFakeTimers();


describe("test create endpoints", () =>{


  test("is tes", async() =>{
    const result =  await request(app).get(
      "/get-create").
      send(
        { 
          "artistAddress": "EMWPXNULSR3US737FFOSEJJB4B3R5BJQRYCVYPJSP7IUBRXUN3LF4MG2NA",
          "unitName": "test",
          "assetName": "test-asset",
          "assetURL": "http://testurl",
          "assetMetadataHash": "16efaa3924a6fd9d3a4824799a4ac65d",
          "price": 1000,
          "isFractionalNft": 0
        }).expect(200);
        
    expect(result.status).toBe(200);
    expect(result.body.encodedTxns.length).toBe(2);
    
  }, TEST_TIMEOUT);


afterAll(() =>{
    app.close();
})
});