import fs from "fs";
import dotenv from "dotenv";
import hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const network = hre.network.name;
const envConfig = dotenv.parse(fs.readFileSync(`.env-${network}`));
for (const parameter in envConfig) {
  process.env[parameter] = envConfig[parameter];
}

// This script deploys only the Marketplace contract by
// getting the latest NFT and Token addresses from the .env
async function main() {
  const [owner]: SignerWithAddress[] = await hre.ethers.getSigners();
  console.log("Owner address: ", owner.address);

  const balance = await owner.getBalance();
  console.log(
    `Owner account balance: ${hre.ethers.utils.formatEther(balance).toString()}`
  );

  // Deploying marketplace
  const Marketplace = await hre.ethers.getContractFactory(
    process.env.MARKETPLACE_NAME as string
  );
  const mp = await Marketplace.deploy(process.env.TOKEN_ADDRESS, process.env.NFT_ADDRESS);
  await mp.deployed();
  console.log(`${process.env.MARKETPLACE_NAME} deployed to ${mp.address}`);

  console.log("Done!");

  // Sync env file
  fs.appendFileSync(
    `.env-${network}`,
    `\r\# Deployed at \rMARKETPLACE_ADDRESS=${mp.address}\r`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
