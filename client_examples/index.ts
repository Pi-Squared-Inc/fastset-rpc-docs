import {bcs, toHex} from "@mysten/bcs";
import * as ed from "@noble/ed25519";
import {sha512} from "@noble/hashes/sha2";

// This is a workaround to allow BigInt to be serialized as a number.
// https://stackoverflow.com/questions/75749980/typeerror-do-not-know-how-to-serialize-a-bigint

// @ts-ignore
BigInt.prototype.toJSON = function () {
    return Number(this);
};

// This example shows how to sign and submit a transaction to the FastSet network. 
// You will mainly interact with the JSON-RPC API of the validator or proxy.
// More information can be found in the docs folder.

////////////////////////////////////////////////////////////////////////////////////////////////////
// Type Definitions
////////////////////////////////////////////////////////////////////////////////////////////////////

// In order to sign a transaction, we need to construct the `Transaction` data type and serialize it
// using the BCS format. Typescript doesn't natively support such serialization. We will use the
// @mysten/bcs library for this. This section shows how to define BCS types in Typescript.

const Bytes32 = bcs.fixedArray(32, bcs.u8());
const Bytes64 = bcs.fixedArray(64, bcs.u8());
// FastSet uses Ed25519 public keys as addresses.
const TokenId   = Bytes32;
const PublicKey = Bytes32;
const Signature = Bytes64;

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

// A quorum is just a type pun for a u64
const Quorum = bcs.u64();

// token_id for the native token
// 0xFA575E7000000000000000000000000000000000000000000000000000000000
const SET_TOKEN_ID = (() => {
    var setTokenId = new Uint8Array(32);
    setTokenId.set([0xFA, 0x57, 0x5E, 0x70], 0);
    return setTokenId;
 })();

const TokenTransfer = bcs.struct("TokenTransfer", {
    token_id: TokenId, 
    amount: Amount,
    user_data: UserData,
});

// A "claim" is a concept on FastSet that drives state changes on the FastSet network. It is akin to
// the "calldata" of a transaction on Ethereum. There are many types of claims, but in this example,
// others are omitted since we are interested in the Transfer claim.
const ClaimType = bcs.enum("ClaimType", {
    TokenTransfer: TokenTransfer,
});

// The Transaction data type is the one that users sign over.
const Transaction = bcs.struct("Transaction", {
    sender: PublicKey,
    recipient: PublicKey,
    nonce: Nonce,
    timestamp_nanos: bcs.u128(),
    claim: ClaimType,
});

const SubmitTransactionResponse = bcs.struct("SubmitTransactionResponse", {
    validator: PublicKey,
    signature: Signature,
    next_nonce: Nonce,
    transaction_hash: bcs.byteVector(),
});

const MultiSigConfig = bcs.struct("MultiSigConfig", {
    authorized_signers: bcs.vector(PublicKey),
    quorum: Quorum,
    nonce: Nonce,
});

const MultiSig = bcs.struct("MultiSig", {
    config: MultiSigConfig,
    signatures: bcs.vector(bcs.tuple([PublicKey, Signature])),
});

const SignatureOrMultiSig = bcs.enum("SignatureOrMultiSig", {
    Signature: Signature,
    MultiSig: MultiSig,
});

const TransactionEnvelope = bcs.struct("TransactionEnvelope", {
    transaction: Transaction,
    signature: SignatureOrMultiSig,
});

const TransactionCertificate = bcs.struct("TransactionCertificate", {
    envelope: TransactionEnvelope,
    signatures: bcs.vector(bcs.tuple([PublicKey, Signature])),
});

const ProxySubmitTransactionResult = bcs.enum("ProxySubmitTransactionResult", {
    Success: TransactionCertificate,
    IncompleteVerifierSigs: bcs.tuple([]),
});

function parse_set_submitTransaction_response(res: Record<string, unknown>) {
    // to validate that the response has the required type, we serialize it using bcs
    // this will fail if the response has the wrong structure
    // we then bcs.parse, to massage the result's return type
    let bcs_bytes = SubmitTransactionResponse.serialize(res as any).toBytes();
    let bcs_value = SubmitTransactionResponse.parse(bcs_bytes);
    return bcs_value;
}

function parse_TransactionCertificate(res: Record<string, unknown>) {
    // see note above for why we do this
    let bcs_bytes = ProxySubmitTransactionResult.serialize(res as any).toBytes();
    let bcs_value = ProxySubmitTransactionResult.parse(bcs_bytes);
    return bcs_value;
}

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
console.log(`Successfully queried account info ${toHex(senderPubKey)} next nonce ${nonce}`);

////////////////////////////////////////////////////////////////////////////////////////////////////
// Funding the test account from the faucet
////////////////////////////////////////////////////////////////////////////////////////////////////

const requestedAmt = 100000;
const faucetRes = await requestProxy("set_proxy_faucetDrip", {
    recipient: senderPubKey,
    amount: requestedAmt.toString(),
});
checkError(faucetRes);
console.log(`Funded account ${toHex(senderPubKey)} balance ${requestedAmt}\nResponse was:`, faucetRes.result);

////////////////////////////////////////////////////////////////////////////////////////////////////
// Signing a transaction
////////////////////////////////////////////////////////////////////////////////////////////////////

// - Serializing a transaction ---------------------------------------------------------------------

const transaction = {
    sender: senderPubKey,
    recipient: recipientPubKey,
    nonce, // uses the nonce fetched from the account info request
    timestamp_nanos: BigInt(Date.now()) * 1_000_000n, // current time in nanoseconds
    claim: {
        TokenTransfer: {
            token_id: SET_TOKEN_ID,
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
const signature = makeSignature(dataToSign, senderPrivKey);

////////////////////////////////////////////////////////////////////////////////////////////////////
// Executing a transaction
////////////////////////////////////////////////////////////////////////////////////////////////////

// Transaction execution involves two steps:
//
// 1. Manually submit the transaction to the validator node
//    NOTE: This is sufficient because we only have a single validator currently
//          Otherwise, we would manually need to submit to each node
//
// 2. Perform steps 1+3 automatically using the proxy convenience method and obtain the resulting transaction certificate
//    NOTE: This method is more user-friendly than 1+3 as it automatically contacts all validators,
//          something that must be manually done using methods 1+3
//    NOTE: We must perform step 2 before 3; otherwise the account's nonce will be off by 1
//
// 3. Manually confirm the transaction by submitting a certificate to the validator node
//    NOTE: As mentioned in step 1, this code is only sufficient because we have a single validator
//          Otherwise, we would manually need to submit the certificate to each node

// - 1. Sending the transaction to a validator node ------------------------------------------------

const submitTxReq = {
    transaction,
    signature,
};

console.log(
    `Submitting transaction from ${toHex(transaction.sender)} to ${toHex(
        transaction.recipient,
    )} amount ${transaction.claim.TokenTransfer.amount}`,
);

const submitTxRes = await requestValidator("set_submitTransaction", submitTxReq);
checkError(submitTxRes);
const parsedSubmitTxRes = parse_set_submitTransaction_response(submitTxRes.result);
console.log(`Transaction ${toHex(submitTxRes.result.transaction_hash)} submitted! Response was:\n`, parsedSubmitTxRes);

// - 2. Sending the transaction to all validator node using the proxy ------------------------------
// NOTE: this implicitly performs steps 1 & 2 above

console.log(
    `Submitting transaction from ${toHex(transaction.sender)} to ${toHex(
        transaction.recipient,
    )} amount ${transaction.claim.TokenTransfer.amount}`,
);
const proxySubmitTxRes = await requestProxy("set_proxy_submitTransaction", submitTxReq);
checkError(proxySubmitTxRes);
const proxyCert = parse_TransactionCertificate(proxySubmitTxRes.result);
console.log('proxy_set_submitTransaction retrieved certificate was:', proxyCert);


// - 3. Confirming the transaction by submitting a certificate to the validator node ---------------

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

function makeSignature(dataToSign: Uint8Array, senderPrivKey: ed.Bytes) {
    return { Signature: ed.sign(dataToSign, senderPrivKey) }
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
    return await request("http://127.0.0.1:8765", method, params);
}

async function requestProxy(method: string, params: any): Promise<any> {
    return await request("http://127.0.0.1:44444", method, params);
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
