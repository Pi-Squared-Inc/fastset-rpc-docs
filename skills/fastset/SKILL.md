---
name: fastset
description: Interact with the FastSet network - a high-performance blockchain settlement layer. Use when submitting transactions, querying account balances, transferring tokens, minting custom tokens, or working with the FastSet JSON-RPC proxy API. Supports wallet operations with Ed25519 keys.
---

# FastSet Network Skill

Interact with the FastSet network via the JSON-RPC proxy API at `https://proxy.fastset.xyz`.

## Quick Reference

| Operation | Endpoint | Use Case |
|-----------|----------|----------|
| Get account info | `proxy_getAccountInfo` | Check balance, nonce, state |
| Submit transaction | `proxy_submitTransaction` | Transfer tokens, create tokens, etc. |
| Faucet (testnet) | `proxy_faucetDrip` | Get test tokens |
| Get token info | `proxy_getTokenInfo` | Query custom token metadata |

## Core Concepts

- **Addresses**: 32-byte Ed25519 public keys (hex-encoded as 64 chars)
- **Nonce**: Auto-incrementing u64 per account (start at 0)
- **Amounts**: Hex-encoded 256-bit integers (e.g., `"ffff"` = 65535)
- **Native Token ID**: `FA575E7000000000000000000000000000000000000000000000000000000000`
- **Signatures**: Ed25519 over BCS-serialized transaction with `"Transaction::"` prefix

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
      "address": [/* 32-byte array */],
      "token_balance_filter": null,
      "certificate_by_nonce": null
    }
  }'
```

Response includes `balance` (hex string), `next_nonce`, and `token_balance` array.

### 2. Get Test Tokens (Faucet)

```bash
curl -X POST https://proxy.fastset.xyz \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "proxy_faucetDrip",
    "params": {
      "recipient": [/* 32-byte array */],
      "amount": "de0b6b3a7640000",
      "token_id": null
    }
  }'
```

### 3. Transfer Tokens

Build a transaction with claim type `TokenTransfer`:

```json
{
  "sender": [/* 32-byte pubkey */],
  "recipient": [/* 32-byte pubkey */],
  "nonce": 0,
  "timestamp_nanos": 1700000000000000000,
  "archival": false,
  "claim": {
    "TokenTransfer": {
      "token_id": [/* 32-byte token ID */],
      "amount": "ffff",
      "user_data": null
    }
  }
}
```

Sign with Ed25519 over: `"Transaction::" + BCS(transaction)`

Submit via `proxy_submitTransaction` with `{ transaction, signature: { Signature: [/* 64 bytes */] } }`.

## Claim Types

| Type | Purpose |
|------|---------|
| `TokenTransfer` | Transfer tokens between accounts |
| `TokenCreation` | Create new custom token |
| `TokenManagement` | Modify token (admin, minters) |
| `Mint` | Mint additional supply (authorized minters) |
| `ExternalClaim` | Submit arbitrary data with verifier signatures |
| `Batch` | Bundle multiple operations |

## Transaction Signing (TypeScript)

```typescript
import { bcs } from "@mysten/bcs";
import * as ed from "@noble/ed25519";

// Define BCS schema for Transaction (see typescript-examples/fastset-types.ts)
const msghead = new TextEncoder().encode("Transaction::");
const msgbody = TransactionBcs.serialize(transaction).toBytes();
const msg = new Uint8Array(msghead.length + msgbody.length);
msg.set(msghead, 0);
msg.set(msgbody, msghead.length);
const signature = ed.sign(msg, privateKey);
```

## Transaction Signing (Rust)

Use the `bcs` crate with `serde` for serialization. See `rust-examples/` for complete implementation.

## Wallet Management

### Generate New Keypair

```typescript
import * as ed from "@noble/ed25519";
const privateKey = ed.utils.randomPrivateKey(); // 32 bytes
const publicKey = ed.getPublicKey(privateKey);  // 32 bytes = address
```

### Store Private Key Securely

Store as hex string in environment variable or secure vault:
```bash
export FASTSET_PRIVATE_KEY="your_64_char_hex_private_key"
```

## Working Examples

Complete working examples are available:
- **TypeScript**: `typescript-examples/` - Run with `npm install && npm run start`
- **Rust**: `rust-examples/` - Run with `cargo run`

Both demonstrate: key generation → faucet funding → transaction signing → submission.

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| Invalid nonce | Wrong sequence number | Fetch `next_nonce` from `proxy_getAccountInfo` |
| Insufficient balance | Not enough tokens | Use faucet or receive transfer first |
| Invalid signature | Wrong signing process | Ensure BCS encoding with `"Transaction::"` prefix |

## API Reference

See `docs/proxy/rpc.md` for complete JSON-RPC specification including all data types and schemas.
