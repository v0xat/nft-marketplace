import "dotenv/config";
import express, { Application, Request, Response } from "express";
import { ethers } from "ethers";

import MainBridgeArtifact from "./contracts/MainBridge.json";
import SideBridgeArtifact from "./contracts/SideBridge.json";

const chainIds = {
  rinkeby: 4,
  ropsten: 3,
  kovan: 42,
  bscTestnet: 97,
};

const app: Application = express();
const port = 3000;

// Alchemy Rinkeby provider
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545/");

// Signer
const wallet = new ethers.Wallet(`0x${process.env.PRIVATE_KEY}`, provider);
const signer = wallet.connect(provider);

// Bridges
const mainBridge = new ethers.Contract(
  process.env.MAIN_BRIDGE_ADDRESS,
  MainBridgeArtifact.abi,
  signer
);

const sideBridge = new ethers.Contract(
  process.env.SIDE_BRIDGE_ADDRESS,
  SideBridgeArtifact.abi,
  signer
);

// Listening blocks
// provider.on("block", (blockNumber) => {
//   console.log(blockNumber);
// });
// const getBlock = async (blockNumber) => {
//   const block = await provider.getBlock(blockNumber);
//   console.log(block);
// };

console.log(`signer:  ${signer.address}`);
console.log(`mainBridge:  ${mainBridge.address}`);
console.log(`sideBridge:  ${sideBridge.address}`);

// Listening to SwapInitialized events
mainBridge.on(
  "SwapInitialized",
  async (swapId, item, tokenId, swapper, _chainFrom, _chainTo, to, event) => {
    const hashToSign = swapId;

    console.log(`Swap initialized, txHash:  ${event.transactionHash}`);
    console.log(`hashToSign:  ${hashToSign}`);
    console.log(`itemContract:  ${item}`);
    console.log(`tokenId:  ${tokenId}`);
    console.log(`swapper:  ${swapper}`);
    console.log(`_chainFrom:  ${_chainFrom}`);
    console.log(`_chainTo:  ${_chainTo}`);
    console.log(`to:  ${to}`);

    const testBytes = ethers.utils.arrayify(hashToSign);
    const messageHash = ethers.utils.hashMessage(testBytes);

    const signature = await signer.signMessage(testBytes);
    const recovered = ethers.utils.verifyMessage(testBytes, signature);

    console.log("Recovered:", recovered);
    const splitSig = ethers.utils.splitSignature(signature);

    await sideBridge.redeem(messageHash, splitSig);

    // Emitted when the transaction has been mined
    // provider.once(event.transactionHash, async () => {

    // });
  }
);

sideBridge.on("SwapRedeemed", async (hash, event) => {
  console.log(`Swap Redeemd, txHash:  ${event.transactionHash}`);
  console.log(`hash:  ${hash}`);
});

sideBridge.on(
  "SwapInitialized",
  async (swapId, item, tokenId, swapper, _chainFrom, _chainTo, to, event) => {
    const hashToSign = swapId;

    console.log(`Swap initialized, txHash:  ${event.transactionHash}`);
    console.log(`hashToSign:  ${hashToSign}`);
    console.log(`itemContract:  ${item}`);
    console.log(`tokenId:  ${tokenId}`);
    console.log(`swapper:  ${swapper}`);
    console.log(`_chainFrom:  ${_chainFrom}`);
    console.log(`_chainTo:  ${_chainTo}`);
    console.log(`to:  ${to}`);

    const testBytes = ethers.utils.arrayify(hashToSign);
    const messageHash = ethers.utils.hashMessage(testBytes);

    const signature = await signer.signMessage(testBytes);
    const recovered = ethers.utils.verifyMessage(testBytes, signature);

    console.log("Recovered:", recovered);
    const splitSig = ethers.utils.splitSignature(signature);

    await mainBridge.redeem(messageHash, splitSig);

    // Emitted when the transaction has been mined
    // provider.once(event.transactionHash, async () => {});
  }
);

// TODO
// get swap status by id
app.get(
  "/swap/status",
  async (req: Request, res: Response): Promise<Response> =>
    res.status(200).send({ message: "Hello World!" })
);

try {
  app.listen(port, () => {
    console.log(`Connected successfully on port ${port}`);
  });
} catch (error) {
  console.error(`Error occured: ${error.message}`);
}
