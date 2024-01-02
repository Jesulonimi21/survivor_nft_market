
const { ed25519: Signer } = require("@ucanto/principal");
const Client = require("@web3-storage/w3up-client");
const Delegation = require("@ucanto/core/delegation");
const dotenv = require("dotenv");
const { CarReader } = require("@ipld/car");

dotenv.config();

class IpfsHelper {
  constructor() {
    this.client = undefined;
  }

  parseProof = async (data) => {
    const blocks = [];
    const reader = await CarReader.fromBytes(Buffer.from(data, "base64"));
    for await (const block of reader.blocks()) {
      blocks.push(block);
    }
    return Delegation.importDAG(blocks);
  };

  initialize = async () => {
    const principal = Signer.parse(process.env.AGENT_PRIVATE_KEY);
    this.client = await Client.create({ principal });
    const proof = await this.parseProof(process.env.PROOF);
    const space = await this.client.addSpace(proof);
    await this.client.setCurrentSpace(space.did());
  };

  putFile = async (files) => {
    try {
      const directoryCid = await this.client.uploadDirectory(files);
      return {
        data: directoryCid.toString(),
        isError: false,
      };
    } catch (error) {
      return {
        data: "",
        isError: true,
        error,
      };
    }
  };
}

module.exports = IpfsHelper;
