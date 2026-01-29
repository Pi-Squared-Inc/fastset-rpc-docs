use jsonrpsee::http_client::HttpClient;


mod fastset_types;
mod client;
mod api;


fn main() {
    let proxy_url = "https://proxy.fastset.xyz";
    let client = HttpClient::builder().build(proxy_url).unwrap();

    println!("Hello, world!");
}
