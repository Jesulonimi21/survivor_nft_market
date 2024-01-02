/* tslint:disable */
// Your code goes here
// @ts-nocheck
// const Client = require('@web3-storage/w3up-client');
// const Signer = require('@ucanto/principal/ed25519');
// const Delegation = require('@ucanto/core/delegation');
// const CarReader = require('@ipld/car');
import { CarReader } from "@ipld/car";

import * as DID from "@ipld/dag-ucan/did";
import * as Delegation from "@ucanto/core/delegation";
import * as Signer from "@ucanto/principal/ed25519";
import * as Client from "@web3-storage/w3up-client";
import dotenv from "dotenv";
import { File } from "web3.storage";
import fs from "fs";
dotenv.config();
async function main() {
  // Load client with specific private key
  try{
    console.log(process.env.AGENT_PRIVATE_KEY)
    const principal = Signer.parse(process.env.AGENT_PRIVATE_KEY);
    const client = await Client.create({ principal });
    // Add proof that this agent has been delegated capabilities on the space
    const proof = await parseProof(process.env.PROOF);
    const space = await client.addSpace(proof);
    await client.setCurrentSpace(space.did());

    const files = [
      new File([fs.readFileSync("./tests/t_img.png")], 'img.png'),
    ]
     
    const directoryCid = await client.uploadDirectory(files)
    console.log(directoryCid);
    console.log({ client });
  }catch(err){
    console.error(err)
  }
  // bafybeidfn2aqzreupz4q5q6wo5dbtssjugab3iagy5chseecpsqxqkk5vm
  // READY to go!
}

/** @param {string} data Base64 encoded CAR file */
async function parseProof(data) {
  const blocks = [];
  const reader = await CarReader.fromBytes(Buffer.from(data, "base64"));
  for await (const block of reader.blocks()) {
    blocks.push(block);
  }
  return Delegation.importDAG(blocks);
}
(async () => {
  await main();
})();
