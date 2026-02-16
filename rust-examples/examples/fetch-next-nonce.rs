#[tokio::main()]
async fn main() -> anyhow::Result<()> {
  // begin-snippet: fetch-next-nonce
  use jsonrpsee::http_client::HttpClient;
  use fast_rust_examples::{fastset_types::*,client::ProxyRpcClient};

  let (sender_pub_key, _sender_priv_key) = get_key_pair();
  let client = HttpClient::builder().build("https://proxy.fastset.xyz")?;
  let next_nonce = client.get_account_info(sender_pub_key, None, None, None).await?.next_nonce;
  println!("Next nonce for account {sender_pub_key} is {next_nonce}");
  // end-snippet
  Ok(())
}
