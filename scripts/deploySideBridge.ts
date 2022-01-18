import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import hre, { artifacts } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const network = hre.network.name;
const envConfig = dotenv.parse(fs.readFileSync(`.env-${network}`));
for (const parameter in envConfig) {
  process.env[parameter] = envConfig[parameter];
}

async function main() {
  const [owner]: SignerWithAddress[] = await hre.ethers.getSigners();
  console.log("Owner address: ", owner.address);

  const balance = await owner.getBalance();
  console.log(
    `Owner account balance: ${hre.ethers.utils.formatEther(balance).toString()}`
  );

  const Sideridge = await hre.ethers.getContractFactory(
    process.env.BRIDGE_NAME as string
  );
  const bridge = await Sideridge.deploy(
    process.env.BRIDGE_NAME,
    process.env.BRIDGE_VERSION,
    process.env.NFT_721_ADDRESS,
    process.env.NFT_721_ADDRESS_ETH,
    "0x9c5042b7eB6057f2C9Fa58c82Af330173bc42b35"
  );

  console.log(`${process.env.BRIDGE_NAME} deployed to ${bridge.address}`);

  console.log("Done!");

  // Sync env file
  fs.appendFileSync(
    `.env-${network}`,
    `\r# Deployed at \rSIDE_BRIDGE_ADDRESS=${bridge.address}\r`
  );

  // Saving artifacts and address in /backend
  saveBackendFiles(bridge.address);
}

const saveBackendFiles = (bridgeAddrs: string) => {
  const contractsDir = path.join(__dirname, "/../backend/src/contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  // Sync backend env file
  fs.appendFileSync(
    path.join(__dirname, "/../backend/.env"),
    `\r# Deployed at \rSIDE_BRIDGE_ADDRESS=${bridgeAddrs}\r`
  );

  const Artifact = artifacts.readArtifactSync(process.env.BRIDGE_NAME as string);

  fs.writeFileSync(
    path.join(contractsDir, `/${process.env.BRIDGE_NAME}.json`),
    JSON.stringify(Artifact, null, 2)
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
