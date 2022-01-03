import fs from "fs";
import dotenv from "dotenv";
import { task } from "hardhat/config";

task("unpause", "Unpause Marketplace functions")
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

    console.log(`\nPausing Marketplace at ${mp.address} ...\n`);
    await mp.unpause();
    console.log(`Done!`);
  });
