---
name: fastset
version: 1.2.0
description: Interact with the FastSet network — a high-performance settlement layer. Query accounts, submit transactions, transfer and mint tokens via the JSON-RPC proxy API. Supports Ed25519 wallet operations.
author: Pi-Squared-Inc
homepage: https://github.com/Pi-Squared-Inc/fastset-rpc-docs
---

# FastSet Network Skill

> **Interact with the FastSet network** via the JSON-RPC proxy API.

> 🚨 **Base URL:** `https://proxy.fastset.xyz`

---

> ⚡ **New here?** Start at [Getting Started](#getting-started) — you'll have a funded wallet in 2 minutes.
> 📋 **Already set up?** Jump to [Quick Reference](#quick-reference).
> 🔧 **Need to sign transactions?** See [BCS Type Definitions](#bcs-type-definitions) and [Complete Working Example](#complete-working-example).

---

## Quick Reference

| Action | Method | Endpoint |
|--------|--------|----------|
| Query account | `proxy_getAccountInfo` | Check balance, nonce, state |
| Submit transaction | `proxy_submitTransaction` | Transfer tokens, create tokens, etc. |
| Faucet (testnet) | `proxy_faucetDrip` | Get test tokens (returns `null` on success) |
| Token info | `proxy_getTokenInfo` | Query custom token metadata |

---

## Getting Started

### Step 1: Install Dependencies

```bash
npm install @mysten/bcs @noble/ed25519 @noble/hashes
```

> ⚠️ **Version note:** This skill targets `@noble/ed25519` **v3.x**. If using v2.x, see [Version Compatibility](#version-compatibility).

### Step 2: Required Setup

Every script needs these before using ed25519:

```typescript
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";

// Required: ed25519 needs explicit SHA-512
ed.hashes.sha512 = (...m) => sha512(ed.etc.concatBytes(...m));

// Required: BigInt JSON serialization workaround
// @ts-ignore
BigInt.prototype.toJSON = function () { return Number(this); };
```

> ⚠️ **Import path:** Use `@noble/hashes/sha2.js` (with `.js` extension) — ESM requires it.

### Step 3: Generate a Wallet

```typescript
const privateKey = ed.utils.randomSecretKey(); // 32 bytes
const publicKey = ed.getPublicKey(privateKey);  // 32 bytes = your address
console.log("Address:", Buffer.from(publicKey).toString("hex"));
```

### Step 4: Fund via Faucet

```typescript
await rpc("proxy_faucetDrip", {
  recipient: publicKey,        // Uint8Array → auto-serialized to byte array
  amount: "de0b6b3a7640000",   // 1 SET (hex string)
  token_id: null               // null = native token
});
// Returns null on success!
```

### Step 5: Check Your Balance

```typescript
const info = await rpc("proxy_getAccountInfo", {
  address: publicKey,
  token_balances_filter: null,
  state_key_filter: null,
  certificate_by_nonce: null,
});
console.log("Balance:", info.result.balance); // hex string, e.g. "de0b6b3a7640000"
console.log("Nonce:", info.result.next_nonce); // use as nonce for next tx
```

> The `rpc()` helper is defined in [Complete Working Example](#complete-working-example) below.

---

## Core Concepts

- **Addresses**: 32-byte Ed25519 public keys — sent as JSON arrays of 32 unsigned integers (byte arrays), not hex strings
- **Nonce**: Auto-incrementing `u64` per account (start at 0). Always fetch from `proxy_getAccountInfo` → `next_nonce` before submitting
- **Amounts**: Hex-encoded 256-bit integers in JSON (e.g., `"ffff"` = 65535). BCS encodes these as 32-byte little-endian u256 automatically
- **Timestamps**: `timestamp_nanos` is a `u128` (use `BigInt` in TypeScript: `BigInt(Date.now()) * 1_000_000n`)
- **Native Token ID**: `[0xfa, 0x57, 0x5e, 0x70, 0, 0, ..., 0]` (32 bytes)
- **Signatures**: Ed25519 over `"Transaction::" + BCS(transaction)`
- **JSON serialization**: `Uint8Array` must be converted via `Array.from()` — see helper below

---

## BCS Type Definitions

Required for transaction signing. The BCS schema **must** match on-chain types exactly.

```typescript
import { bcs } from "@mysten/bcs";

// Amount: hex string in JSON, BCS encodes as u256 (32-byte LE)
const AmountBcs = bcs.u256().transform({
  input: (val) => BigInt(`0x${val}`).toString(), // hex → decimal for BCS
});

const TokenTransfer = bcs.struct("TokenTransfer", {
  token_id: bcs.bytes(32),
  amount: AmountBcs,
  user_data: bcs.option(bcs.bytes(32)),
});

// Variant order matters for BCS! TokenTransfer = index 0.
const ClaimType = bcs.enum("ClaimType", {
  TokenTransfer: TokenTransfer,
});

const TransactionBcs = bcs.struct("Transaction", {
  sender: bcs.bytes(32),
  recipient: bcs.bytes(32),
  nonce: bcs.u64(),
  timestamp_nanos: bcs.u128(),
  claim: ClaimType,
  archival: bcs.bool(),
});
```

> **Important**: The `ClaimType` enum variant ordering determines the BCS discriminant byte.
> If you add more variants, they must match on-chain ordering. See `typescript-examples/fastset-types.ts` for the complete set.

---

## Transferring Tokens

### Build the Transaction

```typescript
const transaction = {
  sender: senderPubKey,          // Uint8Array (32 bytes)
  recipient: recipientPubKey,    // Uint8Array (32 bytes)
  nonce: nextNonce,              // number (from getAccountInfo)
  timestamp_nanos: BigInt(Date.now()) * 1_000_000n,
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

### Sign It

```typescript
const msghead = new TextEncoder().encode("Transaction::");
const msgbody = TransactionBcs.serialize(transaction).toBytes();
const msg = new Uint8Array(msghead.length + msgbody.length);
msg.set(msghead, 0);
msg.set(msgbody, msghead.length);
const signature = ed.sign(msg, privateKey);
```

### Submit It

```typescript
const result = await rpc("proxy_submitTransaction", {
  transaction,
  signature: { Signature: signature },  // wrapped in enum variant
});
```

---

## Claim Types

| Type | BCS Index | Purpose |
|------|-----------|---------|
| `TokenTransfer` | 0 | Transfer tokens between accounts |
| `TokenCreation` | 1 | Create new custom token |
| `TokenManagement` | 2 | Modify token (admin, minters) |
| `Mint` | 3 | Mint additional supply (authorized minters) |
| `ExternalClaim` | 4 | Submit arbitrary data with verifier signatures |
| `Batch` | 5 | Bundle multiple operations |

---

## Complete Working Example

Self-contained Node.js script — generates two wallets, funds one, transfers tokens to the other.

```typescript
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import { bcs } from "@mysten/bcs";

// ── Setup ──────────────────────────────────────────────
ed.hashes.sha512 = (...m) => sha512(ed.etc.concatBytes(...m));
// @ts-ignore
BigInt.prototype.toJSON = function () { return Number(this); };

const PROXY = "https://proxy.fastset.xyz";
const SET_TOKEN_ID = new Uint8Array(32);
SET_TOKEN_ID.set([0xfa, 0x57, 0x5e, 0x70], 0);

// ── BCS Types ──────────────────────────────────────────
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

// ── JSON Helper (Uint8Array → Array) ───────────────────
const toJSON = (data) => JSON.stringify(data, (k, v) =>
  v instanceof Uint8Array ? Array.from(v) : v);

// ── RPC Helper ─────────────────────────────────────────
async function rpc(method, params) {
  const res = await fetch(PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: toJSON({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`RPC error: ${JSON.stringify(json.error)}`);
  return json;
}

// ── 1. Generate two wallets ────────────────────────────
const sk1 = ed.utils.randomSecretKey();
const pk1 = ed.getPublicKey(sk1);
const sk2 = ed.utils.randomSecretKey();
const pk2 = ed.getPublicKey(sk2);
console.log("Wallet 1:", Buffer.from(pk1).toString("hex"));
console.log("Wallet 2:", Buffer.from(pk2).toString("hex"));

// ── 2. Fund wallet 1 via faucet ────────────────────────
await rpc("proxy_faucetDrip", { recipient: pk1, amount: "de0b6b3a7640000", token_id: null });
console.log("Faucet: funded wallet 1");

// ── 3. Check balance & nonce ───────────────────────────
const info = await rpc("proxy_getAccountInfo", {
  address: pk1, token_balances_filter: null, state_key_filter: null, certificate_by_nonce: null,
});
console.log("Balance:", info.result.balance, "| Nonce:", info.result.next_nonce);

// ── 4. Build transfer transaction ──────────────────────
const tx = {
  sender: pk1, recipient: pk2, nonce: info.result.next_nonce,
  timestamp_nanos: BigInt(Date.now()) * 1_000_000n,
  claim: { TokenTransfer: { token_id: SET_TOKEN_ID, amount: "ffff", user_data: null } },
  archival: false,
};

// ── 5. Sign ────────────────────────────────────────────
const head = new TextEncoder().encode("Transaction::");
const body = TransactionBcs.serialize(tx).toBytes();
const msg = new Uint8Array(head.length + body.length);
msg.set(head, 0); msg.set(body, head.length);
const sig = ed.sign(msg, sk1);

// ── 6. Submit ──────────────────────────────────────────
const result = await rpc("proxy_submitTransaction", {
  transaction: tx, signature: { Signature: sig },
});
console.log("Transfer submitted:", result.result ? "✅ success" : "❌ failed");

// ── 7. Verify balances ────────────────────────────────
const info1 = await rpc("proxy_getAccountInfo", {
  address: pk1, token_balances_filter: null, state_key_filter: null, certificate_by_nonce: null,
});
const info2 = await rpc("proxy_getAccountInfo", {
  address: pk2, token_balances_filter: null, state_key_filter: null, certificate_by_nonce: null,
});
console.log("Wallet 1 balance:", info1.result.balance);
console.log("Wallet 2 balance:", info2.result.balance);
```

---

## Version Compatibility

### `@noble/ed25519` v2.x vs v3.x

| Feature | v2.x | v3.x (current) |
|---------|------|-----------------|
| Import SHA-512 | `@noble/hashes/sha2` | `@noble/hashes/sha2.js` |
| Set SHA-512 | `ed.etc.sha512Sync = ...` | `ed.hashes.sha512 = ...` |
| Generate key | `ed.utils.randomPrivateKey()` | `ed.utils.randomSecretKey()` |
| Get public key | `ed.getPublicKey(sk)` | `ed.getPublicKey(sk)` (same) |
| Sign | `ed.sign(msg, sk)` | `ed.sign(msg, sk)` (same) |

To pin v2: `npm install @noble/ed25519@2 @noble/hashes@1`

---

## curl Examples

### Query Account

```bash
curl -s -X POST https://proxy.fastset.xyz \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0", "id": 1,
    "method": "proxy_getAccountInfo",
    "params": {
      "address": [134, 108, 191, 240, 166, 239, 50, ...],
      "token_balances_filter": null,
      "state_key_filter": null,
      "certificate_by_nonce": null
    }
  }'
```

### Faucet Drip

```bash
curl -s -X POST https://proxy.fastset.xyz \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0", "id": 1,
    "method": "proxy_faucetDrip",
    "params": {
      "recipient": [134, 108, 191, 240, 166, 239, 50, ...],
      "amount": "de0b6b3a7640000",
      "token_id": null
    }
  }'
```

> Both `address` and `recipient` are JSON arrays of 32 unsigned integers (byte values of the Ed25519 public key).

---

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| Invalid nonce | Wrong sequence number | Fetch `next_nonce` from `proxy_getAccountInfo` |
| Insufficient balance | Not enough tokens | Use faucet or receive transfer first |
| Invalid signature | Wrong signing process | Ensure `"Transaction::" + BCS(tx)` prefix |
| `No more params` | Missing required RPC fields | Check all required params are present |

---

## Rust

Use the `bcs` crate with `serde` for serialization. See `rust-examples/` for a complete implementation.

## API Reference

Full JSON-RPC specification: `docs/proxy/rpc.md`
