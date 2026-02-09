---
name: fastset
version: 1.1.0
description: Interact with the FastSet network — a high-performance settlement layer. Query accounts, submit transactions, transfer and mint tokens via the JSON-RPC proxy API. Supports Ed25519 wallet operations.
author: Pi-Squared-Inc
homepage: https://github.com/Pi-Squared-Inc/fastset-rpc-docs
---

# FastSet Network Skill

Interact with the FastSet network via the JSON-RPC proxy API at `https://proxy.fastset.xyz`.

## Prerequisites

**npm packages** (for TypeScript/Node.js):
```bash
npm install @mysten/bcs @noble/ed25519 @noble/hashes
```

**Required setup** — `@noble/ed25519` needs an explicit SHA-512 implementation:
```typescript
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2";
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));
```

**BigInt JSON serialization** workaround (needed for JSON-RPC calls):
```typescript
// @ts-ignore
BigInt.prototype.toJSON = function () { return Number(this); };
```

**Uint8Array → JSON**: When serializing `Uint8Array` to JSON, use `Array.from(bytes)` — `JSON.stringify` doesn't handle typed arrays natively:
```typescript
JSON.stringify(data, (k, v) => v instanceof Uint8Array ? Array.from(v) : v);
```

## Quick Reference

| Operation | Endpoint | Use Case |
|-----------|----------|----------|
| Get account info | `proxy_getAccountInfo` | Check balance, nonce, state |
| Submit transaction | `proxy_submitTransaction` | Transfer tokens, create tokens, etc. |
| Faucet (testnet) | `proxy_faucetDrip` | Get test tokens |
| Get token info | `proxy_getTokenInfo` | Query custom token metadata |

## Core Concepts

- **Addresses**: 32-byte Ed25519 public keys — sent as JSON arrays of 32 unsigned integers (byte arrays), not hex strings
- **Nonce**: Auto-incrementing `u64` per account (start at 0). Fetch current value from `proxy_getAccountInfo` → `next_nonce`
- **Amounts**: Hex-encoded 256-bit integers in JSON (e.g., `"ffff"` = 65535). **BCS encodes these as 32-byte little-endian u256** — the `@mysten/bcs` transform handles this automatically (see BCS Types section)
- **Timestamps**: `timestamp_nanos` is a `u128` (use `BigInt` in TypeScript)
- **Native Token ID**: `FA575E7000000000000000000000000000000000000000000000000000000000` (as bytes: `[0xfa, 0x57, 0x5e, 0x70, 0, 0, ..., 0]`)
- **Signatures**: Ed25519 over `"Transaction::" + BCS(transaction)`

## BCS Type Definitions

These are required for transaction signing. The BCS schema must match the on-chain types exactly.

```typescript
import { bcs } from "@mysten/bcs";

const Bytes32 = bcs.bytes(32);
const Bytes64 = bcs.bytes(64);

// Amount: hex string in JSON, but BCS encodes as u256 (32-byte LE)
const AmountBcs = bcs.u256().transform({
  input: (val) => BigInt(`0x${val}`).toString(), // hex → decimal for BCS
});

const TokenTransfer = bcs.struct("TokenTransfer", {
  token_id: Bytes32,
  amount: AmountBcs,
  user_data: bcs.option(Bytes32),
});

// ClaimType enum — variant order matters for BCS encoding!
// Index 0 = TokenTransfer. Other variants exist but are omitted here.
const ClaimType = bcs.enum("ClaimType", {
  TokenTransfer: TokenTransfer,
});

const TransactionBcs = bcs.struct("Transaction", {
  sender: Bytes32,
  recipient: Bytes32,
  nonce: bcs.u64(),
  timestamp_nanos: bcs.u128(),
  claim: ClaimType,
  archival: bcs.bool(),
});
```

> **Important**: The `ClaimType` enum variant ordering determines the BCS discriminant byte.
> `TokenTransfer` = index 0. If you add more variants (TokenCreation, TokenManagement, Mint, ExternalClaim, Batch),
> they must match the on-chain ordering. See `typescript-examples/fastset-types.ts` for the complete set.

## Common Operations

### 1. Query Account Balance

```bash
curl -X POST https://proxy.fastset.xyz \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "proxy_getAccountInfo",
    "params": {
      "address": [134, 108, 191, 240, ...],
      "token_balances_filter": null,
      "state_key_filter": null,
      "certificate_by_nonce": null
    }
  }'
```

> **Note**: `address` is a JSON array of 32 unsigned integers (the bytes of the Ed25519 public key).
> `token_balances_filter` (not `token_balance_filter`) accepts an array of token IDs or `null`.

**Response fields**:
- `balance` — hex string (e.g., `"de0b6b3a7640000"`)
- `next_nonce` — integer, use this as nonce for the next transaction
- `token_balances` — map of custom token balances (native balance is in `balance`, not here)

### 2. Get Test Tokens (Faucet)

```bash
curl -X POST https://proxy.fastset.xyz \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "proxy_faucetDrip",
    "params": {
      "recipient": [134, 108, 191, 240, ...],
      "amount": "de0b6b3a7640000",
      "token_id": null
    }
  }'
```

> `recipient` is a byte array (same format as address). `amount` is a hex string.
> `token_id` can be `null` (native token) or a 32-byte array for custom tokens.
> **Returns `null` on success** (not a confirmation object).

### 3. Transfer Tokens

Build a transaction object:

```typescript
const transaction = {
  sender: senderPubKey,          // Uint8Array (32 bytes)
  recipient: recipientPubKey,    // Uint8Array (32 bytes)
  nonce: nextNonce,              // number (from getAccountInfo)
  timestamp_nanos: BigInt(Date.now()) * 1_000_000n,  // u128 nanoseconds
  claim: {
    TokenTransfer: {
      token_id: SET_TOKEN_ID,    // Uint8Array (32 bytes)
      amount: "ffff",            // hex string
      user_data: null,
    }
  },
  archival: false,
};
```

Sign and submit:

```typescript
// Sign
const msghead = new TextEncoder().encode("Transaction::");
const msgbody = TransactionBcs.serialize(transaction).toBytes();
const msg = new Uint8Array(msghead.length + msgbody.length);
msg.set(msghead, 0);
msg.set(msgbody, msghead.length);
const signature = ed.sign(msg, privateKey);

// Submit via JSON-RPC
const params = {
  transaction,
  signature: { Signature: signature }  // wraps in enum variant
};
// POST to proxy with method "proxy_submitTransaction" and params above
// Remember to use the custom JSON serializer for Uint8Array → Array.from()
```

## Claim Types

| Type | BCS Index | Purpose |
|------|-----------|---------|
| `TokenTransfer` | 0 | Transfer tokens between accounts |
| `TokenCreation` | 1 | Create new custom token |
| `TokenManagement` | 2 | Modify token (admin, minters) |
| `Mint` | 3 | Mint additional supply (authorized minters) |
| `ExternalClaim` | 4 | Submit arbitrary data with verifier signatures |
| `Batch` | 5 | Bundle multiple operations |

## Wallet Management

### Generate New Keypair

```typescript
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2";
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

const privateKey = ed.utils.randomPrivateKey(); // 32 bytes
const publicKey = ed.getPublicKey(privateKey);   // 32 bytes = your address
```

### Store Private Key Securely

Store as hex string in environment variable or secure vault:
```bash
export FASTSET_PRIVATE_KEY="your_64_char_hex_private_key"
```

## Complete Working Example

Self-contained Node.js example — generate wallet, fund via faucet, transfer tokens:

```typescript
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2";
import { bcs } from "@mysten/bcs";

// Setup
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));
// @ts-ignore
BigInt.prototype.toJSON = function () { return Number(this); };

const PROXY = "https://proxy.fastset.xyz";
const SET_TOKEN_ID = new Uint8Array(32);
SET_TOKEN_ID.set([0xfa, 0x57, 0x5e, 0x70], 0);

// BCS types (minimal for TokenTransfer)
const AmountBcs = bcs.u256().transform({
  input: (val) => BigInt(`0x${val}`).toString(),
});
const TokenTransfer = bcs.struct("TokenTransfer", {
  token_id: bcs.bytes(32), amount: AmountBcs, user_data: bcs.option(bcs.bytes(32)),
});
const ClaimType = bcs.enum("ClaimType", { TokenTransfer });
const TransactionBcs = bcs.struct("Transaction", {
  sender: bcs.bytes(32), recipient: bcs.bytes(32),
  nonce: bcs.u64(), timestamp_nanos: bcs.u128(),
  claim: ClaimType, archival: bcs.bool(),
});

// Helpers
const toJSON = (data: any) => JSON.stringify(data, (k, v) =>
  v instanceof Uint8Array ? Array.from(v) : v);

async function rpc(method: string, params: any) {
  const res = await fetch(PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: toJSON({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return res.json();
}

// 1. Generate keypairs
const sk1 = ed.utils.randomPrivateKey();
const pk1 = ed.getPublicKey(sk1);
const sk2 = ed.utils.randomPrivateKey();
const pk2 = ed.getPublicKey(sk2);

// 2. Fund sender via faucet
await rpc("proxy_faucetDrip", { recipient: pk1, amount: "de0b6b3a7640000", token_id: null });

// 3. Check balance & nonce
const info = await rpc("proxy_getAccountInfo", {
  address: pk1, token_balances_filter: null, state_key_filter: null, certificate_by_nonce: null,
});
console.log("Balance:", info.result.balance, "Nonce:", info.result.next_nonce);

// 4. Build, sign, and submit a transfer
const tx = {
  sender: pk1, recipient: pk2, nonce: info.result.next_nonce,
  timestamp_nanos: BigInt(Date.now()) * 1_000_000n,
  claim: { TokenTransfer: { token_id: SET_TOKEN_ID, amount: "ffff", user_data: null } },
  archival: false,
};
const head = new TextEncoder().encode("Transaction::");
const body = TransactionBcs.serialize(tx).toBytes();
const msg = new Uint8Array(head.length + body.length);
msg.set(head, 0); msg.set(body, head.length);
const sig = ed.sign(msg, sk1);

const result = await rpc("proxy_submitTransaction", {
  transaction: tx, signature: { Signature: sig },
});
console.log("Transfer result:", result);
```

## Transaction Signing (Rust)

Use the `bcs` crate with `serde` for serialization. See `rust-examples/` for complete implementation.

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| Invalid nonce | Wrong sequence number | Fetch `next_nonce` from `proxy_getAccountInfo` |
| Insufficient balance | Not enough tokens | Use faucet or receive transfer first |
| Invalid signature | Wrong signing process | Ensure BCS encoding with `"Transaction::"` prefix |
| `No more params` | Missing required RPC parameters | Check all required fields are present |

## API Reference

See `docs/proxy/rpc.md` for complete JSON-RPC specification including all data types and schemas.
