import fs from "fs";
import { task } from "hardhat/config";
import dotenv from "dotenv";

task("list", "Prints an account's token balance")
  .addParam("id", "The ID of the item")
  .addParam("price", "The price of the item")
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

    const price = hre.ethers.utils.formatUnits(
      taskArgs.price,
      process.env.TOKEN_DECIMALS
    );

    console.log(`Listing item id=${taskArgs.id} with price ${taskArgs.price} tokens ...`);
    await mp.listItem(taskArgs.id, price);
    console.log(`Done!`);
  });
