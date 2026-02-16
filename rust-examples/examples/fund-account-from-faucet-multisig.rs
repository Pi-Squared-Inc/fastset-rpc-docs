#[tokio::main]
async fn main() -> anyhow::Result<()> {
  // begin-snippet: fund-account-from-faucet-multisig
  use jsonrpsee::http_client::HttpClient;
  use fast_rust_examples::{fastset_types::*, client::ProxyRpcClient};

  let multisig_config = MultiSigConfig {
      nonce: Nonce::from(0),
      quorum: Quorum::from(2),
      authorized_signers: vec![get_key_pair().0,get_key_pair().0,get_key_pair().0],
  };

  let multisig_address = PublicKeyBytes(multisig_config.address());

  let client = HttpClient::builder().build("https://proxy.fastset.xyz").unwrap();
  client.faucet_drip(multisig_address, 10.into(), None).await?;
  // end-snippet

  Ok(())
}
