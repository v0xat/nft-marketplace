import { network } from "hardhat";

const take = async (): Promise<any> => {
  return await network.provider.request({
    method: "evm_snapshot",
    params: [],
  });
};

const restore = async (id: string) => {
  await network.provider.request({
    method: "evm_revert",
    params: [id],
  });
};

export { take, restore };
