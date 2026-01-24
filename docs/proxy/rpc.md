# Proxy JSON-RPC API Documentation

## List of Endpoints

- [`proxy_submitTransaction`](#proxy_submittransaction)
- [`proxy_faucetDrip`](#proxy_faucetdrip)
- [`proxy_getAccountInfo`](#proxy_getaccountinfo)
- [`proxy_getTokenInfo`](#proxy_gettokeninfo)
- [`proxy_evmSignCertificate`](#proxy_evmsigncertificate)

---

## `proxy_submitTransaction`

Submit a signed transaction to the proxy to be submitted and settled on the network.

Upon receipt of the transaction, if the transaction is complete, the proxy will perform the following steps:

- Submit the signed transaction to all validators known to the proxy;
- Accumulate signatures from all validators which attest that the transaction is valid;
- Submit a transaction certificate (composed of the transaction and a quorum of validator
  signatures) to all validators known to the proxy.

If the transaction is incomplete, the proxy will store the transaction and await additional
requests which provide the missing information.

Note that currently, the latter case can only occur when the transaction has [ClaimType](#claimtype) [ExternalClaim](#externalclaim)
and has an incomplete list of verifier signatures (see `proxy_submitVerifierSig`).

The sender's transaction signature is computed using ed25519 where:

- the public key is stored in the `Transaction` struct's `sender` field
- the message to be signed is the `Transaction` struct serialized using the [
  `BCS` format](https://github.com/zefchain/bcs) with the following special rules:
  - Numerical string ([Amount](#amount)/[Balance](#balance)) fields are encoded as a little-endian unsigned 256-bit number
    as an array of uint8 of length 32.

`BCS` serialization libraries are available for several languages:

- Rust: the [zefchain BCS library](https://github.com/zefchain/bcs) as a [`serde`](https://serde.rs/) backend
- Typescript/Javascript: the [Mysten Labs BCS library](https://www.npmjs.com/package/@mysten/bcs)

Here is an [example implementation](/docs/client_examples/index.ts) of the transaction signing process using the `@mysten/bcs` and `@noble/ed25519` libraries.

Input:
- `transaction`: a [Transaction](#transaction) of any [ClaimType](#claimtype)
- `signature`: a [SignatureOrMultiSig](#signatureormultisig) over the transaction created by the transaction sender
  (with the verifier signatures field set to the empty list prior to signing in the case of [ExternalClaim](#externalclaim)s)

Returns: One of the following:

- A `ProxySubmitTransactionResult` with a transaction certificate if the transaction is complete and was successfully submitted and validated;
- An `IncompleteVerifierSigs` flag indicating that the transaction is incomplete and has been stored on the proxy for eventual completion and submission.



**Parameters**:

| Name | Type |
|------|------|
| `transaction` | [`Transaction`](#transaction) |
| `signature` | [`SignatureOrMultiSig`](#signatureormultisig) |

**Returns**:

[`ProxySubmitTransactionResult`](#proxysubmittransactionresult)

---

## `proxy_faucetDrip`

Distribute funds from the proxy's account to the specified account.

Results in the specified amount of the specified token being added to the specified
account.

Input:
- `recipient`: [FastSetAddress](#fastsetaddress), the account that should recieve the funds.
- `amount`: [Amount](#amount), The amount of funds that should be added.
- `token_id`: Option<[TokenId](#tokenid)>, If `None`, the funds will be added in the form of the
  default token. If a [TokenId](#tokenid) is passed, the funds will be in that token.

**Parameters**:

| Name | Type |
|------|------|
| `recipient` | [`FastSetAddress`](#fastsetaddress) |
| `amount` | [`Amount`](#amount) |
| `token_id` | Option< [`TokenId`](#tokenid) > |

**Returns**:

()

---

## `proxy_getAccountInfo`

Return information regarding a specific account from some validator known to the proxy.

Input:
- `address`: [FastSetAddress](#fastsetaddress) of the designated account
- `token_balances_filter`: The set of token types for which a balance request will be made.
  If this parameter is omitted, no custom token balances will be returned; if it is present and empty,
  the balance of all tokens owned by this account will be queried.
- `state_key_filter`: The set of state fields created by this account to be returned.
  If this parameter is omitted, no state fields will be returned; if it is present and empty,
  all state fields created by this account will be returned.
- `certificate_by_nonce`: If passed, a list of transaction certificates within the nonce range
  specified by this parameter submitted by account address will be returned
  (omitting those which do not exist or have been pruned from the validator database).

Returns:
- [AccountInfoResponse](#accountinforesponse) for the requested account

**Parameters**:

| Name | Type |
|------|------|
| `address` | [`FastSetAddress`](#fastsetaddress) |
| `token_balances_filter` | Option< Vec< [`TokenId`](#tokenid) > > |
| `state_key_filter` | Option< Vec< [`StateKey`](#statekey) > > |
| `certificate_by_nonce` | Option< [`NonceRange`](#noncerange) > |

**Returns**:

[`AccountInfoResponse`](#accountinforesponse)

---

## `proxy_getTokenInfo`

Return information regarding a set of tokens from some validator known to the proxy.

Input:
- `token_ids`: an array of [TokenId](#tokenid)s to look up

Returns:
- [TokenInfoResponse](#tokeninforesponse)(#tokeninforesponse) containing data for all requested tokens

**Parameters**:

| Name | Type |
|------|------|
| `token_ids` | Vec< [`TokenId`](#tokenid) > |

**Returns**:

[`TokenInfoResponse`](#tokeninforesponse)

---

## `proxy_evmSignCertificate`

Return a proxy-signed, Solidity ABI-encoded [TransactionCertificate](#transactioncertificate) for EVM verification.

Input:
- `certificate`: [TransactionCertificate](#transactioncertificate) to be encoded and signed

Returns:
- [CrossSignResponse](#crosssignresponse) containing the proxy's secp256k1 transaction signature and the ABI-encoded transaction

**Parameters**:

| Name | Type |
|------|------|
| `certificate` | [`TransactionCertificate`](#transactioncertificate) |

**Returns**:

[`CrossSignResponse`](#crosssignresponse)

---

## Data Types

---

### ClaimType

One of various types of actions that can be packed into a transaction

**JSON Schema**: [ClaimType](ClaimType.json)

#### Variants:

| Name | Type | Notes |
|------|------|-------|
| `TokenTransfer` | [`TokenTransfer`](#tokentransfer) | Transfer or burn tokens (that is, transfer tokens to the burn address) |
| `TokenCreation` | [`TokenCreation`](#tokencreation) | Create custom token |
| `TokenManagement` | [`TokenManagement`](#tokenmanagement) | Modify custom token |
| `Mint` | [`Mint`](#mint) | Mint funds in a custom token |
| `StateInitialization` | [`StateInitialization`](#stateinitialization) | Initialize the state of an Ethereum blockchain mirroring account |
| `StateUpdate` | [`StateUpdate`](#stateupdate) | Update the state of an Ethereum blockchain mirroring account |
| `ExternalClaim` | [`ExternalClaim`](#externalclaim) | Submit arbitrary data to be settled on the network |
| `StateReset` | [`StateReset`](#statereset) | Reset the state of an Ethereum blockchain mirroring account |
| `JoinCommittee` | ValidatorConfig | Join Committee request Since no escrow is currently involved with the requests we do not check the unicity of the requests and just process them in the order of their timestamps |
| `LeaveCommittee` |  | Leave Committee request Since no escrow is currently involved with the requests we do not check the unicity of the requests and just process them in the order of their timestamps |
| `ChangeCommittee` | CommitteeChange | Change Committee request |
| `Batch` | [`OperationBundle`](#operationbundle) | Perform several operations |

---

### Transaction

Action that can be submitted and confirmed on the network

**JSON Schema**: [Transaction](Transaction.json)

#### Fields:

| Field | Type | Notes |
|-------|------|-------|
| `sender` | [`PublicKeyBytes`](#publickeybytes) | Address of sender, and intended signer of this transaction |
| `recipient` | [`PublicKeyBytes`](#publickeybytes) | Address of the recipient or the burn address |
| `nonce` | [`Nonce`](#nonce) | A sequence number. Transactions sent by the same account are ordered by nonce. |
| `timestamp_nanos` | uint128 | Nanos since the Unix epoch. |
| `claim` | [`ClaimType`](#claimtype) | Type-dependent data |
| `archival` | boolean | Whether this transaction should be archived. When an archived transaction is confirmed on a validator, subsequent is_settled requests to that validator must succeed. |

---

### PublicKeyBytes

A byte sequence that names an entity on or off the FastSet network,
depending on the name of type which stores this value;
typically encoded as an Ed25519 public key,
but may have other formats including but not limited to:
(a) Burn Address - a 32-byte string composed of all 0x00 bytes.
Note: any funds sent to the burn address will be permenantly lost!

**JSON Schema**: [PublicKeyBytes](PublicKeyBytes.json)

`Array < uint8 ; length=32 >`

---

### Nonce

**JSON Schema**: [Nonce](Nonce.json)

`uint64`

---

### TokenTransfer

Transfer tokens to another address

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
The sender of the [Transaction] must be a current mint of the token.
Warning: This is not independent of a token management operation that
removes the sender of this transaction from the list of mints.

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
| `signatures` | Array < [`VerifierSig`](#verifiersig) > | At least `claim.verifier_quorum` signatures over the enclosing `Transaction` (with this field set to the empty list) by members of `claim.verifier_committee` |

---

### OperationBundle

**JSON Schema**: [OperationBundle](OperationBundle.json)

`Array < [`Operation`](#operation) >`

---

### Operation

One of various types of actions that be put in a multi-operation transaction
Payload structs are different from the top-level [ClaimType] where we
need to support multiple operations with different receivers

**JSON Schema**: [Operation](Operation.json)

#### Variants:

| Name | Type | Notes |
|------|------|-------|
| `TokenTransfer` | [`TokenTransferOperation`](#tokentransferoperation) | Transfer or burn tokens (that is, transfer tokens to the burn address) |
| `TokenCreation` | [`TokenCreation`](#tokencreation) | Create custom token |
| `TokenManagement` | [`TokenManagement`](#tokenmanagement) | Modify custom token |
| `Mint` | [`MintOperation`](#mintoperation) | Mint funds in a custom token |
| `StateInitialization` | [`StateInitialization`](#stateinitialization) | Initialize the state of an Ethereum blockchain mirroring account |
| `StateUpdate` | [`StateUpdate`](#stateupdate) | Update the state of an Ethereum blockchain mirroring account |
| `ExternalClaim` | [`ExternalClaim`](#externalclaim) | Submit arbitrary data to be settled on the network |
| `StateReset` | [`StateReset`](#statereset) | Reset the state of an Ethereum blockchain mirroring account |
| `JoinCommittee` | ValidatorConfig | Join Committee request Since no escrow is currently involved with the requests we do not check the unicity of the requests and just process them in the order of their timestamps |
| `LeaveCommittee` |  | Leave Committee request Since no escrow is currently involved with the requests we do not check the unicity of the requests and just process them in the order of their timestamps |
| `ChangeCommittee` | CommitteeChange | Change Committee request |

---

### TokenTransferOperation

Transfer tokens to another address.
This is a variant of [TokenTransfer] that adds a recipient field.

**JSON Schema**: [TokenTransferOperation](TokenTransferOperation.json)

#### Fields:

| Field | Type | Notes |
|-------|------|-------|
| `token_id` | Array < uint8 ; length=32 > | Token ID to transfer |
| `recipient` | [`PublicKeyBytes`](#publickeybytes) | Recipient |
| `amount` | [`Amount`](#amount) | Amount to transfer |
| `user_data` | [`UserData`](#userdata) | Extra data field to associate with this transfer |

---

### MintOperation

Create more funds of a token.
The sender of the [Transaction] must be a current mint of the token.
Warning: This is not independent of a token management operation that
removes the sender of this transaction from the list of mints.
This is a variant of [Mint] that adds a recipient field.

**JSON Schema**: [MintOperation](MintOperation.json)

#### Fields:

| Field | Type | Notes |
|-------|------|-------|
| `token_id` | Array < uint8 ; length=32 > | Token ID. This is the hash of the TokenCreation transaction that created the token. This is calculated using the keccak256 hash over the data encoded in the same way as for signing. |
| `recipient` | [`PublicKeyBytes`](#publickeybytes) | Recipient of the new funds |
| `amount` | [`Amount`](#amount) | Amount to mint |

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

### StateInitialization

Initialize one state cell of a blockchain mirroring account

**JSON Schema**: [StateInitialization](StateInitialization.json)

#### Fields:

| Field | Type | Notes |
|-------|------|-------|
| `key` | [`StateKey`](#statekey) | Key to initialize |
| `initial_state` | [`State`](#state) | Initial state |

---

### StateUpdate

Update the state of a blockchain mirroring account

**JSON Schema**: [StateUpdate](StateUpdate.json)

#### Fields:

| Field | Type | Notes |
|-------|------|-------|
| `key` | [`StateKey`](#statekey) | Key to update |
| `previous_state` | [`State`](#state) | Previous state |
| `next_state` | [`State`](#state) | Next state |
| `compute_claim_tx_hash` | Array < uint8 ; length=32 > | |
| `compute_claim_tx_timestamp` | uint128 | |

---

### State

**JSON Schema**: [State](State.json)

`Array < uint8 ; length=32 >`

---

### StateKey

**JSON Schema**: [StateKey](StateKey.json)

`Array < uint8 ; length=32 >`

---

### StateReset

Reset the state of a blockchain mirroring account
This claim type is a temporary work-around that allows a left behind account to
be easily caught up with the target blockchain's tip. In the future this claim type
will be dropped and a left-behind mirroring account will need to settle all
missed state updates in order to be caught up.

**JSON Schema**: [StateReset](StateReset.json)

#### Fields:

| Field | Type | Notes |
|-------|------|-------|
| `key` | [`StateKey`](#statekey) | Key to reset |
| `reset_state` | [`State`](#state) | Reset state |

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

A byte sequence that names an entity on or off the FastSet network,
depending on the name of type which stores this value;
typically encoded as an Ed25519 public key,
but may have other formats including but not limited to:
(a) Burn Address - a 32-byte string composed of all 0x00 bytes.
Note: any funds sent to the burn address will be permenantly lost!

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

### SignatureOrMultiSig

**JSON Schema**: [SignatureOrMultiSig](SignatureOrMultiSig.json)

#### Variants:

| Name | Type | Notes |
|------|------|-------|
| `Signature` | [`Signature`](#signature) | |
| `MultiSig` | [`MultiSig`](#multisig) | |

---

### MultiSig

**JSON Schema**: [MultiSig](MultiSig.json)

#### Fields:

| Field | Type | Notes |
|-------|------|-------|
| `config` | [`MultiSigConfig`](#multisigconfig) | |
| `signatures` | Array < ( [`PublicKeyBytes`](#publickeybytes), [`Signature`](#signature) ) > | |

---

### MultiSigConfig

Together, determines the address of a multisig account.

**JSON Schema**: [MultiSigConfig](MultiSigConfig.json)

#### Fields:

| Field | Type | Notes |
|-------|------|-------|
| `authorized_signers` | Array < [`PublicKeyBytes`](#publickeybytes) > | The accounts which may sign for a multisig transaction to be accepted |
| `quorum` | [`Quorum`](#quorum) | The minimum number of accounts that must sign |
| `nonce` | [`Nonce`](#nonce) | Arbitrary data. Useful for creating multiple distinct multisig accounts with the same committee/quorum. |

---

### VerifierSig

**JSON Schema**: [VerifierSig](VerifierSig.json)

#### Fields:

| Field | Type | Notes |
|-------|------|-------|
| `verifier_addr` | [`PublicKeyBytes`](#publickeybytes) | |
| `sig` | [`Signature`](#signature) | |

---

### PageRequest

A client->server RPC message used to request a bounded number of
records from the server starting from a given index or offset.

A client may safely issue multiple `PageRequest`s in parallel.

To avoid requesting redundant information, when issuing parallel
requests, ensure that the ranges `[r.token, r.token+r.limit)` for
each request `r` are non-overlapping, where `r.token` defaults
to `0` if `None`.

**JSON Schema**: [PageRequest](PageRequest.json)

#### Fields:

| Field | Type | Notes |
|-------|------|-------|
| `limit` | uint | The maximum number of records desired from the server. The server may return less records, but it will not return more. |
| `token` | Option < uint64 > (optional) | The index or offset from which to begin querying records. If this field is absent, it defaults to offset 0 (equivalently, the index of the first record), i.e., the initial records will be returned. |

---

### Timed<T>

**JSON Schema**: [Timed<T>](Timed<T>.json)

#### Fields:

| Field | Type | Notes |
|-------|------|-------|
| `data` | T | |
| `timing` | [`SettleTiming`](#settletiming) (optional) | |

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

A server->client RPC message sent in response to a `PageRequest`.

**JSON Schema**: [Page<T>](Page<T>.json)

#### Fields:

| Field | Type | Notes |
|-------|------|-------|
| `data` | Array < T > | The records returned from the server in response to a `PageRequest`. |
| `next_page_token` | uint64 | A token that can be passed in a subsequent `PageRequest.token` field in order to continue querying the database from starting from the last record returned by this response. |

---

### TokenInfoResponse

**JSON Schema**: [TokenInfoResponse](TokenInfoResponse.json)

#### Fields:

| Field | Type | Notes |
|-------|------|-------|
| `requested_token_metadata` | Array < ( Array < uint8 ; length=32 >, [`TokenMetadata`](#tokenmetadata) ) > | |

---

### ProxySubmitTransactionResult

**JSON Schema**: [ProxySubmitTransactionResult](ProxySubmitTransactionResult.json)

#### Variants:

| Name | Type | Notes |
|------|------|-------|
| `Success` | [`TransactionCertificate`](#transactioncertificate) | |
| `IncompleteVerifierSigs` | array | |
| `IncompleteMultiSig` | array | |

---

### TransactionInfo

**JSON Schema**: [TransactionInfo](TransactionInfo.json)

#### Fields:

| Field | Type | Notes |
|-------|------|-------|
| `hash` | Array < uint8 ; length=32 > | |
| `sender` | [`PublicKeyBytes`](#publickeybytes) | |
| `recipient` | [`PublicKeyBytes`](#publickeybytes) | |
| `nonce` | [`Nonce`](#nonce) | |
| `claim` | [`ClaimType`](#claimtype) | |
| `submission_timestamp_nanos` | uint128 | |

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
| `requested_state` | Array < ( [`StateKey`](#statekey), [`State`](#state) ) > | The keys and values of the account's state as requested |
| `requested_certificates` | Option < Array < [`TransactionCertificate`](#transactioncertificate) > > (optional) | A single transaction certificate (if requested) |
| `requested_validated_transaction` | [`ValidatedTransaction`](#validatedtransaction) (optional) | A single validated transaction (if requested) |
| `token_balance` | Array < ( Array < uint8 ; length=32 >, [`Balance`](#balance) ) > | Token balances of tokens held by this account (may not be all tokens held). |

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

A server->client RPC message sent in response to a `PageRequest`.

**JSON Schema**: [Page<T>](Page<T>.json)

#### Fields:

| Field | Type | Notes |
|-------|------|-------|
| `data` | Array < T > | The records returned from the server in response to a `PageRequest`. |
| `next_page_token` | uint64 | A token that can be passed in a subsequent `PageRequest.token` field in order to continue querying the database from starting from the last record returned by this response. |

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

A client->server RPC message used to request a bounded number of
records from the server starting from a given index or offset.

A client may safely issue multiple `PageRequest`s in parallel.

To avoid requesting redundant information, when issuing parallel
requests, ensure that the ranges `[r.token, r.token+r.limit)` for
each request `r` are non-overlapping, where `r.token` defaults
to `0` if `None`.

**JSON Schema**: [PageRequest](PageRequest.json)

#### Fields:

| Field | Type | Notes |
|-------|------|-------|
| `limit` | uint | The maximum number of records desired from the server. The server may return less records, but it will not return more. |
| `token` | Option < uint64 > (optional) | The index or offset from which to begin querying records. If this field is absent, it defaults to offset 0 (equivalently, the index of the first record), i.e., the initial records will be returned. |

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

### TransactionEnvelope

A Transaction along with its sender's signature

**JSON Schema**: [TransactionEnvelope](TransactionEnvelope.json)

#### Fields:

| Field | Type | Notes |
|-------|------|-------|
| `transaction` | [`Transaction`](#transaction) | |
| `signature` | [`SignatureOrMultiSig`](#signatureormultisig) | |

---

### CrossSignResponse

**JSON Schema**: [CrossSignResponse](CrossSignResponse.json)

#### Fields:

| Field | Type | Notes |
|-------|------|-------|
| `format` | string | The type of signature produced. - "eip191-abi"   An EIP-191 (version 0x45 (E)) signature of the ABI-encoded   serialization of the transaction. |
| `signature` | string | signature in hex format |
| `transaction` | Array < uint8 > | The ABI encoded transaction whose certificate was checked by the proxy |

---

### NonceRange

**JSON Schema**: [NonceRange](NonceRange.json)

#### Fields:

| Field | Type | Notes |
|-------|------|-------|
| `start` | [`Nonce`](#nonce) | |
| `limit` | uint | |
