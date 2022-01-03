import fs from "fs";
import dotenv from "dotenv";
import { task } from "hardhat/config";

task("mint", "Mint tokens on provided account")
  .addParam("amount", "The amount of tokens to mint")
  .addParam("to", "The address to mint on")
  .addOptionalParam("token", "Token contract address. By default grab it from .env")
  .setAction(async (taskArgs, hre) => {
    const network = hre.network.name;
    const envConfig = dotenv.parse(fs.readFileSync(`.env-${network}`));
    for (const parameter in envConfig) {
      process.env[parameter] = envConfig[parameter];
    }

    const token = await hre.ethers.getContractAt(
      process.env.TOKEN_NAME as string,
      taskArgs.token || (process.env.TOKEN_ADDRESS as string)
    );

    const amount = hre.ethers.utils.parseUnits(
      taskArgs.amount,
      process.env.TOKEN_DECIMALS
    );

    console.log(`\nMinting ${taskArgs.amount} tokens to ${taskArgs.to}...\n`);
    await token.mint(taskArgs.to, amount);
    console.log(`Done!`);
  });
