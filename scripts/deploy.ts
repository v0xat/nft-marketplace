import fs from "fs";
import dotenv from "dotenv";
import hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const network = hre.network.name;
const envConfig = dotenv.parse(fs.readFileSync(`.env-${network}`));
for (const parameter in envConfig) {
  process.env[parameter] = envConfig[parameter];
}

// This script deploys Token, NFT, Marketplace contracts
// and transfers NFT ownership to Marketplace
async function main() {
  const [owner]: SignerWithAddress[] = await hre.ethers.getSigners();
  console.log("Owner address: ", owner.address);

  const balance = await owner.getBalance();
  console.log(
    `Owner account balance: ${hre.ethers.utils.formatEther(balance).toString()}`
  );

  // Deploying token
  const AcademyToken = await hre.ethers.getContractFactory(
    process.env.TOKEN_NAME as string
  );
  const token = await AcademyToken.deploy(
    process.env.TOKEN_NAME_FULL as string,
    process.env.TOKEN_SYMBOL as string
  );
  await token.deployed();
  console.log(`${process.env.TOKEN_NAME_FULL} deployed to ${token.address}`);

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

  // Deploying marketplace
  const Marketplace = await hre.ethers.getContractFactory(
    process.env.MARKETPLACE_NAME as string
  );
  const mp = await Marketplace.deploy(token.address, ei.address);
  await mp.deployed();
  console.log(`${process.env.MARKETPLACE_NAME} deployed to ${mp.address}`);

  // Transfer NFT ownership to Marketplace
  await ei.initMarketplace(mp.address);
  console.log(
    `Transferred ${process.env.NFT_NAME_FULL} ownership to ${process.env.MARKETPLACE_NAME}`
  );

  console.log("Done!");

  // Sync env file
  fs.appendFileSync(
    `.env-${network}`,
    `\r\# Deployed at \rTOKEN_ADDRESS=${token.address}\r
     \r\# Deployed at \rNFT_ADDRESS=${ei.address}\r
     \r\# Deployed at \rMARKETPLACE_ADDRESS=${mp.address}\r`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
