# Validator JSON-RPC API Documentation

## List of Endpoints

- [`set_submitTransaction`](#set_submittransaction)
- [`set_submitTransactionCertificate`](#set_submittransactioncertificate)
- [`set_getTransfers`](#set_gettransfers)
- [`set_getClaims`](#set_getclaims)
- [`set_getClaimsByAddress`](#set_getclaimsbyaddress)
- [`set_getPerformanceInfo`](#set_getperformanceinfo)
- [`set_getAccountInfo`](#set_getaccountinfo)
- [`set_getTokenInfo`](#set_gettokeninfo)
- [`set_getVersion`](#set_getversion)

---

## `set_submitTransaction`

Submit a transaction to the validator. The validator validates the transaction and returns
a signature.

The signature is computed using ed25519 where:

- the public key is stored in the `Transaction` struct's `sender` field
- the message to be signed is the `Transaction` struct serialized using the [
  `BCS` format](https://github.com/zefchain/bcs) with the following special rules:
    - Numerical string ([Amount](#amount)/[Balance](#balance)) fields are encoded as a little-endian unsigned 256-bit number
      as an array of uint8 of length 32.

- Rust: the [zefchain BCS library](https://github.com/zefchain/bcs) as a [`serde`](https://serde.rs/) backend
- Typescript/Javascript: the [Mysten Labs BCS library](https://www.npmjs.com/package/@mysten/bcs)

Here is an [example implementation](/docs/client_examples/index.ts) of the serde and signing process using the `@mysten/bcs` and `@noble/ed25519` libraries.

Input:
- `transaction`: a [Transaction](#transaction) of any [ClaimType](#claimtype)
- `signature`: a [Signature](#signature) over the transaction created by the [sender]

Returns:
- [SubmitTransactionResponse](#submittransactionresponse) if the transaction was successfully submitted


**Parameters**:

| Name | Type |
|------|------|
| `transaction` | [`Transaction`](#transaction) |
| `signature` | [`Signature`](#signature) |

**Returns**:

[`SubmitTransactionResponse`](#submittransactionresponse)

---

## `set_submitTransactionCertificate`

Submit a transaction certificate to the validator.

Input:
- `transaction`: the [Transaction](#transaction) submitted previously via set_submitTransaction
- `signature`: the [Signature](#signature) submitted previously via set_submitTransaction
- `validator_signatures`: a list of validator signatures

Returns:
- [ConfirmTransactionResponse](#confirmtransactionresponse) if the transaction was successfully submitted

**Parameters**:

| Name | Type |
|------|------|
| `transaction` | [`Transaction`](#transaction) |
| `signature` | [`Signature`](#signature) |
| `validator_signatures` | Vec< (ValidatorName , Signature) > |

**Returns**:

[`ConfirmTransactionResponse`](#confirmtransactionresponse)

---

## `set_getTransfers`

Get paginated transfers known to this validator

Input:
- `page`: a [PageRequest](#pagerequest)(#pagerequest) object that specifies the limit (max number of entries to return)
    and the page [token]. To query the first page, omit the token in the request.

Returns:
- a [Page<Timed<Transfer>>]. The [next_page_token] in the field can be used as the
    [token] field in the next [PageRequest](#pagerequest)(#pagerequest) to fetch the next page.

**Parameters**:

| Name | Type |
|------|------|
| `page` | [`PageRequest`](#pagerequest) |

**Returns**:

Page< Timed< [`Transfer`](#transfer) > >

---

## `set_getClaims`

Get paginated claims known to this validator

Input:
- `page`: a [PageRequest](#pagerequest)(#pagerequest) object that specifies the limit (max number of entries to return)
    and the page [token]. To query the first page, omit the token in the request.

Returns:
- [Page<Timed<ExternalClaim>>]. The `next_page_token` field can be used as the
    `token` field in the next [PageRequest](#pagerequest)(#pagerequest) to fetch the next page.

**Parameters**:

| Name | Type |
|------|------|
| `confirmed` | bool |
| `page` | [`PageRequest`](#pagerequest) |

**Returns**:

Page< Timed< [`ExternalClaim`](#externalclaim) > >

---

## `set_getClaimsByAddress`

Get all external claims sent by this address known to this validator
Note: currently broken and yields no results as the per-account in-memory storage no longer
exists

**Parameters**:

| Name | Type |
|------|------|
| `address` | [`FastSetAddress`](#fastsetaddress) |
| `page` | [`Pagination`](#pagination) |

**Returns**:

Vec< [`TransactionWithHash`](#transactionwithhash) >

---

## `set_getPerformanceInfo`

Query the performance info data for this validator

Returns:
- [PerformanceInfoResponse](#performanceinforesponse)

**Returns**:

[`PerformanceInfoResponse`](#performanceinforesponse)

---

## `set_getAccountInfo`

Get account info from this validator

Input:
- `address`: the account's FastSet address
- `token_balance_filter`: a list of custom token IDs to query the balance for. If this field
    is omitted, no custom token balances will be returned. If this field is an empty list,
    it returns the balance of all custom tokens owned by this account.
- `certificate_by_nonce`: a nonce to specify the intent to query a certificate with that
    nonce. Note that due to the removal of the per-account in-memory storage, only the
    latest certificate from an account can be queried.

Returns:
- [AccountInfoResponse](#accountinforesponse)

**Parameters**:

| Name | Type |
|------|------|
| `address` | [`FastSetAddress`](#fastsetaddress) |
| `token_balance_filter` | Option< Vec< [`TokenId`](#tokenid) > > |
| `certificate_by_nonce` | Option< [`Nonce`](#nonce) > |

**Returns**:

[`AccountInfoResponse`](#accountinforesponse)

---

## `set_getTokenInfo`

Get token info from this validator

Input:
- `token_ids`: a list of custom token IDs to fetch the info for.

Returns:
- [TokenInfoResponse](#tokeninforesponse)(#tokeninforesponse)

**Parameters**:

| Name | Type |
|------|------|
| `token_ids` | Vec< [`TokenId`](#tokenid) > |

**Returns**:

[`TokenInfoResponse`](#tokeninforesponse)

---

## `set_getVersion`

Get validator version

**Returns**:

String

---

## Data Types

---

### ClaimType

One of various types of actions that can be packed into a transaction

**JSON Schema**: [ClaimType](ClaimType.json)

#### Variants:
| Name | Type | Notes |
|------|------|-------|
| `Transfer` | [`Transfer`](#transfer) | Transfer funds, native token |
| `TokenTransfer` | [`TokenTransfer`](#tokentransfer) | Transfer funds, other token |
| `TokenCreation` | [`TokenCreation`](#tokencreation) | Create custom token |
| `TokenManagement` | [`TokenManagement`](#tokenmanagement) | Modify custom token |
| `Mint` | [`Mint`](#mint) | Mint funds in a custom token |
| `ExternalClaim` | [`ExternalClaim`](#externalclaim) | Submit arbitrary data to be settled on the network |

---

### Transaction

Action that can be submitted and confirmed on the network

**JSON Schema**: [Transaction](Transaction.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `sender` | [`PublicKeyBytes`](#publickeybytes) | Address of sender, and intended signer of this transaction |
| `recipient` | [`Address`](#address) | Address of recipient |
| `nonce` | [`Nonce`](#nonce) | A sequence number. Transactions sent by the same account are ordered by nonce. |
| `timestamp_nanos` | uint128 | Nanos since the Unix epoch. |
| `claim` | [`ClaimType`](#claimtype) | Type-dependent data |

---

### PublicKeyBytes

An Ed25519 Public Key

**JSON Schema**: [PublicKeyBytes](PublicKeyBytes.json)

`Array < uint8 ; length=32 >`

---

### Nonce

**JSON Schema**: [Nonce](Nonce.json)

`uint64`

---

### Transfer

Transfer funds in the native token to another address

**JSON Schema**: [Transfer](Transfer.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `amount` | [`Amount`](#amount) | Amount to transfer |
| `user_data` | [`UserData`](#userdata) | Extra data field to associate with this transfer |

---

### TokenTransfer

Transfer funds in some custom token to another address

**JSON Schema**: [TokenTransfer](TokenTransfer.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `token_id` | Array < uint8 ; length=32 > | Token ID to transfer |
| `amount` | [`Amount`](#amount) | Amount to transfer |
| `user_data` | [`UserData`](#userdata) | Extra data field to associate with this transfer |

---

### TokenCreation

Create a new token.
The token id is derived from the [Transaction]
so it depends also on the creator and the [Nonce].

**JSON Schema**: [TokenCreation](TokenCreation.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `token_name` | string | Human-readable name |
| `decimals` | uint8 | Power of 10 that should be considered a full unit of this token. An [Amount] is still always in least units. |
| `initial_amount` | [`Amount`](#amount) | Initial balance, which will be held by the creator of the token. |
| `mints` | Array < [`PublicKeyBytes`](#publickeybytes) > | Addresses which will be able to create more of this token |
| `user_data` | [`UserData`](#userdata) | Arbitrary userdata attached to this transaction |

---

### TokenManagement

Manage an existing token.

**JSON Schema**: [TokenManagement](TokenManagement.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `token_id` | Array < uint8 ; length=32 > | The id of the token to be managed |
| `update_id` | [`Nonce`](#nonce) | The update id for this token (used for sequencing) Each update id must be one greater than the last |
| `new_admin` | [`PublicKeyBytes`](#publickeybytes) (optional) | The new admin address; preserve existing admin if None |
| `mints` | Array < ( [`AddressChange`](#addresschange), [`PublicKeyBytes`](#publickeybytes) ) > | The minter addresses to be added/removed |
| `user_data` | [`UserData`](#userdata) | Arbitrary userdata attached to this transaction |

---

### Mint

Create more funds of a token.
The sender of the [Transaction] must be a known
mint of the token.

**JSON Schema**: [Mint](Mint.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `token_id` | Array < uint8 ; length=32 > | Token ID. This is the hash of the TokenCreation transaction that created the token. This is calculated using the keccak256 hash over the data encoded in the same way as for signing. |
| `amount` | [`Amount`](#amount) | Amount to mint |

---

### ExternalClaim

Submit arbitrary data along with a quorum of signatures from external verifiers

**JSON Schema**: [ExternalClaim](ExternalClaim.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `claim` | [`ExternalClaimBody`](#externalclaimbody) | The claim itself plus the required verifier quorum |
| `signatures` | Array < ( [`PublicKeyBytes`](#publickeybytes), [`Signature`](#signature) ) > | At least `claim.verifier_quorum` signatures over `claim` by members of `claim.verifier_committee` |

---

### ExternalClaimBody

**JSON Schema**: [ExternalClaimBody](ExternalClaimBody.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `verifier_committee` | Array < [`PublicKeyBytes`](#publickeybytes) > | Set of verifiers (regular  FastSet addresses) that can sign for this ExternalClaim |
| `verifier_quorum` | [`Quorum`](#quorum) | Minimum number of verifiers in `verifier_committee` for which fastset validators will sign this transaction |
| `claim_data` | [`ClaimData`](#claimdata) | Arbitrary data that the verifiers are signing. |

---

### Address

**JSON Schema**: [Address](Address.json)

#### Variants:
| Name | Type | Notes |
|------|------|-------|
| `External` | [`PublicKeyBytes`](#publickeybytes) | |
| `FastSet` | [`PublicKeyBytes`](#publickeybytes) | |

---

### AddressChange

**JSON Schema**: [AddressChange](AddressChange.json)

#### Variants:
| Name | Type | Notes |
|------|------|-------|
| `Add` | array | |
| `Remove` | array | |

---

### Amount

256-bit unsigned integer encoded as a hex string

**JSON Schema**: [Amount](Amount.json)

`string`

---

### UserData

**JSON Schema**: [UserData](UserData.json)

`Option < Array < uint8 ; length=32 > >`

---

### Balance

257-bit signed integer with the magnitude encoded in hex preceded by `-` sign if applicable

**JSON Schema**: [Balance](Balance.json)

`string`

---

### FastSetAddress

An Ed25519 Public Key

**JSON Schema**: [FastSetAddress](FastSetAddress.json)

`Array < uint8 ; length=32 >`

---

### TokenId

**JSON Schema**: [TokenId](TokenId.json)

`Array < uint8 ; length=32 >`

---

### TokenMetadata

Encodes metadata about a custom token

**JSON Schema**: [TokenMetadata](TokenMetadata.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `update_id` | [`Nonce`](#nonce) | number of management operations applied to some token |
| `admin` | [`PublicKeyBytes`](#publickeybytes) | the current token admin |
| `token_name` | string | the name of the token |
| `decimals` | uint8 | the number of decimals for this token |
| `total_supply` | [`Amount`](#amount) | the total supply for this token |
| `mints` | Array < [`PublicKeyBytes`](#publickeybytes) > | the authorized minting addresses for this token |

---

### Signature

An Ed25519 signature

**JSON Schema**: [Signature](Signature.json)

`Array < uint8 ; length=64 >`

---

### PageRequest

**JSON Schema**: [PageRequest](PageRequest.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `limit` | uint | |
| `token` | Option < Array < uint8 > > (optional) | |

---

### Timed<T>

**JSON Schema**: [Timed<T>](Timed<T>.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `data` | T | |
| `timing` | [`SettleTiming`](#settletiming) (optional) | |

---

### SettleTiming

**JSON Schema**: [SettleTiming](SettleTiming.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `signing_duration_nanos` | Option < uint128 > (optional) | The time it took for a validator to sign the transaction. Missing if the current validator did not sign the transaction. |
| `user_time_nanos` | Option < uint128 > (optional) | The time it took between finishing signing the transaction and receiving the handle certificate request from the user. |
| `settlement_duration_nanos` | uint128 | The time it took to handle the certificate request. |

---

### Pagination

**JSON Schema**: [Pagination](Pagination.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `limit` | Option < uint > (optional) | |
| `offset` | uint | |

---

### Page<T>

**JSON Schema**: [Page<T>](Page<T>.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `data` | Array < T > | |
| `next_page_token` | Array < uint8 > | The token that should be used as NextPageToken::token in the next fetch |

---

### TokenInfoResponse

**JSON Schema**: [TokenInfoResponse](TokenInfoResponse.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `requested_token_metadata` | Array < ( Array < uint8 ; length=32 >, [`TokenMetadata`](#tokenmetadata) ) > | |

---

### PerformanceInfoResponse

Performance information from the validator

**JSON Schema**: [PerformanceInfoResponse](PerformanceInfoResponse.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `weak_finality_nanos` | uint128 | Average weak finality since validator started (in nanoseconds) |
| `strong_finality_nanos` | uint128 | Average strong finality since validator started (in nanoseconds) |
| `tps_last_second` | uint64 | Transactions in the last second since the query |
| `tps_last_minute` | uint64 | Average (per second) transactions in the last minute since the query |
| `tps_last_hour` | uint64 | Average (per second) transactions in the last hour since the query |
| `ops_last_second` | uint64 | Orders finished in the last full second. |
| `ops_last_minute` | uint64 | Average orders per second in the last minute. |
| `ops_last_hour` | uint64 | Average orders per second in the last hour. |
| `signed_transactions` | uint64 | Number of signed transactions since validator started (includes not yet settled transactions) |
| `settled_transactions` | uint64 | Number of fully processed transactions since validator started |
| `db_stats` | [`DbStats`](#dbstats) (optional) | DB stats |

---

### DbStats

**JSON Schema**: [DbStats](DbStats.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `channel_buffer_size` | uint | |

---

### SubmitTransactionResponse

**JSON Schema**: [SubmitTransactionResponse](SubmitTransactionResponse.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `validator` | [`PublicKeyBytes`](#publickeybytes) | |
| `signature` | [`Signature`](#signature) | |
| `next_nonce` | [`Nonce`](#nonce) | |
| `transaction_hash` | Array < uint8 > | |

---

### ConfirmTransactionResponse

**JSON Schema**: [ConfirmTransactionResponse](ConfirmTransactionResponse.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `token_id` | Option < Array < uint8 ; length=32 > > (optional) | |

---

### ValidatorName

An Ed25519 Public Key

**JSON Schema**: [ValidatorName](ValidatorName.json)

`Array < uint8 ; length=32 >`

---

### Quorum

**JSON Schema**: [Quorum](Quorum.json)

`uint64`

---

### ClaimData

**JSON Schema**: [ClaimData](ClaimData.json)

`Array < uint8 >`

---

### AccountInfoResponse

Data associated to one account. Contains optional fields for returning account-related info from various
types of queries. Reflects the view of a single validator, which may be lagging behind the rest of the network.

**JSON Schema**: [AccountInfoResponse](AccountInfoResponse.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `sender` | [`PublicKeyBytes`](#publickeybytes) | The address of the account |
| `balance` | [`Balance`](#balance) | Balance in native tokens of the account |
| `next_nonce` | [`Nonce`](#nonce) | The next transaction from the account is required to have this nonce. |
| `pending_confirmation` | [`ValidatedTransaction`](#validatedtransaction) (optional) | The transaction that has been validated by the current validator, but not yet confirmed (if requested) |
| `requested_certificate` | [`TransactionCertificate`](#transactioncertificate) (optional) | A single transaction certificate (if requested) |
| `requested_validated_transaction` | [`ValidatedTransaction`](#validatedtransaction) (optional) | A single validated transaction (if requested) |
| `requested_received_transfers` | Array < [`TransactionCertificate`](#transactioncertificate) > | Certificates responding to transfers where this account is the recipient (if requested) |
| `token_balance` | Array < ( Array < uint8 ; length=32 >, [`Balance`](#balance) ) > | Custom token balances of tokens held by this account (may not be all tokens held). |
| `requested_claim_by_id` | [`ExternalClaim`](#externalclaim) (optional) | External claim by its ID (if requested) |
| `requested_claims` | Array < [`TransactionWithHash`](#transactionwithhash) > | Multiple external claims (if requested) |

---

### ValidatedTransaction

A Transaction along with the signature from one validator

**JSON Schema**: [ValidatedTransaction](ValidatedTransaction.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `value` | [`TransactionEnvelope`](#transactionenvelope) | |
| `validator` | [`PublicKeyBytes`](#publickeybytes) | |
| `signature` | [`Signature`](#signature) | |

---

### Page<T>

**JSON Schema**: [Page<T>](Page<T>.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `data` | Array < T > | |
| `next_page_token` | Array < uint8 > | The token that should be used as NextPageToken::token in the next fetch |

---

### Timed<T>

**JSON Schema**: [Timed<T>](Timed<T>.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `data` | T | |
| `timing` | [`SettleTiming`](#settletiming) (optional) | |

---

### PageRequest

**JSON Schema**: [PageRequest](PageRequest.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `limit` | uint | |
| `token` | Option < Array < uint8 > > (optional) | |

---

### Pagination

**JSON Schema**: [Pagination](Pagination.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `limit` | Option < uint > (optional) | |
| `offset` | uint | |

---

### TokenInfoResponse

**JSON Schema**: [TokenInfoResponse](TokenInfoResponse.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `requested_token_metadata` | Array < ( Array < uint8 ; length=32 >, [`TokenMetadata`](#tokenmetadata) ) > | |

---

### TransactionCertificate

A Transaction along with a quorum of validator signatures

**JSON Schema**: [TransactionCertificate](TransactionCertificate.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `envelope` | [`TransactionEnvelope`](#transactionenvelope) | |
| `signatures` | Array < ( [`PublicKeyBytes`](#publickeybytes), [`Signature`](#signature) ) > | |

---

### TransactionWithHash

A Transaction along with its keccak256 hash, i.e. its ID.

**JSON Schema**: [TransactionWithHash](TransactionWithHash.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `transaction` | [`Transaction`](#transaction) | |
| `hash` | Array < uint8 ; length=32 > | Calculated using the keccak256 hash over the data encoded in the same way as for signing. |

---

### TransactionEnvelope

A Transaction along with its sender's signature

**JSON Schema**: [TransactionEnvelope](TransactionEnvelope.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `transaction` | [`Transaction`](#transaction) | |
| `signature` | [`Signature`](#signature) | |
