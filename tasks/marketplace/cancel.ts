import fs from "fs";
import { task } from "hardhat/config";
import dotenv from "dotenv";

task("cancel", "Cancelling item listing")
  .addParam("id", "The ID of the listing to cancel")
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

    console.log(`Delisting id=${taskArgs.id} ...`);
    await mp.cancel(taskArgs.id);
    console.log(`Done!`);
  });
