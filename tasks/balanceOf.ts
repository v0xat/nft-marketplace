import fs from "fs";
import { task } from "hardhat/config";
import dotenv from "dotenv";

task("token-balance", "Prints an account's token balance")
  .addParam("account", "The account's address")
  .setAction(async (taskArgs, hre) => {
    const network = hre.network.name;
    const envConfig = dotenv.parse(fs.readFileSync(`.env-${network}`));
    for (const parameter in envConfig) {
      process.env[parameter] = envConfig[parameter];
    }

    const token = await hre.ethers.getContractAt(
      process.env.TOKEN_NAME as string,
      process.env.TOKEN_ADDRESS as string
    );

    const balance = await token.balanceOf(taskArgs.account);
    const format = hre.ethers.utils.formatUnits(balance, process.env.TOKEN_DECIMALS);
    console.log(`${taskArgs.account} account balance is ${format} tokens`);
  });
