fn main() -> anyhow::Result<()> {
  // begin-snippet: create-an-account
  use fast_rust_examples::fastset_types::get_key_pair;
  let (sender_pub_key, sender_priv_key) = get_key_pair();
  // end-snippet

  println!("Your requested public/private keypair is shown below.");
  println!("WARNING: Do NOT publish or share your private key with anyone!");
  println!("Public key:  {}", sender_pub_key);
  println!("Private key: {}", unsafe { sender_priv_key.display() });

  Ok(())
}
