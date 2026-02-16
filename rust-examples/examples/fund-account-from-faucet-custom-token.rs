#[tokio::main()]
async fn main() -> anyhow::Result<()> {
  // begin-snippet: fund-account-from-faucet-custom-token
  use jsonrpsee::http_client::HttpClient;
  use fast_rust_examples::fastset_types::*;
  use fast_rust_examples::client::ProxyRpcClient;

  let (sender_pub_key, _sender_priv_key) = get_key_pair();

  let client = HttpClient::builder().build("https://proxy.fastset.xyz")?;
  let my_token_id = TokenId::native(); // can replace this with your custom token ID
  client.faucet_drip(sender_pub_key, 10.into(), Some(my_token_id.clone())).await?;
  // end-snippet

  let (req_token_id, balance) = &client.get_account_info(sender_pub_key, Some(vec![my_token_id.clone()]), None, None).await?.token_balance[0];
  assert!(*req_token_id == my_token_id);
  println!("Balance for token id {my_token_id} for account {sender_pub_key} is {}", balance);
  Ok(())
}
