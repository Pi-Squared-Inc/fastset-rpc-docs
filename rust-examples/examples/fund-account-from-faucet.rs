#[tokio::main()]
async fn main() -> anyhow::Result<()> {
  // begin-snippet: fund-account-from-faucet
  use jsonrpsee::http_client::HttpClient;
  use fast_rust_examples::fastset_types::get_key_pair;
  use fast_rust_examples::client::ProxyRpcClient;
  let (sender_pub_key, _sender_priv_key) = get_key_pair();
  let client = HttpClient::builder().build("https://proxy.fastset.xyz")?;
  client.faucet_drip(sender_pub_key, 1_000_000_000.into(), None).await?;
  let balance = client.get_account_info(sender_pub_key, None, None, None).await?.balance;
  println!("Native balance for account {sender_pub_key} is {}", balance);
  // end-snippet
  Ok(())
}
