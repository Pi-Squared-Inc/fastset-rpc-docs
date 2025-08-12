# FastSet JSON-RPC API Documentation

<!-- ***************************************************************************
*****
***** This file is auto-generated; do not manually edit.
*****
**************************************************************************** -->

<!-- TOC -->
- [FastSet JSON-RPC API Documentation](#fastset-json-rpc-api-documentation)
  - [Request/Response Structure](#requestresponse-structure)
  - [Base Types](#base-types)
  - [API Methods](#api-methods)
    - [**Method**: `set_submitTransaction`](#method-set_submittransaction)
      - [Transaction Signatures](#transaction-signatures)
    - [**Method**: `set_submitTransactionCertificate`](#method-set_submittransactioncertificate)
    - [**Method**: `set_getTransfers`](#method-set_gettransfers)
    - [**Method**: `set_getClaims`](#method-set_getclaims)
    - [**Method**: `set_getClaimsByAddress`](#method-set_getclaimsbyaddress)
    - [**Method**: `set_getPerformanceInfo`](#method-set_getperformanceinfo)
    - [**Method**: `set_getAccountInfo`](#method-set_getaccountinfo)
    - [**Method**: `set_getTokenInfo`](#method-set_gettokeninfo)
  - [Error Codes](#error-codes)
  - [Data Types](#data-types)
    - [`Transaction`](#transaction)
    - [`TransactionWithHash`](#transactionwithhash)
    - [`ClaimType`](#claimtype)
      - [`Transfer`](#transfer)
      - [`TokenTransfer`](#tokentransfer)
      - [`TokenCreation`](#tokencreation)
      - [`Mint`](#mint)
      - [`ExternalClaim`](#externalclaim)
    - [`TimedTransfer`](#timedtransfer)
    - [`TimedExternalClaim`](#timedexternalclaim)
    - [`Timing`](#timing)
    - [`Transfer` (in `GetTransferResponse`)](#transfer-in-gettransferresponse)
    - [`ExternalClaimBody`](#externalclaimbody)
    - [`TransferType`](#transfertype)
    - [`Address`](#address)
    - [`SubmitTransactionResponse`](#submittransactionresponse)
    - [`ConfirmTransactionResponse`](#confirmtransactionresponse)
    - [`Pagination`](#pagination)
    - [`PerformanceInfoResponse`](#performanceinforesponse)
    - [`TokenInfoResponse`](#tokeninforesponse)
    - [`TokenMetadata`](#tokenmetadata)
  - [Concrete Usage Examples](#concrete-usage-examples)
    - [Making a Transfer](#making-a-transfer)
    - [Confirming a Transaction](#confirming-a-transaction)
    - [Submitting an external claim (This will need to be confirmed the same way as a transfer)](#submitting-an-external-claim-this-will-need-to-be-confirmed-the-same-way-as-a-transfer)
    - [Creating a Token](#creating-a-token)
    - [Minting Tokens](#minting-tokens)
    - [Making a Transfer (Custom Token)](#making-a-transfer-custom-token)
    - [Burning a Token](#burning-a-token)
    - [Querying Transfers](#querying-transfers)
    - [Querying Claims](#querying-claims)
    - [Querying Performance Info](#querying-performance-info)
    - [Querying Token Metadata](#querying-token-metadata)
    - [Querying Account Info](#querying-account-info)
<!-- TOC -->

## Request/Response Structure

The request/response uses standard JSON-RPC structure.

Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "set_submitTransaction",
  "params": {}
}
```

Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {}
}
```

Error Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32001,
    "message": "Error description"
  }
}
```

## Base Types

We have the following base types:

| Type         | Examples             | Note                                                                                              |
| ------------ | -------------------- | ------------------------------------------------------------------------------------------------- |
| `bool`       | `true`, `false`      |                                                                                                   |
| `number`     | `5225`, `-10`        |                                                                                                   |
| `num_string` | `"5225"`, `"-10"`    | When encoded as binary (e.g., for signing purposes), these have an alternate encoding; see below. |
| `Uint8Array` | `[255, 0, 60]`, `[]` |                                                                                                   |

## API Methods

### **Method**: `set_submitTransaction`

Submits a new transaction to the validator for processing.

**Parameters**:

| Field         | Type          | Note                                                       |
| ------------- | ------------- | ---------------------------------------------------------- |
| `transaction` | `Transaction` |                                                            |
| `signature`   | `Uint8Array`  | See note below for information on computing the signature. |

#### Transaction Signatures

The signature is computed using ed25519 where:

- the public key is stored in the `Transaction` struct's `sender` field
- the message to be signed is the `Transaction` struct serialized using the [`BCS` format](https://github.com/zefchain/bcs) with the following special rules:
  - `num_string` fields are encoded as a litte-endian unsigned 256-bit number as a `Uint8Array` with 32 entries

`BCS` serialization libraries are available for several languages:

- Rust: the [zefchain BCS library](https://github.com/zefchain/bcs) as a [`serde`](https://serde.rs/) backend
- Typescript/Javascript: the [Mysten Labs BCS library](https://www.npmjs.com/package/@mysten/bcs)

Here is an [example implementation](client_examples/index.ts) of the serde and signing process using the `@mysten/bcs` and `@noble/ed25519` libraries.

**Response**:

| Field              | Type         | Note    |
| ------------------ | ------------ | ------- |
| `validator`        | `Uint8Array` | address |
| `signature`        | `Uint8Array` |         |
| `next_nonce`       | `number`     |         |
| `transaction_hash` | `Uint8Array` |         |

### **Method**: `set_submitTransactionCertificate`

Submits a certificate for a transaction with signatures from validators.

**Parameters**:

| Field                  | Type                             | Note                                                      |
| ---------------------- | -------------------------------- | --------------------------------------------------------- |
| `transaction`          | `Transaction`                    | reuse the sent `Transaction` from `set_submitTransaction` |
| `signature`            | `Uint8Array`                     |                                                           |
| `validator_signatures` | `[[Uint8Array, Uint8Array],...]` | list of `[validator_address, validator_signature]`        |

**Response**:

| Field      | Type         | Note                                                             |
| ---------- | ------------ | ---------------------------------------------------------------- |
| `token_id` | `Uint8Array` | ID of the token, if the certified transaction is a TokenCreation |

### **Method**: `set_getTransfers`

Retrieves transfers known to the validator with pagination support.

**Parameters**:

| Field  | Type         | Note |
| ------ | ------------ | ---- |
| `page` | `Pagination` |      |

**Response**:

A `Page` of `TimedTransfer`.

### **Method**: `set_getClaims`

Get external claims sent by an address known to this validator, with pagination support

**Parameters**:

| Field       | Type          | Note                                                   |
| ----------- | ------------- | ------------------------------------------------------ |
| `confirmed` | `bool`        | whether to paginate confirmed claims or pending claims |
| `page`      | `PageRequest` |                                                        |

**Response**:

A `Page` of `TimedExternalClaim`.

**Response**:

An array of `Transfer`

### **Method**: `set_getClaimsByAddress`

Get external claims sent by an address known to this validator, with pagination support

**Parameters**:

| Field     | Type         | Note    |
| --------- | ------------ | ------- |
| `address` | `Uint8Array` | address |
| `page`    | `Pagination` |         |

**Response**:

An array of `TransactionWithHash`

### **Method**: `set_getPerformanceInfo`

Query the performance info data for this validator.

**Parameters**:

none

**Response**:

A [`PerformanceInfoResponse`](#performanceinforesponse) object

### **Method**: `set_getAccountInfo`

Get information about the specified tokens from this validator.

**Parameters**:

| Field                  | Type           | Note                                              |
| ---------------------- | -------------- | ------------------------------------------------- |
| `address`              | `Uint8Array`   | 32-byte array FastPay address                     |
| `token_balance_filter` | `[Uint8Array]` | an array of 32 byte arrays representing token ids |

**Response**:

A [`TokenInfoResponse`](#tokeninforesponse) object.

### **Method**: `set_getTokenInfo`

Get information about the specified tokens from this validator.

**Parameters**:

| Field       | Type           | Note                                              |
| ----------- | -------------- | ------------------------------------------------- |
| `token_ids` | `[Uint8Array]` | an array of 32 byte arrays representing token ids |

**Response**:

A [`TokenInfoResponse`](#tokeninforesponse) object.

## Error Codes

| Code   | Error Type            | Description                                                          |
| ------ | --------------------- | -------------------------------------------------------------------- |
| -32000 | `InternalServerError` | Non-retryable                                                        |
| -32001 | `FastSetError`        | FastSet-specific error from the core system, more refined errors TBD |

## Data Types

### `Transaction`

This is the data that users sign over.

| Field             | Type         | Note                                                  |
| ----------------- | ------------ | ----------------------------------------------------- |
| `sender`          | `Uint8Array` | An ed25519 public key as a 32-byte array.             |
| `nonce`           | `number`     |                                                       |
| `claim`           | `ClaimType`  |                                                       |
| `timestamp_nanos` | `number`     | time right before the command is signed by the client |

### `TransactionWithHash`

A transaction with its hash.

| Field         | Type          | Note |
| ------------- | ------------- | ---- |
| `transaction` | `Transaction` |      |
| `hash`        | `Uint8Array`  |      |

### `ClaimType`

Enum type field. Can contain one of:

| Field           | Type            | Note |
| --------------- | --------------- | ---- |
| `Transfer`      | `Transfer`      |      |
| `TokenTransfer` | `TokenTransfer` |      |
| `TokenCreation` | `TokenCreation` |      |
| `Mint`          | `Mint`          |      |
| `ExternalClaim` | `ExternalClaim` |      |

#### `Transfer`

| Field       | Type         | Note     |
| ----------- | ------------ | -------- |
| `recipient` | `Address`    |          |
| `amount`    | `num_string` |          |
| `user_data` | `Uint8Array` | optional |

#### `TokenTransfer`

| Field       | Type         | Note     |
| ----------- | ------------ | -------- |
| `token_id`  | `Uint8Array` |          |
| `recipient` | `Address`    |          |
| `amount`    | `num_string` |          |
| `user_data` | `Uint8Array` | optional |

#### `TokenCreation`

| Field            | Type           | Note                       |
| ---------------- | -------------- | -------------------------- |
| `token_name`     | `string`       |                            |
| `decimals`       | `number`       |                            |
| `initial_amount` | `num_string`   |                            |
| `mints`          | `[Uint8Array]` | list of users who can mint |
| `user_data`      | `Uint8Array`   | optional                   |

#### `Mint`

| Field       | Type         | Note |
| ----------- | ------------ | ---- |
| `token_id`  | `Uint8Array` |      |
| `recipient` | `Address`    |      |
| `amount`    | `num_string` |      |

#### `ExternalClaim`

Represents an external claim verified by an external committee of verifiers

| Field        | Type                | Note                                       |
| ------------ | ------------------- | ------------------------------------------ |
| `claim`      | `ExternalClaimBody` |                                            |
| `signatures` | `[[Uint8Array]]`    | array of pairs of an address and signature |

### `TimedTransfer`

`Transfer` with an additional field `timing` for timing information.

| Field    | Type       | Note |
| -------- | ---------- | ---- |
| `data`   | `Transfer` |      |
| `timing` | `Timing`   |      |

### `TimedExternalClaim`

`ExternalClaim` with an additional field `timing` for timing information.

| Field    | Type            | Note |
| -------- | --------------- | ---- |
| `data`   | `ExternalClaim` |      |
| `timing` | `Timing`        |      |

### `Timing`

Timing information. All time info are from the perspective of the validator, i.e., it does not include the surround
RPC server time.

| Field                       | Type     | Note                                                                               |
| --------------------------- | -------- | ---------------------------------------------------------------------------------- |
| `signing_duration_nanos`    | `number` | The duration it took to process the initial claim request                          |
| `user_time_nanos`           | `number` | The duration from the sending the signed command back to receiving the certificate |
| `settlement_duration_nanos` | `number` | The duration it took to process the certificate                                    |

### `Transfer` (in `GetTransferResponse`)

Represents a transfer object

| Field                        | Type           | Note                                                                         |
| ---------------------------- | -------------- | ---------------------------------------------------------------------------- |
| `hash`                       | `Uint8Array`   |                                                                              |
| `sender`                     | `Uint8Array`   |                                                                              |
| `nonce`                      | `number`       |                                                                              |
| `transfer`                   | `TransferType` |                                                                              |
| `submission_timestamp_nanos` | `number`       | Same semantics as `Command.timestamp_nanos`, i.e., when did the user sign it |

### `ExternalClaimBody`

Represents an external claim to be verified by an external committee of verifiers

| Field                | Type                | Note               |
| -------------------- | ------------------- | ------------------ |
| `verifier_committee` | `Array<UInt8Array>` | array of addresses |
| `verifier_quorum`    | `number`            |                    |
| `claim_data`         | `UInt8Array`        |                    |

### `TransferType`

Enum type field. Can contain one of:

| Field           | Type                       | Note |
| --------------- | -------------------------- | ---- |
| `Transfer`      | `ClaimType::Transfer`      |      |
| `TokenTransfer` | `ClaimType::TokenTransfer` |      |
| `Mint`          | `ClaimType::Mint`          |      |

### `Address`

Enum type field. Can contain one of:

| Field      | Type         | Note                                               |
| ---------- | ------------ | -------------------------------------------------- |
| `External` | `Uint8Array` | Represents an external system's account in FastSet |
| `FastSet`  | `Uint8Array` | Represents a FastSet native account                |

### `SubmitTransactionResponse`

Response structure for claim submission.

| Field        | Type         | Note |
| ------------ | ------------ | ---- |
| `validator`  | `Uint8Array` |      |
| `signature`  | `Uint8Array` |      |
| `next_nonce` | `number`     |      |

### `ConfirmTransactionResponse`

Response structure for claim confirmation.

| Field      | Type         | Note                                                             |
| ---------- | ------------ | ---------------------------------------------------------------- |
| `token_id` | `Uint8Array` | ID of the token, if the certified transaction is a TokenCreation |

### `Pagination`

Used for paginated requests.

| Field    | Type     | Note                      |
| -------- | -------- | ------------------------- |
| `limit`  | `number` | optional, defaults to all |
| `offset` | `number` |                           |

### `PerformanceInfoResponse`

Performance information from the validator

| Field                   | Type     | Note |
| ----------------------- | -------- | ---- |
| `weak_finality_nanos`   | `number` |      |
| `strong_finality_nanos` | `number` |      |
| `tps_last_second`       | `number` |      |
| `tps_last_minute`       | `number` |      |
| `tps_last_hour`         | `number` |      |
| `signed_transactions`   | `number` |      |
| `settled_transactions`  | `number` |      |

### `TokenInfoResponse`

Information about a set of token ids.

| Field                      | Type                           | Note                                           |
| -------------------------- | ------------------------------ | ---------------------------------------------- |
| `requested_token_metadata` | `[[UInt8Array,TokenMetadata]]` | array of pairs of token ids and token metadata |

### `TokenMetadata`

| Field          | Type           | Note                                                        |
| -------------- | -------------- | ----------------------------------------------------------- |
| `update_id`    | `number`       | how many admin operations have been performed on this token |
| `admin`        | `UInt8Array`   | address that can perform administrative operations          |
| `token_name`   | `string`       | the name of this token                                      |
| `decimals`     | `number`       | how many decimals to display for units of this token        |
| `total_supply` | `num_string`   | the total number of extant units of this token              |
| `mints`        | `[UInt8Array]` | addresses that can mint tokens                              |

Metadata about a particular token.

## Concrete Usage Examples

All request examples in this section correspond to the `"params"` field in the outer JSON RPC request.

All response examples correspond to the `"result"` field in the outer JSON RPC response.

### Making a Transfer

`set_submitTransaction` (Transfer) Request

```json
{
  "transaction": {
    "sender": [
      52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
      149, 192, 218, 112, 204, 147, 54, 100, 233
    ],
    "nonce": 0,
    "timestamp_nanos": 1754979053887528000,
    "claim": {
      "Transfer": {
        "recipient": {
          "FastSet": [
            15, 163, 136, 41, 138, 202, 100, 219, 142, 151, 190, 64, 198, 82, 29, 53, 30, 41, 173, 139, 118, 47,
            68, 188, 79, 100, 186, 53, 14, 208, 178, 172
          ]
        },
        "amount": "1",
        "user_data": null
      }
    }
  },
  "signature": [
    73, 39, 190, 84, 174, 122, 54, 32, 100, 63, 148, 224, 147, 81, 126, 208, 195, 1, 189, 235, 82, 211,
    32, 213, 52, 91, 29, 229, 62, 38, 17, 131, 136, 251, 96, 45, 30, 181, 169, 0, 222, 53, 29, 64, 24,
    199, 212, 18, 76, 29, 241, 243, 221, 135, 192, 5, 1, 163, 135, 136, 221, 53, 248, 2
  ]
}
```

`set_submitTransaction` Response

Note: this response is the same format for all set_submitTransaction requests regardless of the type of claim

```json
{
  "validator": [
    227, 72, 65, 168, 176, 252, 63, 11, 212, 213, 164, 118, 10, 29, 124, 97, 145, 231, 231, 37, 99, 99,
    7, 146, 6, 248, 31, 167, 150, 205, 162, 171
  ],
  "signature": [
    124, 167, 69, 74, 163, 110, 190, 133, 221, 140, 111, 4, 245, 52, 236, 217, 164, 87, 218, 2, 198, 131,
    250, 125, 1, 143, 64, 180, 63, 97, 220, 193, 2, 14, 181, 200, 171, 119, 11, 79, 196, 29, 191, 129,
    195, 62, 235, 123, 248, 97, 187, 85, 44, 141, 35, 253, 230, 237, 114, 242, 43, 2, 5, 5
  ],
  "next_nonce": 0,
  "transaction_hash": [
    108, 178, 140, 151, 49, 182, 133, 160, 222, 74, 76, 108, 48, 243, 157, 160, 112, 78, 182, 2, 62, 171,
    34, 104, 229, 70, 190, 25, 18, 6, 166, 43
  ]
}
```

### Confirming a Transaction

`set_submitTransactionCertificate` Request

```json
{
  "transaction": {
    "sender": [
      52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
      149, 192, 218, 112, 204, 147, 54, 100, 233
    ],
    "nonce": 0,
    "timestamp_nanos": 1754979053887528000,
    "claim": {
      "Transfer": {
        "recipient": {
          "FastSet": [
            15, 163, 136, 41, 138, 202, 100, 219, 142, 151, 190, 64, 198, 82, 29, 53, 30, 41, 173, 139, 118, 47,
            68, 188, 79, 100, 186, 53, 14, 208, 178, 172
          ]
        },
        "amount": "1",
        "user_data": null
      }
    }
  },
  "signature": [
    73, 39, 190, 84, 174, 122, 54, 32, 100, 63, 148, 224, 147, 81, 126, 208, 195, 1, 189, 235, 82, 211,
    32, 213, 52, 91, 29, 229, 62, 38, 17, 131, 136, 251, 96, 45, 30, 181, 169, 0, 222, 53, 29, 64, 24,
    199, 212, 18, 76, 29, 241, 243, 221, 135, 192, 5, 1, 163, 135, 136, 221, 53, 248, 2
  ],
  "validator_signatures": [
    [
      [
        227, 72, 65, 168, 176, 252, 63, 11, 212, 213, 164, 118, 10, 29, 124, 97, 145, 231, 231, 37, 99, 99,
        7, 146, 6, 248, 31, 167, 150, 205, 162, 171
      ],
      [
        124, 167, 69, 74, 163, 110, 190, 133, 221, 140, 111, 4, 245, 52, 236, 217, 164, 87, 218, 2, 198, 131,
        250, 125, 1, 143, 64, 180, 63, 97, 220, 193, 2, 14, 181, 200, 171, 119, 11, 79, 196, 29, 191, 129,
        195, 62, 235, 123, 248, 97, 187, 85, 44, 141, 35, 253, 230, 237, 114, 242, 43, 2, 5, 5
      ]
    ]
  ]
}
```

`set_submitTransactionCertificate` Response

Note: this response is the same format for all set_submitTransactionCertificate requests regardless of the type of claim

```json
{"token_id": null}
```

### Submitting an external claim (This will need to be confirmed the same way as a transfer)

`set_submitTransaction` (External claim) Request

```json
{
  "transaction": {
    "sender": [
      52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
      149, 192, 218, 112, 204, 147, 54, 100, 233
    ],
    "nonce": 1,
    "timestamp_nanos": 1754979054214184000,
    "claim": {
      "ExternalClaim": {
        "claim": {
          "verifier_committee": [
            [
              52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
              149, 192, 218, 112, 204, 147, 54, 100, 233
            ],
            [
              15, 163, 136, 41, 138, 202, 100, 219, 142, 151, 190, 64, 198, 82, 29, 53, 30, 41, 173, 139, 118, 47,
              68, 188, 79, 100, 186, 53, 14, 208, 178, 172
            ]
          ],
          "verifier_quorum": 1,
          "claim_data": [65, 66, 67]
        },
        "signatures": [
          [
            [
              52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
              149, 192, 218, 112, 204, 147, 54, 100, 233
            ],
            [
              75, 186, 9, 214, 243, 212, 38, 210, 196, 179, 48, 56, 172, 102, 110, 233, 31, 18, 93, 217, 224, 229,
              51, 129, 212, 204, 41, 107, 150, 145, 37, 221, 164, 216, 156, 10, 81, 222, 74, 135, 59, 107, 211,
              101, 224, 211, 1, 178, 149, 207, 218, 7, 175, 76, 246, 254, 80, 82, 95, 79, 188, 150, 255, 8
            ]
          ]
        ]
      }
    }
  },
  "signature": [
    254, 13, 86, 94, 156, 180, 199, 233, 74, 183, 58, 198, 169, 216, 190, 241, 50, 37, 90, 178, 58, 238,
    183, 116, 157, 25, 200, 204, 207, 117, 126, 134, 145, 7, 92, 178, 199, 123, 172, 111, 224, 224, 227,
    118, 202, 107, 38, 244, 39, 189, 156, 161, 9, 107, 193, 149, 68, 131, 77, 137, 9, 82, 245, 9
  ]
}
```

### Creating a Token

`set_submitTransaction` (TokenCreation) Request

```json
{
  "transaction": {
    "sender": [
      52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
      149, 192, 218, 112, 204, 147, 54, 100, 233
    ],
    "nonce": 2,
    "timestamp_nanos": 1754979054519830000,
    "claim": {
      "TokenCreation": {
        "token_name": "USDC",
        "decimals": 6,
        "initial_amount": "f4240",
        "mints": [
          [
            52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
            149, 192, 218, 112, 204, 147, 54, 100, 233
          ]
        ],
        "user_data": null
      }
    }
  },
  "signature": [
    231, 66, 109, 106, 26, 138, 57, 214, 129, 248, 242, 246, 222, 30, 126, 174, 108, 74, 126, 105, 163,
    126, 192, 88, 200, 5, 28, 36, 156, 45, 34, 189, 195, 195, 42, 15, 216, 253, 116, 164, 130, 113, 4,
    139, 149, 236, 102, 164, 153, 59, 225, 189, 230, 223, 202, 220, 136, 130, 48, 113, 148, 115, 133, 12
  ]
}
```

### Minting Tokens

`set_submitTransaction` (Mint) Request

```json
{
  "transaction": {
    "sender": [
      52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
      149, 192, 218, 112, 204, 147, 54, 100, 233
    ],
    "nonce": 3,
    "timestamp_nanos": 1754979054874389000,
    "claim": {
      "Mint": {
        "token_id": [
          155, 199, 144, 203, 58, 90, 2, 196, 156, 188, 59, 140, 204, 174, 231, 90, 10, 208, 48, 156, 242, 196,
          136, 119, 112, 115, 254, 254, 109, 70, 12, 112
        ],
        "recipient": [
          52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
          149, 192, 218, 112, 204, 147, 54, 100, 233
        ],
        "amount": "64"
      }
    }
  },
  "signature": [
    46, 30, 206, 231, 44, 72, 224, 92, 216, 0, 0, 61, 251, 0, 41, 132, 80, 219, 174, 75, 54, 140, 165,
    33, 138, 193, 24, 40, 99, 97, 107, 168, 14, 230, 129, 213, 168, 37, 218, 105, 217, 13, 236, 241, 32,
    57, 221, 181, 86, 7, 45, 173, 146, 96, 18, 90, 181, 192, 117, 212, 33, 181, 94, 9
  ]
}
```

### Making a Transfer (Custom Token)

`set_submitTransaction` (TokenTransfer) Request

```json
{
  "transaction": {
    "sender": [
      52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
      149, 192, 218, 112, 204, 147, 54, 100, 233
    ],
    "nonce": 4,
    "timestamp_nanos": 1754979055211157000,
    "claim": {
      "TokenTransfer": {
        "token_id": [
          155, 199, 144, 203, 58, 90, 2, 196, 156, 188, 59, 140, 204, 174, 231, 90, 10, 208, 48, 156, 242, 196,
          136, 119, 112, 115, 254, 254, 109, 70, 12, 112
        ],
        "recipient": {
          "FastSet": [
            15, 163, 136, 41, 138, 202, 100, 219, 142, 151, 190, 64, 198, 82, 29, 53, 30, 41, 173, 139, 118, 47,
            68, 188, 79, 100, 186, 53, 14, 208, 178, 172
          ]
        },
        "amount": "64",
        "user_data": null
      }
    }
  },
  "signature": [
    75, 189, 211, 219, 202, 192, 250, 201, 34, 170, 8, 162, 90, 18, 130, 27, 160, 22, 32, 224, 150, 208,
    44, 25, 222, 210, 235, 52, 253, 40, 24, 10, 88, 30, 125, 245, 184, 188, 33, 59, 102, 183, 195, 16,
    215, 144, 60, 61, 135, 65, 190, 73, 90, 52, 6, 226, 157, 150, 104, 104, 254, 250, 172, 12
  ]
}
```

### Burning a Token

To burn some native or custom tokens, just create a transfer with the recipient field set to the address containing all zeroes.

### Querying Transfers

> **Note**: For querying the next page, use the `next_page_token` in `set_getTransfers` response directly as
>`"page"."token"` in the next `set_getTransfers` request.

`set_getTransfers` Request

```json
{
  "page": {"limit": 10, "token": null}
}
```

`set_getTransfers` Response

```json
{
  "data": [
    {
      "data": {
        "hash": [
          108, 178, 140, 151, 49, 182, 133, 160, 222, 74, 76, 108, 48, 243, 157, 160, 112, 78, 182, 2, 62, 171,
          34, 104, 229, 70, 190, 25, 18, 6, 166, 43
        ],
        "sender": [
          52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
          149, 192, 218, 112, 204, 147, 54, 100, 233
        ],
        "nonce": 0,
        "transfer": {
          "Transfer": {
            "recipient": {
              "FastSet": [
                15, 163, 136, 41, 138, 202, 100, 219, 142, 151, 190, 64, 198, 82, 29, 53, 30, 41, 173, 139, 118, 47,
                68, 188, 79, 100, 186, 53, 14, 208, 178, 172
              ]
            },
            "amount": "1",
            "user_data": null
          }
        },
        "submission_timestamp_nanos": 1754979053887528000
      },
      "timing": {
        "signing_duration_nanos": 547917,
        "user_time_nanos": 118903208,
        "settlement_duration_nanos": 857208
      }
    },
    {
      "data": {
        "hash": [
          155, 199, 144, 203, 58, 90, 2, 196, 156, 188, 59, 140, 204, 174, 231, 90, 10, 208, 48, 156, 242, 196,
          136, 119, 112, 115, 254, 254, 109, 70, 12, 112
        ],
        "sender": [
          52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
          149, 192, 218, 112, 204, 147, 54, 100, 233
        ],
        "nonce": 2,
        "transfer": {
          "TokenCreation": {
            "token_name": "USDC",
            "decimals": 6,
            "initial_amount": "f4240",
            "mints": [
              [
                52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
                149, 192, 218, 112, 204, 147, 54, 100, 233
              ]
            ],
            "user_data": null
          }
        },
        "submission_timestamp_nanos": 1754979054519830000
      },
      "timing": {
        "signing_duration_nanos": 606750,
        "user_time_nanos": 124273167,
        "settlement_duration_nanos": 1933250
      }
    },
    {
      "data": {
        "hash": [
          218, 233, 162, 222, 203, 61, 70, 59, 223, 113, 129, 202, 110, 154, 125, 59, 123, 206, 8, 134, 178,
          116, 194, 145, 105, 227, 167, 93, 84, 119, 105, 211
        ],
        "sender": [
          52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
          149, 192, 218, 112, 204, 147, 54, 100, 233
        ],
        "nonce": 3,
        "transfer": {
          "Mint": {
            "token_id": [
              155, 199, 144, 203, 58, 90, 2, 196, 156, 188, 59, 140, 204, 174, 231, 90, 10, 208, 48, 156, 242, 196,
              136, 119, 112, 115, 254, 254, 109, 70, 12, 112
            ],
            "recipient": [
              52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
              149, 192, 218, 112, 204, 147, 54, 100, 233
            ],
            "amount": "64"
          }
        },
        "submission_timestamp_nanos": 1754979054874389000
      },
      "timing": {
        "signing_duration_nanos": 520917,
        "user_time_nanos": 123466500,
        "settlement_duration_nanos": 1719125
      }
    },
    {
      "data": {
        "hash": [
          128, 197, 159, 101, 162, 85, 251, 115, 127, 204, 89, 247, 210, 67, 14, 132, 147, 25, 174, 73, 252,
          194, 145, 173, 249, 4, 200, 7, 103, 84, 62, 108
        ],
        "sender": [
          52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
          149, 192, 218, 112, 204, 147, 54, 100, 233
        ],
        "nonce": 4,
        "transfer": {
          "TokenTransfer": {
            "token_id": [
              155, 199, 144, 203, 58, 90, 2, 196, 156, 188, 59, 140, 204, 174, 231, 90, 10, 208, 48, 156, 242, 196,
              136, 119, 112, 115, 254, 254, 109, 70, 12, 112
            ],
            "recipient": {
              "FastSet": [
                15, 163, 136, 41, 138, 202, 100, 219, 142, 151, 190, 64, 198, 82, 29, 53, 30, 41, 173, 139, 118, 47,
                68, 188, 79, 100, 186, 53, 14, 208, 178, 172
              ]
            },
            "amount": "64",
            "user_data": null
          }
        },
        "submission_timestamp_nanos": 1754979055211157000
      },
      "timing": {
        "signing_duration_nanos": 500750,
        "user_time_nanos": 122360167,
        "settlement_duration_nanos": 1464833
      }
    }
  ],
  "next_page_token": [
    0, 0, 0, 0, 0, 0, 0, 0, 24, 90, 240, 39, 6, 28, 150, 8, 128, 197, 159, 101, 162, 85, 251, 115, 127,
    204, 89, 247, 210, 67, 14, 133
  ]
}
```

### Querying Claims

> **Note**: For querying the next page, use the `next_page_token` in `set_getClaims` response directly as
>`"page"."token"` in the next `set_getClaims` request.

`set_getClaims` Request

```json
{
  "confirmed": true,
  "page": {"limit": 10, "token": null}
}
```

`set_getClaims` Response

```json
{
  "data": [
    {
      "data": {
        "claim": {
          "verifier_committee": [
            [
              52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
              149, 192, 218, 112, 204, 147, 54, 100, 233
            ],
            [
              15, 163, 136, 41, 138, 202, 100, 219, 142, 151, 190, 64, 198, 82, 29, 53, 30, 41, 173, 139, 118, 47,
              68, 188, 79, 100, 186, 53, 14, 208, 178, 172
            ]
          ],
          "verifier_quorum": 1,
          "claim_data": [65, 66, 67]
        },
        "signatures": [
          [
            [
              52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
              149, 192, 218, 112, 204, 147, 54, 100, 233
            ],
            [
              75, 186, 9, 214, 243, 212, 38, 210, 196, 179, 48, 56, 172, 102, 110, 233, 31, 18, 93, 217, 224, 229,
              51, 129, 212, 204, 41, 107, 150, 145, 37, 221, 164, 216, 156, 10, 81, 222, 74, 135, 59, 107, 211,
              101, 224, 211, 1, 178, 149, 207, 218, 7, 175, 76, 246, 254, 80, 82, 95, 79, 188, 150, 255, 8
            ]
          ]
        ]
      },
      "timing": {
        "signing_duration_nanos": 988042,
        "user_time_nanos": 123760833,
        "settlement_duration_nanos": 1473958
      }
    }
  ],
  "next_page_token": [
    0, 0, 0, 0, 0, 0, 0, 0, 24, 90, 240, 38, 202, 175, 252, 64, 131, 57, 21, 166, 221, 206, 20, 228, 209,
    122, 212, 95, 227, 232, 32, 206
  ]
}
```

### Querying Performance Info

`set_getPerformanceInfo` Request

```json
null
```

`set_getPerformanceInfo` Response

```json
{
  "weak_finality_nanos": 632875,
  "strong_finality_nanos": 124675325,
  "tps_last_second": 2,
  "tps_last_minute": 0,
  "tps_last_hour": 0,
  "signed_transactions": 5,
  "settled_transactions": 5,
  "db_stats": {"channel_buffer_size": 0}
}
```

### Querying Token Metadata

`set_getTokenInfo` Request

```json
{
  "token_ids": [
    [
      155, 199, 144, 203, 58, 90, 2, 196, 156, 188, 59, 140, 204, 174, 231, 90, 10, 208, 48, 156, 242, 196,
      136, 119, 112, 115, 254, 254, 109, 70, 12, 112
    ],
    [
      20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
      20, 20, 20, 20, 20, 20, 20
    ]
  ]
}
```

`set_getTokenInfo` Response

```json
{
  "requested_token_metadata": [
    [
      [
        155, 199, 144, 203, 58, 90, 2, 196, 156, 188, 59, 140, 204, 174, 231, 90, 10, 208, 48, 156, 242, 196,
        136, 119, 112, 115, 254, 254, 109, 70, 12, 112
      ],
      {
        "update_id": 0,
        "admin": [
          52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
          149, 192, 218, 112, 204, 147, 54, 100, 233
        ],
        "token_name": "USDC",
        "decimals": 6,
        "total_supply": "f4240",
        "mints": [
          [
            52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
            149, 192, 218, 112, 204, 147, 54, 100, 233
          ]
        ]
      }
    ],
    [
      [
        20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
        20, 20, 20, 20, 20, 20, 20
      ],
      null
    ]
  ]
}
```

### Querying Account Info

`set_getAccountInfo` Request

```json
{
  "address": [
    52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
    149, 192, 218, 112, 204, 147, 54, 100, 233
  ],
  "token_balance_filter": [
    [
      155, 199, 144, 203, 58, 90, 2, 196, 156, 188, 59, 140, 204, 174, 231, 90, 10, 208, 48, 156, 242, 196,
      136, 119, 112, 115, 254, 254, 109, 70, 12, 112
    ]
  ]
}
```

`set_getAccountInfo` Response

```json
{
  "sender": [
    52, 242, 173, 210, 15, 207, 27, 190, 99, 126, 101, 12, 86, 221, 83, 6, 40, 73, 72, 219, 250, 190, 48,
    149, 192, 218, 112, 204, 147, 54, 100, 233
  ],
  "balance": "63",
  "next_nonce": 5,
  "pending_confirmation": null,
  "requested_certificate": null,
  "requested_validated_transaction": null,
  "requested_received_transfers": [],
  "token_balance": [
    [
      [
        155, 199, 144, 203, 58, 90, 2, 196, 156, 188, 59, 140, 204, 174, 231, 90, 10, 208, 48, 156, 242, 196,
        136, 119, 112, 115, 254, 254, 109, 70, 12, 112
      ],
      "f4240"
    ]
  ],
  "requested_claim_by_id": null,
  "requested_claims": []
}
```
