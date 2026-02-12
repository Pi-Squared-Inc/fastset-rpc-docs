use std::{str::FromStr, time::SystemTime};

use jsonrpsee::http_client::HttpClient;

use crate::fastset_types::ClaimData;
use crate::{
    api::{faucet_drip, get_account_info, submit_transaction},
    client::ProxySubmitTransactionResult,
    fastset_types::{
        get_key_pair, Amount, Balance, ClaimType, ExternalClaim, ExternalClaimBody, FastSetAddress,
        Nonce, Quorum, TokenId, TokenTransfer, Transaction, TransactionEnvelope, UserData,
    },
};

mod api;
mod client;
mod fastset_types;

const PROXY_URL: &str = "https://proxy.fastset.xyz";

pub async fn get_next_nonce(client: &HttpClient, address: FastSetAddress) -> Nonce {
    // Fetching the next nonce to use in the transaction.
    // If the account is fresh, the next nonce will be 0
    get_account_info(client, address).await.next_nonce
}

pub async fn get_balance(client: &HttpClient, address: FastSetAddress) -> Balance {
    get_account_info(client, address).await.balance
}

// This example shows how to sign and submit a transaction to the FastSet network via the proxy.
// More information can be found in the docs folder.
//
// NOTE: when talking to validators, balances are encoded as hexadecimal numbers in JSON strings
#[tokio::main]
async fn main() {
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Generating keys for testing
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    let (sender_pub_key, sender_keypair) = get_key_pair();
    let (recipient_pub_key, _recipient_priv_key) = get_key_pair();

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Setting up the client to talk to the proxy
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    let client = HttpClient::builder().build(PROXY_URL).unwrap();

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Funding sender account from the faucet
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    let requested_amt = Amount::from(1_000_000_000_000_000_000u64); // 1 million native tokens
    faucet_drip(&client, sender_pub_key, requested_amt)
        .await
        .unwrap_or_else(|err|
            panic!("Error while dripping amount {requested_amt} tokens to account {sender_pub_key}. Error: {err}")
        );

    println!("Dripped amount {requested_amt} tokens to account {sender_pub_key}.");

    let acct_balance = get_balance(&client, sender_pub_key).await;
    println!("Account {sender_pub_key} balance before transfer: {acct_balance}");

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Build and sign a transaction from sender
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    println!("Transferring 65535 tokens from {sender_pub_key} to {recipient_pub_key}.");

    let nonce = get_next_nonce(&client, sender_pub_key).await;

    let transaction = Transaction {
        sender: sender_pub_key,
        recipient: recipient_pub_key,
        nonce, // an incorrect nonce leads to an invalid txn
        timestamp_nanos: SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_nanos(),
        claim: ClaimType::TokenTransfer(TokenTransfer {
            token_id: TokenId::native(),
            amount: Amount::from_str("ffff").unwrap(), // 65535 native tokens
            user_data: UserData(None),
        }),
        archival: false,
    };

    let envelope = TransactionEnvelope::new(transaction, &sender_keypair);

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Submit the signed transaction to the proxy
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    let submit_res = submit_transaction(&client, envelope.transaction, envelope.signature)
        .await
        .unwrap_or_else(|err| {
            panic!("Error while submitting transaction: {err}");
        });
    match submit_res {
        ProxySubmitTransactionResult::Success(cert) => {
            println!("Transaction submitted successfully.");
            println!("Certificate {cert:?}");
        }
        ProxySubmitTransactionResult::IncompleteVerifierSigs() => {
            panic!(
                "Transaction submission resulted in incomplete verifier signatures. This should not happen in normal circumstances."
            );
        }
        ProxySubmitTransactionResult::IncompleteMultiSig() => unimplemented!(),
    }

    let sender_balance = get_balance(&client, sender_pub_key).await;
    println!("Account {sender_pub_key} balance after transfer: {sender_balance}");

    let recipient_balance = get_balance(&client, recipient_pub_key).await;
    println!("Account {recipient_pub_key} balance after transfer: {recipient_balance}");

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Example: transaction with an external claim
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    let nonce = get_next_nonce(&client, sender_pub_key).await;

    let transaction = Transaction {
        sender: sender_pub_key,
        recipient: sender_pub_key,
        nonce,
        timestamp_nanos: SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_nanos(),
        claim: ClaimType::ExternalClaim(ExternalClaim {
            claim: ExternalClaimBody {
                verifier_committee: vec![sender_pub_key],
                verifier_quorum: Quorum::from(1),
                claim_data: ClaimData::from("hello".to_string()),
            },
            signatures: vec![],
        }),
        archival: false,
    };
    let mut envelope = TransactionEnvelope::new(transaction, &sender_keypair);
    envelope.add_verifier_sig(&sender_keypair);
    println!("Submitting transaction (ExternalClaim) to proxy...");
    let submit_res = submit_transaction(&client, envelope.transaction, envelope.signature)
        .await
        .unwrap_or_else(|err| {
            panic!("Error while submitting transaction: {err}");
        });
    match submit_res {
        ProxySubmitTransactionResult::Success(cert) => {
            println!("Transaction submitted successfully.");
            println!("Certificate {cert:?}");
        }
        ProxySubmitTransactionResult::IncompleteVerifierSigs() => {
            // You can try changing `verifier_quorum` to be bigger than the length of `signatures`, and it will result in this response
            panic!("Transaction submission resulted in incomplete verifier signatures.");
        }
        ProxySubmitTransactionResult::IncompleteMultiSig() => unimplemented!(),
    }
}
