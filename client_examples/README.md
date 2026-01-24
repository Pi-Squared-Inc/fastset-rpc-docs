# FastSet Client Example

This example shows how to sign and submit a transaction to the FastSet network using the network proxy.

## Overview

There are two files:

1. [fastset-types](./fastset-types.ts) contains JSON-RPC type and method definitions.
2. [index.ts](./index.ts) contains driver code.

In particular, the example code walks the user through the following steps:

1. Fetching the next nonce from the proxy for a given user account; note that:

   - a nonce is just an auto-incrementing u64 starting from 0;
   - each valid transaction submitted by a sender causes the sender's nonce to increase by 1;
   - if a transaction is submitted with the wrong nonce, the validators will reject it.

2. Funding an account by calling the proxy's faucet API
3. Serializing and signing a transaction

   Note that transaction signatures are ed25519 signatures over the [BCS](https://github.com/zefchain/bcs) encoding of the transaction.

4. Submitting a signed transaction to the proxy

## How to run the example

```bash
npm install
npm run start
```
