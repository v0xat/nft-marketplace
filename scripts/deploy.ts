import fs from "fs";
import dotenv from "dotenv";
import hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { AcademyToken__factory, Marketplace__factory } from "../typechain-types";

const network = hre.network.name;
const envConfig = dotenv.parse(fs.readFileSync(`.env-${network}`));
for (const parameter in envConfig) {
  process.env[parameter] = envConfig[parameter];
}

// This script deploys Marketplace, and all assets contracts
async function main() {
  const [owner]: SignerWithAddress[] = await hre.ethers.getSigners();
  console.log("Owner address: ", owner.address);

  const balance = await owner.getBalance();
  console.log(
    `Owner account balance: ${hre.ethers.utils.formatEther(balance).toString()}`
  );

  // Deploying marketplace token
  const token = await new AcademyToken__factory(owner).deploy(
    process.env.TOKEN_NAME as string,
    process.env.TOKEN_SYMBOL as string
  );
  await token.deployed();
  console.log(`${process.env.TOKEN_NAME} deployed to ${token.address}`);

  // Deploying Marketplace and assets (721 and 1155)
  const market = await new Marketplace__factory(owner).deploy(
    process.env.BIDDING_TIME as string,
    process.env.MIN_BIDDING_TIME as string,
    process.env.MAX_BIDDING_TIME as string,
    token.address,
    owner.address,
    process.env.NFT_NAME as string,
    process.env.NFT_SYMBOL as string,
    process.env.URI_1155 as string
  );
  await market.deployed();
  console.log(`${process.env.MARKETPLACE_NAME} deployed to ${market.address}`);

  // Getting nft assets addresses
  const addrs721 = await market.acdm721();
  console.log(`${process.env.NFT_NAME} deployed to ${addrs721}`);
  const addrs1155 = await market.acdm1155();
  console.log(`Academy 1155 deployed to ${addrs1155}`);

  console.log("Done!");

  // Sync env file
  fs.appendFileSync(
    `.env-${network}`,
    `\r# Deployed at \rTOKEN_ADDRESS=${token.address}\r
     \rNFT_721_ADDRESS=${addrs721}\r
     \rNFT_1155_ADDRESS=${addrs1155}\r
     \rMARKETPLACE_ADDRESS=${market.address}\r`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
