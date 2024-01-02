require("esbuild-register");

// import { ed25519 as Signer } from "@ucanto/principal";
// import * as Client from "@web3-storage/w3up-client";
// import * as Delegation from "@ucanto/core/delegation";
import dotenv from "dotenv";
// import { CarReader } from "@ipld/car";

dotenv.config();
class IpfsHelper {
  client?;
  constructor() {}
  parseProof = async (data: string) => {
    const {CarReader} = await import("@ipld/car");
    const Delegation = await import("@ucanto/core/delegation");
    const blocks = [];
    const reader = await CarReader.fromBytes(Buffer.from(data, "base64"));
    for await (const block of reader.blocks()) {
      blocks.push(block);
    }
    return Delegation.importDAG(blocks);
  };

  initialize = async () => {
    console.log("before dynamic import");
    const {ed25519: Signer} = await import("@ucanto/principal");
    console.log("after 120.9.0 dynamic import");
    const Client = await import("@web3-storage/w3up-client");
    console.log("after q dynamic import");
    const principal = Signer.parse(process.env.AGENT_PRIVATE_KEY as string);
    this.client = await Client.create({ principal });
    // Add proof that this agent has been delegated capabilities on the space
    const proof = await this.parseProof(process.env.PROOF as string);
    const space = await this.client.addSpace(proof);
    await this.client.setCurrentSpace(space.did());
  };

  putFile = async (
    files: File[]
  ): Promise<{ data: string; isError: boolean; error?: unknown }> => {
    try {
      // const files = [
      //     new File([fs.readFileSync("./tests/t_img.png")], 'img.png'),
      //   ]

      const directoryCid = await this.client?.uploadDirectory(files);
      return {
        data: directoryCid!.toString(),
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

export default IpfsHelper;
