import { bcs, toBase64, toHex } from "@mysten/bcs";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2";

// This is a workaround to allow BigInt to be serialized as a number.
// https://stackoverflow.com/questions/75749980/typeerror-do-not-know-how-to-serialize-a-bigint

// @ts-ignore
BigInt.prototype.toJSON = function () {
    return Number(this);
};

// This example shows how to sign and submit a transaction to the FastSet network. You will mainly
// interact with the validator's JSON-RPC API. More about the JSON-RPC API can be found in the
// [JSON-RPC documentation](/docs/json-rpc.md).

////////////////////////////////////////////////////////////////////////////////////////////////////
// Type Definitions
////////////////////////////////////////////////////////////////////////////////////////////////////

// In order to sign a transaction, we need to construct the `Transaction` data type and serialize it
// using the BCS format. Typescript doesn't natively support such serialization. We will use the
// @mysten/bcs library for this. This section shows how to define BCS types in Typescript.

const Bytes32 = bcs.fixedArray(32, bcs.u8());
// FastSet uses Ed25519 public keys as addresses.
const PublicKey = Bytes32;

// Account address on FastSet comes with two variants: External and FastSet.
// - The External variant indicates this address is owned by an external system or entity such as a
//   smart contract on another blockchain.
// - The FastSet variant indicates the address is native to FastSet. This is most likely the one you
//   are interested in.
const Address = bcs.enum("Address", {
    External: PublicKey,
    FastSet: PublicKey,
});

// Indicates an amount of any token
const Amount = bcs.u256().transform({
    // CAUTION: When we build a transaction object, we must use a hex encoded string because the
    // validator expects amounts to be in hex. However, bcs.u256() by default expects a decimal
    // string. Therefore, we must transform the input amount from hex to decimal here.
    input: (val) => hexToDecimal(val.toString()),
});
// Some additional data that can be associated with a transaction. Optional.
const UserData = bcs.option(Bytes32);

// The nonce on FastSet is similar to Ethereum's nonce.
const Nonce = bcs.u64();

const Transfer = bcs.struct("Transfer", {
    recipient: Address,
    amount: Amount,
    user_data: UserData,
});

// A "claim" is a concept on FastSet that drives state changes on the FastSet network. It is akin to
// the "calldata" of a transaction on Ethereum. There are many types of claims, but in this example,
// others are omitted since we are interested in the Transfer claim.
const ClaimType = bcs.enum("ClaimType", {
    Transfer: Transfer,
});

// The Transaction data type is the one that users sign over.
const Transaction = bcs.struct("Transaction", {
    sender: PublicKey,
    nonce: Nonce,
    timestamp_nanos: bcs.u128(),
    claim: ClaimType,
});

////////////////////////////////////////////////////////////////////////////////////////////////////
// Generating keys for testing
////////////////////////////////////////////////////////////////////////////////////////////////////

// The ed25519 library requires this configuration
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

const senderPrivKey = ed.utils.randomPrivateKey();
const senderPubKey = ed.getPublicKey(senderPrivKey);

const recipientPrivKey = ed.utils.randomPrivateKey();
const recipientPubKey = ed.getPublicKey(recipientPrivKey);

////////////////////////////////////////////////////////////////////////////////////////////////////
// Fetching the next nonce
////////////////////////////////////////////////////////////////////////////////////////////////////

async function getNextNonce(senderAddress: Uint8Array): Promise<number> {
    // Fetching the next nonce to use in the transaction.
    // If the account is fresh, the next nonce will be 0
    let nextNonce = 0;
    let getAccountInfoRes = await requestValidator("set_getAccountInfo", {
        // Note: Uint8Arrays need to be converted to regular arrays for JSON stringify
        address: senderAddress,
    });
    // A new account would not be known to the validator, so it will return an error.
    // In this case, we default to 0 as the next nonce. Otherwise, we use the next nonce from the
    // account info response.
    if (!getAccountInfoRes.error) {
        nextNonce = getAccountInfoRes.result.next_nonce;
    }

    return nextNonce;
}

const nonce = await getNextNonce(senderPubKey);
console.log(`Successfully queried account info ${toBase64(senderPubKey)} next nonce ${nonce}`);

////////////////////////////////////////////////////////////////////////////////////////////////////
// Funding the test account from the faucet
////////////////////////////////////////////////////////////////////////////////////////////////////

const faucetRes = await requestProxy("faucetDrip", {
    recipient: senderPubKey,
    amount: "1000000000000000000",
});
console.log(`Funded account ${toBase64(senderPubKey)} balance ${faucetRes.result.balance}`);

////////////////////////////////////////////////////////////////////////////////////////////////////
// Signing a transaction
////////////////////////////////////////////////////////////////////////////////////////////////////

// - Serializing a transaction ---------------------------------------------------------------------

const transaction = {
    sender: senderPubKey,
    nonce, // uses the nonce fetched from the account info request
    timestamp_nanos: BigInt(Date.now()) * 1_000_000n, // current time in nanoseconds
    claim: {
        Transfer: {
            recipient: { FastSet: recipientPubKey },
            amount: "ffff", // validators require the amount to be in hex.
            user_data: null, // optional
        },
    },
};
const msg = Transaction.serialize(transaction);
const msgBytes = msg.toBytes();

// - Signing the transaction -----------------------------------------------------------------------

// FastSet uses a prefix to identify the type of the message. For transactions, the prefix is always
// "Transaction::"
const prefix = new TextEncoder().encode("Transaction::");
// The data to sign is the prefix followed by the message (the serialized transaction)
const dataToSign = new Uint8Array(prefix.length + msgBytes.length);
dataToSign.set(prefix, 0);
dataToSign.set(msgBytes, prefix.length);
const signature = ed.sign(dataToSign, senderPrivKey);

////////////////////////////////////////////////////////////////////////////////////////////////////
// Executing a transaction
////////////////////////////////////////////////////////////////////////////////////////////////////

// Transaction execution involves two steps:
// 1. Submit the transaction to the validator node
// 2. Confirm the transaction by submitting a certificate to the validator node

// - 1. Sending the transaction to a validator node ------------------------------------------------

const submitTxReq = {
    transaction,
    signature,
};
console.log(
    `Submitting transaction from ${toHex(transaction.sender)} to ${toHex(
        transaction.claim.Transfer.recipient.FastSet,
    )} amount ${transaction.claim.Transfer.amount}`,
);
const submitTxRes = await requestValidator("set_submitTransaction", submitTxReq);
checkError(submitTxRes);
console.log(`Transaction ${toHex(submitTxRes.result.transaction_hash)} submitted!`);

// - 2. Confirming the transaction by submitting a certificate to the validator node ---------------

const submitCertReq = {
    transaction, // attach the same transaction object as above
    signature, // attach the same signature as above
    validator_signatures: [
        [
            submitTxRes.result.validator, // the address of the validator that signed the transaction
            submitTxRes.result.signature, // the signature from the validator
        ],
    ],
};
console.log("Submitting transaction certificate...");
const submitCertRes = await requestValidator("set_submitTransactionCertificate", submitCertReq);
checkError(submitCertRes);
console.log(`Transaction ${toHex(submitTxRes.result.transaction_hash)} finalized!`);

////////////////////////////////////////////////////////////////////////////////////////////////////
// Helpers
////////////////////////////////////////////////////////////////////////////////////////////////////

function buildJsonRpcRequest(id: number, method: string, params: any) {
    return {
        jsonrpc: "2.0",
        id,
        method,
        params,
    };
}

async function request(url: string, method: string, params: any): Promise<any> {
    const request = buildJsonRpcRequest(1, method, params);
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonSerialize(request),
    });
    const json = await response.json();
    return json;
}

async function requestValidator(method: string, params: any): Promise<any> {
    return await request("http://157.90.201.117:8765", method, params);
}

async function requestProxy(method: string, params: any): Promise<any> {
    return await request("http://136.243.61.168:44444", method, params);
}

function hexToDecimal(hex: string) {
    return BigInt(`0x${hex}`).toString();
}

function jsonSerialize(data: any) {
    return JSON.stringify(data, (k, v) => {
        if (v instanceof Uint8Array) {
            return Array.from(v);
        }
        return v;
    });
}

function checkError(res: any) {
    if (res.error) {
        console.error(res.error);
        process.exit(1);
    }
}
