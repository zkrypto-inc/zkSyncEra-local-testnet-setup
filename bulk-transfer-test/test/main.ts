
import * as fs from "fs";
import { Wallet, Provider, types } from 'zksync-web3';
import { ethers } from 'ethers';


type accountInfoType = {
    wallet: Wallet
    estBalance: ethers.BigNumber
}

type txParamsType = {
    from: accountInfoType,
    to: accountInfoType,
    amount: ethers.BigNumber,
    handle?: Promise<types.TransactionResponse>,
    receipt?: types.TransactionReceipt,
};

type txBlockSummaryType = {
    id: number,
    nTx: number,
};

type taskParams = {
    src_account_file?: string,
    src_account_private_key?: string,
    nbalances?: number,
    ntransfers?: number,
    iterations?: number,
    dst_account_file?: string,
};

const DEFAULT_N_BALANCE: number = 10;
const DEFAULT_N_ITERATIONS: number = 2;

async function getBalancesTask(hre: any, { src_account_file, src_account_private_key, nbalances }: taskParams) {

    let accounts: accountInfoType[] = [];
    const zkSyncProvider = new Provider(hre.network.config.url);
    const ethereumProvider = ethers.getDefaultProvider(hre.network.config.ethNetwork);

    if (src_account_file != undefined) {
        const jsonData = fs.readFileSync(src_account_file).toString();
        const acclist: string[] = JSON.parse(jsonData);
        acclist.map((privateKey) => accounts.push({ wallet: new Wallet(privateKey, zkSyncProvider, ethereumProvider), estBalance: ethers.BigNumber.from(0) }));
    } else if (src_account_private_key != undefined) {
        accounts.push({ wallet: new Wallet(src_account_private_key, zkSyncProvider, ethereumProvider), estBalance: ethers.BigNumber.from(0) });
    } else {
        throw ("Should provide either a wallet file or a private key");
    }

    const icnt = Math.min(accounts.length, (nbalances == undefined) ? DEFAULT_N_BALANCE : nbalances);

    console.log(`\n\tGet balances of ${(icnt == accounts.length) ? `all ${accounts.length}` : `first ${icnt} out of ${accounts.length}`} account(s) in file [${src_account_file}]\n`);

    for (var idx = 0; idx < icnt; idx++) {
        const { wallet } = accounts[idx];
        const balance = await zkSyncProvider.getBalance(wallet.address);
        console.log(`\t - got a balance of ${ethers.utils.formatEther(balance)} for address ${wallet.address} `)
    }

    console.log(`\n`);
}

async function splitAccountsTask(hre: any, { src_account_file, src_account_private_key, iterations, dst_account_file }: taskParams) {

    let accounts: accountInfoType[] = [];
    let new_accounts: string[] = [];
    let new_account_file: string;
    const zkSyncProvider = new Provider(hre.network.config.url);
    const ethereumProvider = ethers.getDefaultProvider(hre.network.config.ethNetwork);

    if (src_account_file != undefined) {
        const jsonData = fs.readFileSync(src_account_file).toString();
        const acclist: string[] = JSON.parse(jsonData);
        acclist.map((privateKey) => accounts.push({ wallet: new Wallet(privateKey, zkSyncProvider, ethereumProvider), estBalance: ethers.BigNumber.from(0) }));
        new_account_file = (dst_account_file == undefined) ? src_account_file : dst_account_file;
    } else if (src_account_private_key != undefined) {
        accounts.push({ wallet: new Wallet(src_account_private_key, zkSyncProvider, ethereumProvider), estBalance: ethers.BigNumber.from(0) });
        new_account_file = (dst_account_file == undefined) ? `split_wallet.json` : dst_account_file;
    } else {
        throw ("Should provide either a wallet file or a private key");
    }

    for (let i = 0; i < accounts.length; i++) {
        accounts[i].estBalance = await zkSyncProvider.getBalance(accounts[i].wallet.address);
    }

    const rounds: number = (iterations == undefined) ? DEFAULT_N_ITERATIONS : iterations;

    console.log(`\n\tSplit ${accounts.length} account(s) ${rounds} time(s) `);

    for (let round = 0; round < rounds; round++) {

        console.log(`\t - round ${round + 1} `);

        var tx_params: txParamsType[] = [];

        for (let i = 0; i < accounts.length; i++) {
            const from = accounts[i];
            const amount = from.estBalance.div(2);
            from.estBalance = from.estBalance.sub(amount);
            tx_params.push({
                from: from,
                to: { wallet: new Wallet(Wallet.createRandom().privateKey, zkSyncProvider, ethereumProvider), estBalance: amount },
                amount: amount,
            })
        }

        for (let i = 0; i < tx_params.length; i++) {

            const { from, to, amount } = tx_params[i];
            tx_params[i].handle = from.wallet.transfer({
                to: to.wallet.address,
                amount: amount,
            });
        }

        for (let i = 0; i < tx_params.length; i++) {
            const { to, handle } = tx_params[i];
            await (await (handle as Promise<types.TransactionResponse>)).waitFinalize();
            accounts.push(to);
        }
    }

    accounts.map((account) => new_accounts.push(account.wallet.privateKey));
    fs.writeFileSync(new_account_file, JSON.stringify(new_accounts, null, 2));
}


async function bulkTransferTask(hre: any, { src_account_file, ntransfers, iterations }: taskParams) {

    let accounts: accountInfoType[] = [];
    let all_tx_params: txParamsType[][] = [];
    let blockInfo: Map<number, txBlockSummaryType> = new Map();
    const zkSyncProvider = new Provider(hre.network.config.url);
    const ethereumProvider = ethers.getDefaultProvider(hre.network.config.ethNetwork);

    if (src_account_file != undefined) {
        const jsonData = fs.readFileSync(src_account_file).toString();
        const acclist: string[] = JSON.parse(jsonData);
        acclist.map((privateKey) => accounts.push({ wallet: new Wallet(privateKey, zkSyncProvider, ethereumProvider), estBalance: ethers.BigNumber.from(0) }));
    } else {
        throw ("Should provide either a wallet file or a private key");
    }

    for (let i = 0; i < accounts.length; i++) {
        accounts[i].estBalance = await zkSyncProvider.getBalance(accounts[i].wallet.address);
    }

    const rounds: number = (iterations == undefined) ? DEFAULT_N_ITERATIONS : iterations;

    const no_of_transfers = (ntransfers == undefined)
        ? Math.floor(accounts.length / 2)
        : Math.min(ntransfers, Math.floor(accounts.length / 2));

    console.log(`\n\tSend ${no_of_transfers} transfer(s) ${rounds} time(s) `)

    for (let i = 0; i < accounts.length; i++) {
        accounts[i].estBalance = await zkSyncProvider.getBalance(accounts[i].wallet.address);
    }

    for (let round = 0; round < rounds; round++) {

        // shuffle from/to wallets
        let acc_list_temp: (accountInfoType | undefined)[] = accounts;
        var transfer_from: accountInfoType | undefined;
        let tx_params: txParamsType[] = [];

        while (tx_params.length < no_of_transfers) {

            let selected_index = accounts.length;
            while (selected_index >= accounts.length) {
                selected_index = Math.floor(Math.random() * accounts.length * 2);
            }

            let selected_account = acc_list_temp[selected_index];

            if (selected_account != undefined) {

                if (transfer_from == undefined) {

                    transfer_from = selected_account;

                } else {

                    const amount = transfer_from.estBalance.div(10);
                    transfer_from.estBalance = transfer_from.estBalance.sub(amount);
                    selected_account.estBalance = selected_account.estBalance.add(amount);

                    tx_params.push({
                        from: transfer_from,
                        to: selected_account,
                        amount: amount,
                    })

                    transfer_from = undefined;
                }

                acc_list_temp[selected_index] = undefined;
            }
        }

        all_tx_params.push(tx_params);
    }

    for (let round = 0; round < rounds; round++) {

        console.log(`\t - round ${round + 1} `);
        const tx_params = all_tx_params[round];

        for (let i = 0; i < tx_params.length; i++) {
            const { from, to, amount } = tx_params[i];
            tx_params[i].handle = from.wallet.transfer({
                to: to.wallet.address,
                amount: amount,
            });
        }

        for (let i = 0; i < tx_params.length; i++) {
            const { handle } = tx_params[i];
            tx_params[i].receipt = await (await (handle as Promise<types.TransactionResponse>)).waitFinalize();
        }
    }

    for (let round = 0; round < rounds; round++) {
        const tx_params = all_tx_params[round];
        for (let i = 0; i < tx_params.length; i++) {
            const { receipt } = tx_params[i];
            const blockNumber = receipt?.blockNumber as number;
            let blk = blockInfo.get(blockNumber)
            if (blk != undefined) {
                blk.nTx++;
            } else {
                blockInfo.set(blockNumber, { id: blockNumber, nTx: 1 })
            }
        }
    }

    let firstblk: number = Number.MAX_VALUE;
    let lastblk: number = Number.MIN_VALUE;
    let low: number = Number.MAX_VALUE;
    let high: number = Number.MIN_VALUE;
    let avg: number = (rounds * no_of_transfers) / blockInfo.size;
    blockInfo.forEach((value) => {
        firstblk = Math.min(firstblk, value.id);
        lastblk = Math.max(lastblk, value.id);
        low = Math.min(low, value.nTx);
        high = Math.max(high, value.nTx);
    })

    console.log(`\n`);
    console.log(`\tTotal Transfers       : ${(rounds * no_of_transfers)}`);
    console.log(`\tNumber of Blocks      : ${blockInfo.size}`);
    console.log(`\tAverage Tx Per Block  : ${avg}  , (${low}/${high})`);
    console.log(`\tFirst/Last Block ID   : ${firstblk} / ${lastblk}`);
}

export default {
    getBalancesTask,
    splitAccountsTask,
    bulkTransferTask,
};