# FastSet Client Example

This example shows how to sign and submit a transaction to the FastSet network. You will mainly
interact with the validator's JSON-RPC API. More about the JSON-RPC API can be found in the
[JSON-RPC documentation](/docs/validator/rpc.md).

## Overview

[index.ts](./index.ts) contains all of the code. It does the following things:

1. Fetching the next nonce from the validator so that you know what nonce to use for submitting a new transaction
2. Funding the test account by calling the faucet API
3. Serializing and signing a transaction
4. Executing a transaction by submitting it to a validator node and then confirming the transaction by submitting a certificate

## How to run the example

```bash
npm install
npm run start
```
