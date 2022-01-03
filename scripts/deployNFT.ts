import fs from "fs";
import dotenv from "dotenv";
import hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const network = hre.network.name;
const envConfig = dotenv.parse(fs.readFileSync(`.env-${network}`));
for (const parameter in envConfig) {
  process.env[parameter] = envConfig[parameter];
}

// This script deploys only Essential Images contract
async function main() {
  const [owner]: SignerWithAddress[] = await hre.ethers.getSigners();
  console.log("Owner address: ", owner.address);

  const balance = await owner.getBalance();
  console.log(
    `Owner account balance: ${hre.ethers.utils.formatEther(balance).toString()}`
  );

  // Deploying nft
  const EssentialImages = await hre.ethers.getContractFactory(
    process.env.NFT_NAME as string
  );
  const ei = await EssentialImages.deploy(
    process.env.NFT_NAME_FULL as string,
    process.env.NFT_SYMBOL as string
  );
  await ei.deployed();
  console.log(`${process.env.NFT_NAME_FULL} deployed to ${ei.address}`);

  console.log("Done!");

  // Sync env file
  fs.appendFileSync(`.env-${network}`, `\r\# Deployed at \rNFT_ADDRESS=${ei.address}\r`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
