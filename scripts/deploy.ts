import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import hre, { artifacts } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";

const network = hre.network.name;
const envConfig = dotenv.parse(fs.readFileSync(`.env-${network}`));
for (const parameter in envConfig) {
  process.env[parameter] = envConfig[parameter];
}

// This script deploys Marketplace, Bridge and all of assets contracts
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
    process.env.BIDDING_TIME,
    process.env.MIN_BIDDING_TIME,
    process.env.MAX_BIDDING_TIME,
    token.address,
    owner.address,
    process.env.NFT_NAME_FULL,
    process.env.NFT_SYMBOL,
    process.env.URI
  );
  await mp.deployed();
  console.log(`${process.env.MARKETPLACE_NAME} deployed to ${mp.address}`);

  // Getting nft assets addresses
  const addrs721 = await mp.acdm721();
  console.log(`${process.env.NFT_NAME_FULL} deployed to ${addrs721}`);
  const addrs1155 = await mp.acdm1155();
  console.log(`Academy 1155 deployed to ${addrs1155}`);

  console.log("Done!");

  // Sync env file
  fs.appendFileSync(
    `.env-${network}`,
    `\r# Deployed at \rTOKEN_ADDRESS=${token.address}\r
     \rNFT_721_ADDRESS=${addrs721}\r
     \rNFT_1155_ADDRESS=${addrs721}\r
     \rMARKETPLACE_ADDRESS=${mp.address}\r`
  );

  // Saving artifacts and address in /backend
  saveBackendFiles(mp);
}

const saveBackendFiles = (mp: Contract) => {
  const contractsDir = path.join(__dirname, "/../backend/src/contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    contractsDir + "/contract-address.json",
    JSON.stringify({ Marketplace: mp.address }, undefined, 2)
  );

  const Artifact = artifacts.readArtifactSync(process.env.MARKETPLACE_NAME as string);

  fs.writeFileSync(
    path.join(contractsDir, `/${process.env.MARKETPLACE_NAME}.json`),
    JSON.stringify(Artifact, null, 2)
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
