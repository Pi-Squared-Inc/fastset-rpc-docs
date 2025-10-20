# Proxy JSON-RPC API Documentation

## List of Endpoints

- [`set_proxy_submitTransaction`](#set_proxy_submittransaction)
- [`set_proxy_submitVerifierSig`](#set_proxy_submitverifiersig)
- [`set_proxy_synchronizeAccount`](#set_proxy_synchronizeaccount)
- [`set_proxy_faucetDrip`](#set_proxy_faucetdrip)
- [`set_proxy_getAccountInfo`](#set_proxy_getaccountinfo)
- [`set_proxy_getTokenInfo`](#set_proxy_gettokeninfo)
- [`set_proxy_getTransfers`](#set_proxy_gettransfers)
- [`set_proxy_getClaims`](#set_proxy_getclaims)
- [`set_proxy_getClaimsByAddress`](#set_proxy_getclaimsbyaddress)
- [`set_proxy_getCertificateByNonce`](#set_proxy_getcertificatebynonce)
- [`set_proxy_evmSignCertificate`](#set_proxy_evmsigncertificate)

---

## `set_proxy_submitTransaction`

Submits a transaction to the proxy to be submitted and settled on the network.
- Sends the signed transaction to all validators known to the proxy
- Recieves back a signature from each one, assuming the transaction is valid.
- Aggregates those signatures and sends the resulting certificate to each validator

The signature is computed using ed25519 where:

- the public key is stored in the `Transaction` struct's `sender` field
- the message to be signed is the `Transaction` struct serialized using the [
  `BCS` format](https://github.com/zefchain/bcs) with the following special rules:
    - Numerical string ([Amount](#amount)/[Balance](#balance)) fields are encoded as a litte-endian unsigned 256-bit number
      as an array of uint8 of length 32.

`BCS` serialization libraries are available for several languages:

- Rust: the [zefchain BCS library](https://github.com/zefchain/bcs) as a [`serde`](https://serde.rs/) backend
- Typescript/Javascript: the [Mysten Labs BCS library](https://www.npmjs.com/package/@mysten/bcs)

Here is an [example implementation](/docs/client_examples/index.ts) of the serde and signing process using the `@mysten/bcs` and `@noble/ed25519` libraries.

Input:
- `transaction`: a [Transaction](#transaction) of any [ClaimType](#claimtype)
- `signature`: a [SignatureOrMultiSig](#signatureormultisig) over the transaction created by transaction.sender
(with the verifier signatures field set to the empty list in the case of [ExternalClaim](#externalclaim)s)

Returns:
- A certificate for the transaction if the transaction was successfully submitted


**Parameters**:

| Name | Type |
|------|------|
| `transaction` | [`Transaction`](#transaction) |
| `signature` | [`SignatureOrMultiSig`](#signatureormultisig) |

**Returns**:

[`ProxySubmitTransactionResult`](#proxysubmittransactionresult)

---

## `set_proxy_submitVerifierSig`

Adds a verifier's signature to an ExternalClaim handled by the proxy. If the signature
results in the quorum being reached for that claim, it will be submitted to the network. If
not, the proxy will continue waiting for more verifier signatures.

Input:
- `transaction`: a [Transaction](#transaction) of [ClaimType](#claimtype) [ExternalClaim](#externalclaim)
- `signature`: a [VerifierSig](#verifiersig) over the transaction created by the verifier who is a member
of the authorized signers list specified in `transaction`. Note that this signature must
not cover verifier signatures field itself, that is, it should be set to the empty list before
signing.

Returns:
- A `ProxySubmitTransactionResult` with a certificate for the transaction if the transaction was
successfully submitted, otherwise `IncompleteVerifierSigs`.


**Parameters**:

| Name | Type |
|------|------|
| `transaction` | [`Transaction`](#transaction) |
| `signature` | [`VerifierSig`](#verifiersig) |
| `index` | u8 |

**Returns**:

[`ProxySubmitTransactionResult`](#proxysubmittransactionresult)

---

## `set_proxy_synchronizeAccount`

If an account has a pending claim (submitted to some or all validators but not yet
confirmed), this will cause the proxy to attempt to finish the confirmation step. If there
is no pending transaction on any validator, this will fail. If different validators
disagree on what the pending transaction is, it will also fail.

Input:
- `account`: a [FastSetAddress](#fastsetaddress) of the account to synchronize.

Returns:
- A `TransactionCertificate` for the confirmed transaction, if any.


**Parameters**:

| Name | Type |
|------|------|
| `account` | [`FastSetAddress`](#fastsetaddress) |

**Returns**:

[`TransactionCertificate`](#transactioncertificate)

---

## `set_proxy_faucetDrip`

Distributes funds from the proxy's account to the specified account.
- Results in the specified amount and of the specified token being added to the specified
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

## `set_proxy_getAccountInfo`

Queries info for a specific account from some validator.

Input:
- `address`: The account to query
- `token_balances_filter`: If passed, only those tokens included in the list will be in the
  returned map. Otherwise, all held tokens will be returned.
- `certificatee_by_nonce`: If passed, the confirmed certificate with the requested nonce
  wil be returned.

Returns:
- [AccountInfoResponse](#accountinforesponse) for the requested account

**Parameters**:

| Name | Type |
|------|------|
| `address` | [`FastSetAddress`](#fastsetaddress) |
| `token_balances_filter` | Option< Vec< [`TokenId`](#tokenid) > > |
| `certificate_by_nonce` | Option< [`Nonce`](#nonce) > |

**Returns**:

[`AccountInfoResponse`](#accountinforesponse)

---

## `set_proxy_getTokenInfo`

Get token info from one of the validators

Input:
- `token_ids`: an array of 32 byte arrays representing token ids to query

Returns:
- [TokenInfoResponse](#tokeninforesponse)(#tokeninforesponse) containing data for all requested tokens

**Parameters**:

| Name | Type |
|------|------|
| `token_ids` | Vec< [`TokenId`](#tokenid) > |

**Returns**:

[`TokenInfoResponse`](#tokeninforesponse)

---

## `set_proxy_getTransfers`

Get paginated transfers from one of the validators

Input:
- `page`: PageRequest defining the page to return

Returns:
- Page<Timed<Transfer>> containing all transfers on the requested page

**Parameters**:

| Name | Type |
|------|------|
| `page` | [`PageRequest`](#pagerequest) |

**Returns**:

Page< Timed< [`TransactionInfo`](#transactioninfo) > >

---

## `set_proxy_getClaims`

Get paginated claims fromm one of the validators

Input:
- `confirmed`: Request confirmed claims instead of pending
- `page`: PageRequest defining the page to return

Returns:
- Page<Timed<ExternalClaim>> containing all claims on the requested page

**Parameters**:

| Name | Type |
|------|------|
| `page` | [`PageRequest`](#pagerequest) |

**Returns**:

Page< Timed< [`ExternalClaim`](#externalclaim) > >

---

## `set_proxy_getClaimsByAddress`

Get all external claims sent by this address from one of the validators

Input:
- `address`: Query claims sent by this address
- `page`: PageRequest defining the page to return

Returns:
- Array<TransactionWithHash> containing all on the requested page sent by the requesed
  adddress

**Parameters**:

| Name | Type |
|------|------|
| `address` | [`FastSetAddress`](#fastsetaddress) |
| `page` | [`Pagination`](#pagination) |

**Returns**:

Vec< [`TransactionWithHash`](#transactionwithhash) >

---

## `set_proxy_getCertificateByNonce`

Get a full transaction certificate for
a given sender and nonce

Input:
- `sender`: `FastSetAddress` of the account being queried
- `nonce`: `Nonce` of the certificate to return

Returns:
- [TransactionCertificate](#transactioncertificate) of the requested certificate, if it exists.


**Parameters**:

| Name | Type |
|------|------|
| `sender` | [`FastSetAddress`](#fastsetaddress) |
| `nonce` | [`Nonce`](#nonce) |

**Returns**:

[`TransactionCertificate`](#transactioncertificate)

---

## `set_proxy_evmSignCertificate`

Check a fastset certificate and sign the underlying transaction
with the proxy's secp256k1 key, for EVM verification.

Input:
- `certificate`: The certificate to check

Returns:
- [CrossSignResponse](#crosssignresponse) containing the secp256k1 signature and
  the extracted transaction

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

Initialize the state of a blockchain mirroring account

**JSON Schema**: [StateInitialization](StateInitialization.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `initial_state` | [`State`](#state) | Initial state |

---

### StateUpdate

Update the state of a blockchain mirroring account

**JSON Schema**: [StateUpdate](StateUpdate.json)

#### Fields:
| Field | Type | Notes |
|-------|------|-------|
| `previous_state` | [`State`](#state) | Previous state |
| `next_state` | [`State`](#state) | Next state |
| `compute_claim_tx_hash` | Array < uint8 ; length=32 > | |
| `compute_claim_tx_timestamp` | uint128 | |

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
| `reset_state` | [`State`](#state) | Reset state |

---

### State

**JSON Schema**: [State](State.json)

`Array < uint8 ; length=32 >`

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
| `state` | [`State`](#state) (optional) | State of a FastSet account that mirrors an Ethereum blockchain |
| `next_nonce` | [`Nonce`](#nonce) | The next transaction from the account is required to have this nonce. |
| `pending_confirmation` | [`ValidatedTransaction`](#validatedtransaction) (optional) | The transaction that has been validated by the current validator, but not yet confirmed (if requested) |
| `requested_certificate` | [`TransactionCertificate`](#transactioncertificate) (optional) | A single transaction certificate (if requested) |
| `requested_validated_transaction` | [`ValidatedTransaction`](#validatedtransaction) (optional) | A single validated transaction (if requested) |
| `requested_received_transfers` | Array < [`TransactionCertificate`](#transactioncertificate) > | Certificates responding to transfers where this account is the recipient (if requested) |
| `token_balance` | Array < ( Array < uint8 ; length=32 >, [`Balance`](#balance) ) > | Token balances of tokens held by this account (may not be all tokens held). |
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
