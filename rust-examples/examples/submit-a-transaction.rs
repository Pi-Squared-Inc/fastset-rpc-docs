#[tokio::main()]
async fn main() -> anyhow::Result<()> {
  // begin-snippet: submit-a-transaction-nonce
  use std::time::{SystemTime, UNIX_EPOCH};
  use jsonrpsee::http_client::HttpClient;
  use fast_rust_examples::fastset_types::*;
  use fast_rust_examples::client::ProxyRpcClient;
  let (sender_pub_key, sender_priv_key) = get_key_pair();
  let client = HttpClient::builder().build("https://proxy.fastset.xyz")?;
  let next_nonce = client.get_account_info(sender_pub_key, None, None, None).await?.next_nonce;
  // end-snippet


  // begin-snippet: submit-a-transaction-build
  let (recipient_pub_key, _recipient_priv_key) = get_key_pair();
  let txn_fee = 10_u64.pow(16);
  let amount = 100;
  client.faucet_drip(sender_pub_key, (txn_fee + amount).into(), None).await?;

  let claim = ClaimType::TokenTransfer(TokenTransfer {
    amount: amount.into(),
    user_data: UserData(None),
    token_id: TokenId::native(),
  });

  let tx = Transaction {
      sender: sender_pub_key,
      recipient: recipient_pub_key,
      nonce: next_nonce,
      claim,
      timestamp_nanos: SystemTime::now()
          .duration_since(UNIX_EPOCH)
          .expect("Current time is before the unix epoch")
          .as_nanos(),
      archival: false,
  };
  // end-snippet

  // begin-snippet: submit-a-transaction-sign
  let signature = SignatureOrMultiSig::Signature(Signature::new(&tx, &sender_priv_key));
  // end-snippet

  // begin-snippet: submit-a-transaction-submit
  let res = client.submit_transaction(tx.clone(), signature).await?;
  // end-snippet

  println!("Sender {sender_pub_key} submitted tx with id {:?} and got result {:?}", tx.tx_id(), res);
  Ok(())
}
