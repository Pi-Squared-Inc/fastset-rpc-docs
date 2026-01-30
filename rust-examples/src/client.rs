use crate::fastset_types::*;
use jsonrpsee::proc_macros::rpc;
use serde::{Deserialize, Serialize};

#[allow(clippy::large_enum_variant)]
#[derive(Debug, Serialize, Deserialize)]
pub enum ProxySubmitTransactionResult {
    Success(TransactionCertificate),
    IncompleteVerifierSigs(),
    IncompleteMultiSig(),
}

#[rpc(client, namespace = "proxy")]
pub trait ProxyRpc {
    /// Submit a signed transaction to the proxy to be submitted and settled on the network.
    ///
    /// Upon receipt of the transaction, if the transaction is complete, the proxy will perform the following steps:
    ///
    /// - Submit the signed transaction to all validators known to the proxy;
    /// - Accumulate signatures from all validators which attest that the transaction is valid;
    /// - Submit a transaction certificate (composed of the transaction and a quorum of validator
    ///   signatures) to all validators known to the proxy.
    ///
    /// If the transaction is incomplete, the proxy will store the transaction and await additional
    /// requests which provide the missing information.
    ///
    /// Note that currently, the latter case can only occur when the transaction has [ClaimType] [ExternalClaim]
    /// and has an incomplete list of verifier signatures (see `proxy_submitVerifierSig`).
    ///
    /// The sender's transaction signature is computed using ed25519 where:
    ///
    /// - the public key is stored in the `Transaction` struct's `sender` field
    /// - the message to be signed is the `Transaction` struct serialized using the [
    ///   `BCS` format](https://github.com/zefchain/bcs) with the following special rules:
    ///   - Numerical string ([Amount]/[Balance]) fields are encoded as a little-endian unsigned 256-bit number
    ///     as an array of uint8 of length 32.
    ///
    /// `BCS` serialization libraries are available for several languages:
    ///
    /// - Rust: the [zefchain BCS library](https://github.com/zefchain/bcs) as a [`serde`](https://serde.rs/) backend
    /// - Typescript/Javascript: the [Mysten Labs BCS library](https://www.npmjs.com/package/@mysten/bcs)
    ///
    /// Here is an [example implementation](/docs/client_examples/index.ts) of the transaction signing process using the `@mysten/bcs` and `@noble/ed25519` libraries.
    ///
    /// Input:
    /// - `transaction`: a [Transaction] of any [ClaimType]
    /// - `signature`: a [SignatureOrMultiSig] over the transaction created by the transaction sender
    ///   (with the verifier signatures field set to the empty list prior to signing in the case of [ExternalClaim]s)
    ///
    /// Returns: One of the following:
    ///
    /// - A `ProxySubmitTransactionResult` with a transaction certificate if the transaction is complete and was successfully submitted and validated;
    /// - An `IncompleteVerifierSigs` flag indicating that the transaction is incomplete and has been stored on the proxy for eventual completion and submission.
    ///
    ///
    #[method(name = "submitTransaction", param_kind = map)]
    async fn submit_transaction(
        &self,
        transaction: Transaction,
        signature: SignatureOrMultiSig,
    ) -> RpcResult<ProxySubmitTransactionResult>;

    /// Distribute funds from the proxy's account to the specified account.
    ///
    /// Results in the specified amount of the specified token being added to the specified
    /// account.
    ///
    /// Input:
    /// - `recipient`: [FastSetAddress], the account that should recieve the funds.
    /// - `amount`: [Amount], The amount of funds that should be added.
    /// - `token_id`: Option<[TokenId]>, If `None`, the funds will be added in the form of the
    ///   default token. If a [TokenId] is passed, the funds will be in that token.
    #[method(name = "faucetDrip", param_kind = map)]
    async fn faucet_drip(
        &self,
        recipient: FastSetAddress,
        amount: Amount,
        token_id: Option<TokenId>,
    ) -> RpcResult<()>;

    /// Return information regarding a specific account from some validator known to the proxy.
    ///
    /// Input:
    /// - `address`: [FastSetAddress] of the designated account
    /// - `token_balances_filter`: The set of token types for which a balance request will be made.
    ///   If this parameter is omitted, no custom token balances will be returned; if it is present and empty,
    ///   the balance of all tokens owned by this account will be queried.
    /// - `state_key_filter`: The set of state fields created by this account to be returned.
    ///   If this parameter is omitted, no state fields will be returned; if it is present and empty,
    ///   all state fields created by this account will be returned.
    /// - `certificate_by_nonce`: If passed, a list of transaction certificates within the nonce range
    ///   specified by this parameter submitted by account address will be returned
    ///   (omitting those which do not exist or have been pruned from the validator database).
    ///
    /// Returns:
    /// - [AccountInfoResponse] for the requested account
    #[method(name = "getAccountInfo", param_kind = map)]
    async fn get_account_info(
        &self,
        address: FastSetAddress,
        token_balances_filter: Option<Vec<TokenId>>,
        state_key_filter: Option<Vec<StateKey>>,
        certificate_by_nonce: Option<NonceRange>,
    ) -> RpcResult<AccountInfoResponse>;

    /// Return information regarding a set of tokens from some validator known to the proxy.
    ///
    /// Input:
    /// - `token_ids`: an array of [TokenId]s to look up
    ///
    /// Returns:
    /// - [TokenInfoResponse] containing data for all requested tokens
    #[method(name = "getTokenInfo", param_kind = map)]
    async fn get_token_info(&self, token_ids: Vec<TokenId>) -> RpcResult<TokenInfoResponse>;

    /// Return a proxy-signed, Solidity ABI-encoded [TransactionCertificate] for EVM verification.
    ///
    /// Input:
    /// - `certificate`: [TransactionCertificate] to be encoded and signed
    ///
    /// Returns:
    /// - [CrossSignResponse] containing the proxy's secp256k1 transaction signature and the ABI-encoded transaction
    #[method(name = "evmSignCertificate", param_kind = map)]
    async fn evm_sign_certificate(
        &self,
        certificate: TransactionCertificate,
    ) -> RpcResult<CrossSignResponse>;
}
