import { bcs, BcsType, type InferBcsInput } from "@mysten/bcs";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2";
import * as util from "util";

export {
    SET_TOKEN_ID,
    randomPrivateKey,
    getPublicKey,
    signTransaction,
    proxy_getAccountInfo,
    proxy_submitTransaction,
    proxy_faucetDrip,
};

////////////////////////////////////////////////////////////////////////////////////////////////////
// Type Definitions
////////////////////////////////////////////////////////////////////////////////////////////////////

// In order to sign a transaction, we need to construct the `Transaction` data type and serialize it
// using the BCS format. Typescript doesn't natively support such serialization. We will use the
// @mysten/bcs library for this. This section shows how to define BCS types in Typescript.

const Bytes32 = bcs.bytes(32);
const Bytes64 = bcs.bytes(64);

// The nonce on FastSet is similar to Ethereum's nonce
const NonceBcs = bcs.u64();
const OptionalNonceBcs = bcs.option(NonceBcs);
type Nonce = InferBcsInput<typeof NonceBcs>;
type OptionalNonce = InferBcsInput<typeof OptionalNonceBcs>;

// Represents the size of a quorum of validators or verifiers
const Quorum = bcs.u64();

// FastSet uses Ed25519 public keys for addressing and signatures
const AddressBcs = Bytes32;
const Signature = Bytes64;
const NamedSignersBcs = bcs.vector(bcs.tuple([AddressBcs, Signature]));
const MultiSigConfig = bcs.struct("MultiSigConfig", {
    authorized_signers: bcs.vector(AddressBcs),
    quorum: Quorum,
    nonce: NonceBcs,
});
const MultiSig = bcs.struct("MultiSig", {
    config: MultiSigConfig,
    signatures: NamedSignersBcs,
});
const SignatureOrMultiSigBcs = bcs.enum("SignatureOrMultiSig", {
    Signature: Signature,
    MultiSig: MultiSig,
});
type Address = Uint8Array;
type NamedSigners = InferBcsInput<typeof NamedSignersBcs>;
type SignatureOrMultiSig = InferBcsInput<typeof SignatureOrMultiSigBcs>;

// FastSet Token IDs are hashes of the token transaction that created this token
const TokenId = Bytes32;
const OptionalTokenBcs = bcs.option(Bytes32);
const OptionalTokenListBcs = bcs.option(bcs.vector(TokenId));
type OptionalToken = InferBcsInput<typeof OptionalTokenBcs>;
type OptionalTokenList = InferBcsInput<typeof OptionalTokenListBcs>;

// The javascript value that corresponds to the token ID for the native SET token
// 0xFA575E7000000000000000000000000000000000000000000000000000000000
const SET_TOKEN_ID = (() => {
    var setTokenId = new Uint8Array(32);
    setTokenId.set([0xfa, 0x57, 0x5e, 0x70], 0);
    return setTokenId;
})();

// FastSet states are arbitrary 32 byte strings
const State = Bytes32;

// Represents the amount that can be transferred in a single transaction (upto 2**256 - 1)
const AmountBcs = bcs.u256().transform({
    // CAUTION: When we build a transaction object, we must use a hex encoded string because the
    // validator expects amounts to be in hex. However, bcs.u256() by default expects a decimal
    // string. Therefore, we must transform the input amount from hex to decimal here.
    input: (val) => hexToDecimal(val.toString()),
});
type Amount = InferBcsInput<typeof AmountBcs>;

// Balance of an account (can temporarily be negative)
const Balance = bcs.string();

// Optional data that can be attached to a transaction
const UserData = bcs.option(Bytes32);

// ====================================================
// We now define the set of basic claims and operations
// ====================================================

const TokenTransfer = bcs.struct("TokenTransfer", {
    token_id: TokenId,
    amount: AmountBcs,
    user_data: UserData,
});

// ============================
// We now define the claim type
// ============================

// A "claim" is a concept on FastSet that drives state changes on the FastSet network. It is akin to
// the "calldata" of a transaction on Ethereum. There are many types of claims, but in this example,
// others are omitted since we are interested in the Transfer claim.
const ClaimType = bcs.enum("ClaimType", {
    TokenTransfer: TokenTransfer,
});

// =======================================================
// We now define transactions, envelopes, and certificates
// =======================================================

const TransactionBcs = bcs.struct("Transaction", {
    sender: AddressBcs,
    recipient: AddressBcs,
    nonce: NonceBcs,
    timestamp_nanos: bcs.u128(),
    claim: ClaimType,
});
type Transaction = InferBcsInput<typeof TransactionBcs>;

const TransactionEnvelope = bcs.struct("TransactionEnvelope", {
    transaction: TransactionBcs,
    signature: SignatureOrMultiSigBcs,
});

const TransactionCertificateBcs = bcs.struct("TransactionCertificate", {
    envelope: TransactionEnvelope,
    signatures: NamedSignersBcs,
});
type TransactionCertificate = InferBcsInput<typeof TransactionCertificateBcs>;

// ==========================================
// We now define RPC-level message validators
// ==========================================

const ProxySubmitTransactionResult = bcs.enum("ProxySubmitTransactionResult", {
    Success: TransactionCertificateBcs,
});

////////////////////////////////////////////////////////////////////////////////////////////////////
// Proxy RPC Wrappers
////////////////////////////////////////////////////////////////////////////////////////////////////

async function proxy_getAccountInfo(url: string, address: Address): Promise<any> {
    const response = await request(url, "proxy_getAccountInfo", {
        address,
        token_balance_filter: null,
        certificate_by_nonce: null,
    });
    return response;
}

async function proxy_submitTransaction(
    url: string,
    transaction: Transaction,
    signature: SignatureOrMultiSig,
): Promise<any> {
    const signed_txn = { transaction, signature };
    const response = await request(url, "proxy_submitTransaction", signed_txn);
    return response;
}

async function proxy_faucetDrip(
    url: string,
    recipient: Address,
    amount: Amount,
    token_id: OptionalToken,
): Promise<any> {
    const response = await request(url, "proxy_faucetDrip", {
        recipient,
        amount: amount.toString(),
        token_id,
    });
    if (response.result !== null) {
        throw new Error(`Value ${response.result} is not null`);
    }
    return response;
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Request Helpers
////////////////////////////////////////////////////////////////////////////////////////////////////

async function request(url: string, method: string, params: any): Promise<any> {
    const body = jsonSerialize(buildJsonRpcRequest(1, method, params));
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
    });
    const result = await response;
    if (result.status !== 200) {
        throw new Error(`JSON-RPC HTTP response had non-200 status code: ${util.inspect(result)}`);
    }
    try {
      const json = result.json();
      if (json.error) {
          throw new Error(`JSON-RPC Request failed with error: ${JSON.stringify(json.error)}`);
      }
      return json;
    } catch (err) {
      throw new Error(`JSON-RPC Response was not well-formed JSON: ${util.inspect(result)}`);
    }
}

function buildJsonRpcRequest(id: number, method: string, params: any) {
    return {
        jsonrpc: "2.0",
        id,
        method,
        params,
    };
}

function jsonSerialize(data: any) {
    return JSON.stringify(data, (k, v) => {
        if (v instanceof Uint8Array) {
            return Array.from(v);
        }
        return v;
    });
}

// This is a workaround to allow BigInt to be serialized as a number.
// https://stackoverflow.com/questions/75749980/typeerror-do-not-know-how-to-serialize-a-bigint
// @ts-ignore
BigInt.prototype.toJSON = function () {
    return Number(this);
};

////////////////////////////////////////////////////////////////////////////////////////////////////
// Miscellaneous Helpers
////////////////////////////////////////////////////////////////////////////////////////////////////

function hexToDecimal(hex: string) {
    return BigInt(`0x${hex}`).toString();
}

// The ed25519 library requires this configuration
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

function randomPrivateKey() {
    return ed.utils.randomPrivateKey();
}

function getPublicKey(key: any) {
    return ed.getPublicKey(key);
}

function sign_value(signing_key: ed.Bytes, type: BcsType<any>, value: any): Uint8Array | null {
    try {
        const msghead = new TextEncoder().encode(type.name + "::");
        const msgbody = type.serialize(value).toBytes();
        var msg = new Uint8Array(msghead.length + msgbody.length);
        msg.set(msghead, 0);
        msg.set(msgbody, msghead.length);
        return ed.sign(msg, signing_key);
    } catch (err) {
        console.log(`Failed to sign msg of type ${type.name} due to error: ${err}`);
        return null;
    }
}

function makeSignature(signing_key: ed.Bytes, type: BcsType<any>, value: any): SignatureOrMultiSig {
    const raw_signature = sign_value(signing_key, type, value);
    if (raw_signature === null) {
        return null;
    } else {
        return { Signature: raw_signature };
    }
}

function signTransaction(signing_key: ed.Bytes, value: Transaction): SignatureOrMultiSig {
    return makeSignature(signing_key, TransactionBcs, value);
}
