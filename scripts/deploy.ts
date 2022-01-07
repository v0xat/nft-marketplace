import fs from "fs";
import dotenv from "dotenv";
import hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const network = hre.network.name;
const envConfig = dotenv.parse(fs.readFileSync(`.env-${network}`));
for (const parameter in envConfig) {
  process.env[parameter] = envConfig[parameter];
}

// This script deploys ERC20 Token, Marketplace & NFT contracts
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

  // Deploying Marketplace & NFT
  const Marketplace = await hre.ethers.getContractFactory(
    process.env.MARKETPLACE_NAME as string
  );
  const mp = await Marketplace.deploy(
    token.address,
    process.env.NFT_NAME_FULL,
    process.env.NFT_SYMBOL
  );
  await mp.deployed();
  console.log(`${process.env.MARKETPLACE_NAME} deployed to ${mp.address}`);

  // Getting NFT contract address
  const nftAddrs = await mp.nft();
  console.log(`${process.env.NFT_NAME_FULL} deployed to ${nftAddrs}`);

  console.log("Done!");

  // Sync env file
  fs.appendFileSync(
    `.env-${network}`,
    `\r\# Deployed at \rTOKEN_ADDRESS=${token.address}\r
     \r\# Deployed at \rNFT_ADDRESS=${nftAddrs}\r
     \r\# Deployed at \rMARKETPLACE_ADDRESS=${mp.address}\r`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
