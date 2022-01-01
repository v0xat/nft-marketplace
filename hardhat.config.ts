import "dotenv/config";

import { HardhatUserConfig, NetworkUserConfig } from "hardhat/types";
import "hardhat-docgen";
import "hardhat-contract-sizer";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

import "./tasks/index.ts";

const chainIds = {
  mumbai: 80001,
  rinkeby: 4,
};

let mnemonic: string;
if (!process.env.MNEMONIC) {
  throw new Error("Please set your MNEMONIC in a .env file");
} else {
  mnemonic = process.env.MNEMONIC;
}

let alchemyApiKey: string;
if (!process.env.ALCHEMY_API_KEY) {
  throw new Error("Please set your ALCHEMY_API_KEY in a .env file");
} else {
  alchemyApiKey = process.env.ALCHEMY_API_KEY;
}

function createNetworkConfig(network: keyof typeof chainIds): NetworkUserConfig {
  const url: string = `https://polygon-${network}.g.alchemy.com/v2/${alchemyApiKey}`;
  return {
    accounts: {
      count: 2,
      mnemonic,
    },
    chainId: chainIds[network],
    url,
  };
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.10",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    mumbai: createNetworkConfig("mumbai"),
    rinkeby: createNetworkConfig("rinkeby"),
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY,
    // Use in future hardhat-etherscan version
    // apiKey: {
    //   mainnet: process.env.ETHERSCAN_API_KEY,
    //   ropsten: process.env.ETHERSCAN_API_KEY,
    //   rinkeby: process.env.ETHERSCAN_API_KEY,
    //   // polygon
    //   mumbai: process.env.POLYGONSCAN_API_KEY,
    // },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  docgen: {
    path: "./docs",
    runOnCompile: true,
  },
  contractSizer: {
    alphaSort: false,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: false,
  },
  gasReporter: {
    // enabled by default
    // enabled: process.env.GAS ? true : false,
    currency: "USD",
    token: "ETH",
    gasPriceApi: "https://api.etherscan.io/api?module=proxy&action=eth_gasPrice",
    coinmarketcap: process.env.CMC_API_KEY,
  },
};

export default config;
