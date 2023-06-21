import { HardhatUserConfig, task, types } from "hardhat/config";

const config: HardhatUserConfig = {
  defaultNetwork: "zkSyncTestnet",
  networks: {
    hardhat: {
      // @ts-ignore
      zksync: true,
    },
    zkSyncTestnet:
    {
      url: "http://localhost:3050",
      ethNetwork: "http://localhost:8545",
      zksync: true,
    },
  },
};

task("balance", "Prints an account's balance")
  .addParam("accountsFile", "The account list json file")
  .addOptionalParam("onlyFirst", "Get only the first N account balances", 10, types.int)
  .setAction(async (taskArgs, hre) => {
    const main_test = require("./test/main.ts");
    await main_test.default.getBalancesTask(hre, { src_account_file: taskArgs.accountsFile, nbalances: taskArgs.onlyFirst });
  });

task("split", "Split the provided list or privateKey wallet N times")
  .addOptionalParam("accountsFile", "The account list json file ", undefined, types.string)
  .addOptionalParam("account", "The account private key", undefined, types.string)
  .addOptionalParam("iterations", "Split iteration", undefined, types.int)
  .addParam("outputFile", "Output file to save new account list")
  .setAction(async (taskArgs, hre) => {
    const main_test = require("./test/main.ts");
    await main_test.default.splitAccountsTask(hre, {
      src_account_file: taskArgs.accountsFile,
      src_account_private_key: taskArgs.account,
      iterations: taskArgs.iterations,
      dst_account_file: taskArgs.outputFile
    });
    await main_test.default.getBalancesTask(hre, { src_account_file: taskArgs.outputFile, nbalances: 10 });
  });

task("bulkTx", "Split the provided list or privateKey wallet N times")
  .addParam("accountsFile", "The account list json file ", "", types.string)
  .addOptionalParam("transfers", "No. of transfers to send in bulk", 0, types.int)
  .addOptionalParam("iterations", "Bulk transfer test iterations", 1, types.int)
  .setAction(async (taskArgs, hre) => {
    const main_test = require("./test/main.ts");
    await main_test.default.bulkTransferTask(hre, {
      src_account_file: taskArgs.accountsFile,
      ntransfers: taskArgs.transfers,
      iterations: taskArgs.iterations,
    });
    await main_test.default.getBalancesTask(hre, { src_account_file: taskArgs.accountsFile, nbalances: 10 });
  });

export default config;
