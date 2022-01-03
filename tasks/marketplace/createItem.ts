import fs from "fs";
import { task } from "hardhat/config";
import dotenv from "dotenv";

task("create", "Mints new NFT")
  .addParam("to", "The address to mint to")
  .addParam("uri", "The token URI")
  .addOptionalParam("mp", "The adddress of the Marketplace. By default grab it from .env")
  .setAction(async (taskArgs, hre) => {
    const network = hre.network.name;
    const envConfig = dotenv.parse(fs.readFileSync(`.env-${network}`));
    for (const parameter in envConfig) {
      process.env[parameter] = envConfig[parameter];
    }

    const mp = await hre.ethers.getContractAt(
      process.env.MARKETPLACE_NAME as string,
      taskArgs.mp || (process.env.MARKETPLACE_ADDRESS as string)
    );

    console.log(`Minting new item to ${taskArgs.to} ...`);
    await mp.listItem(taskArgs.to, taskArgs.uri);
    console.log(`Done!`);
  });
