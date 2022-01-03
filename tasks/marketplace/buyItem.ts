import fs from "fs";
import { task } from "hardhat/config";
import dotenv from "dotenv";

task("buy", "Buy new item")
  .addParam("id", "The ID of the listing to buy")
  .addOptionalParam("mp", "The adddress of the Marketplace. By default grab it from .env")
  .setAction(async (taskArgs, hre) => {
    const network = hre.network.name;
    const envConfig = dotenv.parse(fs.readFileSync(`.env-${network}`));
    for (const parameter in envConfig) {
      process.env[parameter] = envConfig[parameter];
    }

    const mp = await hre.ethers.getContractAt(
      process.env.NFT_MARKETPLACE_NAME as string,
      taskArgs.mp || (process.env.NFT_MARKETPLACE_ADDRESS as string)
    );

    // Need to approve tokens here

    console.log(`Buying id=${taskArgs.id} ...`);
    await mp.buyItem(taskArgs.id);
    console.log(`Done!`);
  });
