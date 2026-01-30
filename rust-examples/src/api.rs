use jsonrpsee::core::ClientError;
use jsonrpsee::http_client::HttpClient;

use crate::fastset_types::{
    AccountInfoResponse, Amount, FastSetAddress, PublicKeyBytes,
    SignatureOrMultiSig, TokenId, Transaction,
};

use crate::client::{ProxyRpcClient, ProxySubmitTransactionResult};

////////////////////////////////////////////////////////////////////////////////////////////////////
// Proxy RPC Wrappers
////////////////////////////////////////////////////////////////////////////////////////////////////

pub async fn get_account_info(client: &HttpClient, address: PublicKeyBytes) -> AccountInfoResponse {
    client
        .get_account_info(address, None, None, None)
        .await
        .unwrap()
}

pub async fn faucet_drip(
    client: &HttpClient,
    recipient: FastSetAddress,
    amount: Amount,
) -> Result<(), ClientError> {
    client
        .faucet_drip(recipient, amount, Some(TokenId::native()))
        .await
}

pub async fn submit_transaction(
    client: &HttpClient,
    transaction: Transaction,
    signature: SignatureOrMultiSig,
) -> Result<ProxySubmitTransactionResult, ClientError> {
    client.submit_transaction(transaction, signature).await
}
