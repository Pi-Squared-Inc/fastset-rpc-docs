use std::{
    fmt::{Display, Formatter},
    str::FromStr,
};

use bech32::{Bech32m, Hrp};
use bnum::{BInt, BUint, cast::As as _, types::U256};
use ed25519_dalek::{self as dalek, Signer};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize, de::Error as DesError};
use thiserror::Error;

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct PublicKeyBytes(pub [u8; dalek::PUBLIC_KEY_LENGTH]);

/// Convert address to string in default format (bech32m)
pub fn encode_address(key: &PublicKeyBytes) -> String {
    encode_address_bech32m(key)
}

/// BIP-173 requirements are that the HRP is ASCII in range [33-126]
/// and does not mix uppercase and lowercase.
const ADDRESS_HRP: Hrp = Hrp::parse_unchecked("set");
pub fn encode_address_bech32m(key: &PublicKeyBytes) -> String {
    bech32::encode::<Bech32m>(ADDRESS_HRP, &key.0).expect("bech32m encoding failed")
}

impl Display for PublicKeyBytes {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.write_str(encode_address(self).as_str())
    }
}

pub type FastSetAddress = PublicKeyBytes;
pub type ValidatorName = PublicKeyBytes;

pub struct KeyPair(dalek::SigningKey);

#[derive(Debug, Serialize, Deserialize)]
pub struct Nonce(u64);

impl Display for Nonce {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.write_str(format!("{}", self.0).as_str())
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Quorum(u64);

#[derive(Debug, Serialize, Deserialize)]
#[serde(transparent)]
pub struct TokenId(pub [u8; 32]);

const NATIVE_TOKEN_ID: TokenId = TokenId([
    0xFA, 0x57, 0x5E, 0x70, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

impl TokenId {
    #[inline]
    pub fn native() -> Self {
        NATIVE_TOKEN_ID
    }
}

impl Display for TokenId {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.write_str(&hex::encode(self.0))
    }
}

/// Encodes metadata about a custom token
#[derive(Serialize, Deserialize)]
pub struct TokenMetadata {
    /// number of management operations applied to some token
    pub update_id: Nonce,
    /// the current token admin
    pub admin: FastSetAddress,
    /// the name of the token
    pub token_name: String,
    /// the number of decimals for this token
    pub decimals: u8,
    /// the total supply for this token
    pub total_supply: Amount,
    /// the authorized minting addresses for this token
    pub mints: Vec<FastSetAddress>,
}

#[derive(Eq, PartialEq, Ord, PartialOrd, Copy, Clone, Hash, Default, Debug)]
pub struct Amount(U256);
impl Serialize for Amount {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        if serializer.is_human_readable() {
            self.0.to_str_radix(16).serialize(serializer)
        } else {
            self.0.digits().serialize(serializer)
        }
    }
}
impl<'de> Deserialize<'de> for Amount {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        if deserializer.is_human_readable() {
            Self::from_str(&String::deserialize(deserializer)?).map_err(DesError::custom)
        } else {
            <[u64; 4]>::deserialize(deserializer).map(|digits| Self(U256::from_digits(digits)))
        }
    }
}

impl Display for Amount {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.write_fmt(format_args!("Amount({})", self.0))
    }
}

#[derive(Debug)]
pub struct ParseAmountError;

impl Display for ParseAmountError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.write_str("ParseAmountError")
    }
}

impl std::error::Error for ParseAmountError {}

impl FromStr for Amount {
    type Err = ParseAmountError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Self(
            U256::from_str_radix(s, 16).map_err(|_| ParseAmountError)?,
        ))
    }
}

impl From<u64> for Amount {
    fn from(value: u64) -> Self {
        Amount(value.as_())
    }
}

pub type I320 = BInt<5>;
#[derive(Eq, PartialEq, Ord, PartialOrd, Copy, Clone, Hash, Default, Debug)]
pub struct Balance(I320);
impl Balance {
    pub const fn max() -> Self {
        Balance(I320::parse_str_radix(
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
            16,
        ))
    }

    pub const fn min() -> Self {
        Balance(
            Self::max()
                .0
                .checked_mul(I320::parse_str_radix("-1", 10))
                .unwrap(),
        )
    }
}
impl Serialize for Balance {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        if serializer.is_human_readable() {
            self.0.to_str_radix(16).serialize(serializer)
        } else {
            self.0.as_bits().digits().serialize(serializer)
        }
    }
}
impl<'de> Deserialize<'de> for Balance {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        if deserializer.is_human_readable() {
            Self::from_str(&String::deserialize(deserializer)?).map_err(DesError::custom)
        } else {
            <[u64; 5]>::deserialize(deserializer)
                .map(|digits| Self(I320::from_bits(BUint::<5>::from_digits(digits))))
        }
    }
}

impl std::fmt::Display for Balance {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[derive(Debug)]
pub enum BalanceFromStrError {
    ParseIntError,
    BalanceOverflow,
}

impl Display for BalanceFromStrError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.write_fmt(format_args!("{:#?}", self))
    }
}

impl std::str::FromStr for Balance {
    type Err = BalanceFromStrError;

    fn from_str(src: &str) -> Result<Self, Self::Err> {
        Self::try_from(
            I320::from_str_radix(src, 16).map_err(|_| BalanceFromStrError::ParseIntError)?,
        )
        .map_err(|_| BalanceFromStrError::BalanceOverflow)
    }
}

impl TryFrom<I320> for Balance {
    type Error = FastSetError;

    fn try_from(value: I320) -> Result<Self, Self::Error> {
        if value > Balance::max().0 || value < Balance::min().0 {
            return Err(FastSetError::BalanceOverflow);
        }
        Ok(Self(value))
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserData(pub Option<[u8; 32]>);

#[derive(Serialize, Deserialize)]
pub struct StateKey(pub [u8; 32]);

#[derive(Serialize, Deserialize)]
pub struct State(pub [u8; 32]);

#[derive(Serialize, Deserialize)]
pub struct NonceRange {
    pub start: Nonce,
    pub limit: usize,
}

/// Something that we know how to hash and sign.
pub trait Signable<Hasher> {
    fn write(&self, hasher: &mut Hasher);
}

/// Activate the blanket implementation of `Signable` based on serde and BCS.
/// * We use `serde_name` to extract a seed from the name of structs and enums.
/// * We use `BCS` to generate canonical bytes suitable for hashing and signing.
pub trait BcsSignable: Serialize + serde::de::DeserializeOwned {}

impl<T, Hasher> Signable<Hasher> for T
where
    T: BcsSignable,
    Hasher: std::io::Write,
{
    fn write(&self, hasher: &mut Hasher) {
        let name = serde_name::trace_name::<Self>().expect("Self must be a struct or an enum");
        // Note: This assumes that names never contain the separator `::`.
        write!(hasher, "{}::", name).expect("Hasher should not fail");
        bcs::serialize_into(hasher, &self).expect("Message serialization should not fail");
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Signature(#[serde(with = "serde_arrays")] pub ed25519::SignatureBytes);

impl Signature {
    pub fn new<T>(value: &T, secret: &KeyPair) -> Self
    where
        T: Signable<Vec<u8>>,
    {
        let mut message = Vec::new();
        value.write(&mut message);
        let signature = secret.0.sign(&message);
        Signature(signature.to_bytes())
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MultiSigConfig {
    /// The accounts which may sign for a multisig transaction to be accepted
    pub authorized_signers: Vec<FastSetAddress>,
    /// The minimum number of accounts that must sign
    pub quorum: Quorum,
    /// Arbitrary data. Useful for creating multiple distinct multisig accounts with the same
    /// committee/quorum.
    pub nonce: Nonce,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MultiSig {
    pub config: MultiSigConfig,
    pub signatures: Vec<(FastSetAddress, Signature)>,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum SignatureOrMultiSig {
    Signature(Signature),
    MultiSig(MultiSig),
}

#[derive(Serialize, Deserialize)]
pub struct CrossSignResponse {
    /// The type of signature produced.
    /// - "eip191-abi"
    ///   An EIP-191 (version 0x45 (E)) signature of the ABI-encoded
    ///   serialization of the transaction.
    pub format: String,
    /// signature in hex format
    pub signature: String,
    /// The ABI encoded transaction whose certificate was checked by the proxy
    pub transaction: Vec<u8>,
}

// ====================================================
// We now define the set of basic claims and operations
// ====================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenTransfer {
    /// Token ID to transfer
    pub token_id: TokenId,
    /// Amount to transfer
    pub amount: Amount,
    /// Extra data field to associate with this transfer
    pub user_data: UserData,
}

// ============================
// We now define the claim type
// ============================

// A "claim" is a concept on FastSet that drives state changes on the FastSet network. It is akin to
// the "calldata" of a transaction on Ethereum. There are many types of claims, but in this example,
// others are omitted since we are interested in the Transfer claim.
#[derive(Debug, Serialize, Deserialize)]
pub enum ClaimType {
    /// Transfer or burn tokens (that is, transfer tokens to the burn address)
    TokenTransfer(TokenTransfer),
}

// =======================================================
// We now define transactions, envelopes, and certificates
// =======================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct Transaction {
    /// Address of sender, and intended signer of this transaction
    pub sender: FastSetAddress,
    /// Address of the recipient or the burn address
    pub recipient: FastSetAddress,
    /// A sequence number. Transactions sent by the same account are ordered by nonce.
    pub nonce: Nonce,
    /// Nanos since the Unix epoch.
    pub timestamp_nanos: u128,
    /// Type-dependent data
    pub claim: ClaimType,
    /// Whether this transaction should be archived.
    /// When an archived transaction is confirmed on a validator,
    /// subsequent is_settled requests to that validator must succeed.
    pub archival: bool,
}

impl BcsSignable for Transaction {}


#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionEnvelope {
    pub transaction: Transaction,
    pub signature: SignatureOrMultiSig,
}

impl TransactionEnvelope {
    pub fn new(transaction: Transaction, secret: &KeyPair) -> Self {
        let signature = Signature::new(&transaction, secret);
        Self {
            transaction,
            signature: SignatureOrMultiSig::Signature(signature),
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct ValidatedTransaction {
    pub value: TransactionEnvelope,
    pub validator: ValidatorName,
    pub signature: Signature,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionCertificate {
    pub envelope: TransactionEnvelope,
    pub signatures: Vec<(ValidatorName, Signature)>,
}

#[derive(Serialize, Deserialize)]
pub struct AccountInfoResponse {
    /// The address of the account
    pub sender: FastSetAddress,
    /// Balance in native tokens of the account
    pub balance: Balance,
    /// The next transaction from the account is required to have this nonce.
    pub next_nonce: Nonce,
    /// The transaction that has been validated by the current validator, but not yet confirmed (if
    /// requested)
    pub pending_confirmation: Option<ValidatedTransaction>,
    /// The keys and values of the account's state as requested
    pub requested_state: Vec<(StateKey, State)>,
    /// A single transaction certificate (if requested)
    pub requested_certificates: Option<Vec<TransactionCertificate>>,
    /// A single validated transaction (if requested)
    pub requested_validated_transaction: Option<ValidatedTransaction>,
    /// Token balances of tokens held by this account (may not be all tokens held).
    pub token_balance: Vec<(TokenId, Balance)>,
}

#[derive(Serialize, Deserialize)]
pub struct TokenInfoResponse {
    pub requested_token_metadata: Vec<(TokenId, Option<TokenMetadata>)>,
}

/// FastSet core errors. Only protocol-related errors should be in here.
#[derive(Debug, Serialize, Deserialize, Error)]
pub enum FastSetError {
    #[error("Account balance overflow.")]
    BalanceOverflow,
}

pub fn get_key_pair() -> (FastSetAddress, KeyPair) {
    let mut csprng = OsRng;
    let keypair = dalek::SigningKey::generate(&mut csprng);
    (
        PublicKeyBytes(keypair.verifying_key().to_bytes()),
        KeyPair(keypair),
    )
}
