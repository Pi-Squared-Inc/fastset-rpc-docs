import { toHex } from "@mysten/bcs";
import {
    SET_TOKEN_ID,
    randomPrivateKey,
    getPublicKey,
    signTransaction,
    proxy_getAccountInfo,
    proxy_submitTransaction,
    proxy_faucetDrip,
} from "./fastset-types.ts";

const log = console.log;
const proxy = "https://proxy.fastset.xyz";

async function getNextNonce(proxy: string, address: Uint8Array): Promise<number> {
    // Fetching the next nonce to use in the transaction.
    // If the account is fresh, the next nonce will be 0
    let getAccountInfoRes = await proxy_getAccountInfo(proxy, address);
    return getAccountInfoRes.result.next_nonce;
}

async function getBalance(proxy: string, address: Uint8Array): Promise<number> {
    // Fetching the next nonce to use in the transaction.
    // If the account is fresh, the next nonce will be 0
    let getAccountInfoRes = await proxy_getAccountInfo(proxy, address);
    return getAccountInfoRes.result.balance;
}

// This example shows how to sign and submit a transaction to the FastSet network via the proxy.
// More information can be found in the docs folder.
//
// NOTE: when talking to validators, balances are encoded as hexadecimal numbers in JSON strings

////////////////////////////////////////////////////////////////////////////////////////////////////
// Generating keys for testing
////////////////////////////////////////////////////////////////////////////////////////////////////

const senderPrivKey = randomPrivateKey();
const senderPubKey = getPublicKey(senderPrivKey);

const recipientPrivKey = randomPrivateKey();
const recipientPubKey = getPublicKey(recipientPrivKey);

////////////////////////////////////////////////////////////////////////////////////////////////////
// Funding sender account from the faucet
////////////////////////////////////////////////////////////////////////////////////////////////////

const requestedAmt = 1000000000000000000n;
const faucetRes = await proxy_faucetDrip(proxy, senderPubKey, requestedAmt, null);
log(
    `Dripped amount ${requestedAmt} to account ${toHex(senderPubKey)}\nFaucet Drip RPC Response:`,
    faucetRes.result,
);
const acctBalance = await getBalance(proxy, senderPubKey);
log(`Account balance before transfer: ${acctBalance}`);

////////////////////////////////////////////////////////////////////////////////////////////////////
// Build and sign a transaction from sender
////////////////////////////////////////////////////////////////////////////////////////////////////

const nonce = await getNextNonce(proxy, senderPubKey);

const transaction = {
    sender: senderPubKey,
    recipient: recipientPubKey,
    nonce, // an incorrect nonce leads to an invalid txn
    timestamp_nanos: BigInt(Date.now()) * 1_000_000n, // current time in nanoseconds
    claim: {
        TokenTransfer: {
            token_id: SET_TOKEN_ID,
            amount: "ffff", // validators require the amount to be a hexadecimal string
            user_data: null, // optional
        },
    },
};

const signature = signTransaction(senderPrivKey, transaction);

////////////////////////////////////////////////////////////////////////////////////////////////////
// Submit Transaction
////////////////////////////////////////////////////////////////////////////////////////////////////
const proxySubmitTxRes = await proxy_submitTransaction(proxy, transaction, signature);
const proxyResult = proxySubmitTxRes.result;
log("proxy_submitTransaction RPC Result:", JSON.stringify(proxyResult));
const finalBalance = await getBalance(proxy, senderPubKey);
log(`Account balance after transfer: ${finalBalance}`);
