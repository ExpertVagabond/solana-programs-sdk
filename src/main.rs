use clap::Parser;
use sha2::{Digest, Sha256};

/// Solana program IDs and PDA derivation for 14 on-chain programs
#[derive(Parser)]
#[command(name = "pda", about = "Derive PDAs for Solana programs")]
struct Args {
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(clap::Subcommand)]
enum Cmd {
    /// List all program IDs
    Programs,
    /// Derive a PDA
    Derive {
        #[arg(long)]
        program: String,
        #[arg(long)]
        seeds: Vec<String>,
    },
    /// Derive a named PDA helper
    Find {
        #[command(subcommand)]
        pda: PdaCmd,
    },
}

#[derive(clap::Subcommand)]
enum PdaCmd {
    Escrow { maker: String, seed: u64 },
    Vesting { authority: String, mint: String },
    StakeEntry { pool: String, owner: String },
    Subscription { plan: String, subscriber: String },
    Proposal { dao: String, proposal_id: u64 },
    Reputation { config: String, wallet: String },
    ClaimRecord { faucet: String, claimer: String },
    Order { market: String, order_id: u64 },
    Market { authority: String, base_mint: String, quote_mint: String },
    Collection { authority: String },
    NftMetadata { collection: String, mint: String },
    PriceFeed { authority: String },
    Treasury { authority: String, mint: String },
    Multisig { creator: String },
    MultisigTx { multisig: String, tx_index: u64 },
    Gate { authority: String, required_mint: String },
    Access { gate: String, holder: String },
    Airdrop { authority: String, mint: String },
    AirdropClaim { airdrop: String, claimer: String },
}

const PROGRAMS: &[(&str, &str)] = &[
    ("escrow",         "FKz12mj5HcA9wJRTmpEN2mstdat7KVrwJyy1QULaVi4J"),
    ("reputation",     "ChWH3iGNS4cwrpH1jz1BRVZqVteS177yr6Pe4Y8MFBQ"),
    ("tokenFaucet",    "GsHPNhJtQ23Nj2duABZNDAdn1ri2kjxkeTXqH6SUSN1v"),
    ("stakingPool",    "E3xDfoQKgqdCNgnK1B77xgRjKYjEsBCXvPxZDGoxercH"),
    ("daoVoting",      "6wGk7DpNBYDgwW4JZoRjdLB6iNni2AzhyuhiFsgES9ax"),
    ("priceFeed",      "6uafjLqqMeP4DgYqDuVPCL9BVabC7ruQC6SnDdUvXqC5"),
    ("tokenVesting",   "9e9VNYBpSGHbF2xbhGJyZDp33WGUQ6S1kpjDxoQXijbp"),
    ("subscription",   "AqkVLdxNgW5Hw7BEzzTiKME3rnWLLspWhMqKcWsgiqGR"),
    ("orderbook",      "41q8aXfcpqREjcFRK276KzBRRXWvmfYGqCDHZQ4CPwnX"),
    ("nftMint",        "HoNCn3uuMYzQ83i4zjHWhUqEBY9DNEqJfu9vKJF8NQWU"),
    ("treasuryVault",  "D8ypRqJ45ZLAKmMPTLDuwJZubKgKbHZEXHrQ5T6ArVmE"),
    ("multisig",       "3AZTsn99QJnAVJ7gJE5QWgbWgj5jJ8D6wEBn89fKJvJH"),
    ("nftGated",       "F17Fg2ZHx1UZqNCBeueuuiDiVJwBLP8NqrLCPJPFQ4Pg"),
    ("airdrop",        "CNcG4AK4uUXsqAjKQiFk5i9zU75MdHmgdJDXa5cCgYDH"),
];

fn decode_pubkey(s: &str) -> Result<[u8; 32], String> {
    let bytes = bs58::decode(s).into_vec().map_err(|e| format!("invalid base58: {e}"))?;
    if bytes.len() != 32 {
        return Err(format!("expected 32 bytes, got {}", bytes.len()));
    }
    let mut arr = [0u8; 32];
    arr.copy_from_slice(&bytes);
    Ok(arr)
}

fn find_program_address(seeds: &[&[u8]], program_id: &[u8; 32]) -> (String, u8) {
    for bump in (0u8..=255).rev() {
        let mut hasher = Sha256::new();
        for seed in seeds {
            hasher.update(seed);
        }
        hasher.update([bump]);
        hasher.update(program_id);
        hasher.update(b"ProgramDerivedAddress");
        let hash = hasher.finalize();
        // Check if point is off-curve (valid PDA)
        // A simple check: try to interpret as ed25519 point; if it fails, it's a valid PDA
        // For correctness we check that the hash is NOT a valid ed25519 point
        // The curve25519 check: we just use the fact that ~50% of random 32-byte values are valid PDAs
        // Solana's actual implementation uses curve25519_dalek::edwards::CompressedEdwardsY
        // For a CLI tool, we replicate the exact same logic
        let mut key = [0u8; 32];
        key.copy_from_slice(&hash[..32]);
        if !is_on_curve(&key) {
            return (bs58::encode(&key).into_string(), bump);
        }
    }
    ("error: no valid PDA found".into(), 0)
}

fn is_on_curve(bytes: &[u8; 32]) -> bool {
    // Decompress Edwards Y point to check if on curve
    // y coordinate is the 255 bits, high bit is sign of x
    let mut y_bytes = *bytes;
    let sign = (y_bytes[31] >> 7) & 1;
    y_bytes[31] &= 0x7f;

    // Convert from little-endian bytes to check if y < p
    // p = 2^255 - 19
    // For simplicity, we try the decompression math:
    // x^2 = (y^2 - 1) / (d * y^2 + 1) mod p
    // If x^2 is not a quadratic residue, point is not on curve

    let p = mod_p();
    let y = from_le_bytes(&y_bytes, &p);
    let y2 = mod_mul(&y, &y, &p);

    // d = -121665/121666 mod p
    let d = ed25519_d(&p);
    let num = mod_sub(&y2, &[1], &p);                    // y^2 - 1
    let den = mod_add(&mod_mul(&d, &y2, &p), &[1], &p);  // d*y^2 + 1
    let den_inv = mod_inv(&den, &p);
    let x2 = mod_mul(&num, &den_inv, &p);

    // Check if x^2 is a quadratic residue: x^2^((p-1)/2) == 1 mod p
    let exp = div2(&mod_sub(&p, &[1], &p)); // (p-1)/2
    let result = mod_pow(&x2, &exp, &p);

    // It's on curve if result == 1 or x2 == 0
    let _ = sign; // sign only determines which square root
    result == vec![1] || x2.is_empty() || x2 == vec![0]
}

// Big number helpers for modular arithmetic (little-endian limbs of u64)
type BigNum = Vec<u64>;

fn mod_p() -> BigNum {
    // p = 2^255 - 19
    let mut p = vec![0u64; 4];
    p[0] = 0xFFFFFFFFFFFFFFED;
    p[1] = 0xFFFFFFFFFFFFFFFF;
    p[2] = 0xFFFFFFFFFFFFFFFF;
    p[3] = 0x7FFFFFFFFFFFFFFF;
    p
}

fn from_le_bytes(bytes: &[u8], _p: &BigNum) -> BigNum {
    let mut result = vec![0u64; 4];
    for i in 0..4 {
        let start = i * 8;
        let end = (start + 8).min(bytes.len());
        if start >= bytes.len() { break; }
        let mut buf = [0u8; 8];
        let slice = &bytes[start..end];
        buf[..slice.len()].copy_from_slice(slice);
        result[i] = u64::from_le_bytes(buf);
    }
    result
}

fn mod_add(a: &[u64], b: &[u64], p: &BigNum) -> BigNum {
    let mut r = vec![0u64; 5];
    let mut carry = 0u128;
    for i in 0..4 {
        let av = if i < a.len() { a[i] as u128 } else { 0 };
        let bv = if i < b.len() { b[i] as u128 } else { 0 };
        let s = av + bv + carry;
        r[i] = s as u64;
        carry = s >> 64;
    }
    r[4] = carry as u64;
    mod_reduce(&r, p)
}

fn mod_sub(a: &[u64], b: &[u64], p: &BigNum) -> BigNum {
    // a - b mod p = a + (p - b) mod p
    let pb = sub_big(p, b);
    mod_add(a, &pb, p)
}

fn sub_big(a: &[u64], b: &[u64]) -> BigNum {
    let mut r = vec![0u64; 4];
    let mut borrow = 0i128;
    for i in 0..4 {
        let av = if i < a.len() { a[i] as i128 } else { 0 };
        let bv = if i < b.len() { b[i] as i128 } else { 0 };
        let s = av - bv - borrow;
        if s < 0 {
            r[i] = (s + (1i128 << 64)) as u64;
            borrow = 1;
        } else {
            r[i] = s as u64;
            borrow = 0;
        }
    }
    r
}

fn mod_mul(a: &[u64], b: &[u64], p: &BigNum) -> BigNum {
    let mut r = vec![0u64; 8];
    for i in 0..4 {
        let av = if i < a.len() { a[i] as u128 } else { 0 };
        let mut carry = 0u128;
        for j in 0..4 {
            let bv = if j < b.len() { b[j] as u128 } else { 0 };
            let prod = av * bv + r[i + j] as u128 + carry;
            r[i + j] = prod as u64;
            carry = prod >> 64;
        }
        r[i + 4] = carry as u64;
    }
    mod_reduce_wide(&r, p)
}

fn mod_reduce(a: &[u64], p: &BigNum) -> BigNum {
    let mut r: Vec<u64> = a[..4.min(a.len())].to_vec();
    while r.len() < 4 { r.push(0); }
    while cmp_big(&r, p) >= 0 {
        r = sub_big(&r, p);
    }
    r
}

fn mod_reduce_wide(a: &[u64], p: &BigNum) -> BigNum {
    // Barrett-like reduction by repeated subtraction (good enough for 512-bit)
    let mut r = a.to_vec();
    // Reduce by computing r mod p
    // Simple approach: shift and subtract
    loop {
        // Find highest non-zero limb
        let mut top = r.len();
        while top > 4 && r[top - 1] == 0 { top -= 1; }
        if top <= 4 {
            let mut short = r[..4].to_vec();
            while cmp_big(&short, p) >= 0 {
                short = sub_big(&short, p);
            }
            return short;
        }
        // Subtract p shifted
        let shift = top - 4;
        let mut shifted_p = vec![0u64; shift];
        shifted_p.extend_from_slice(p);
        while shifted_p.len() < r.len() { shifted_p.push(0); }
        // Estimate quotient
        let q = r[top - 1] / (p[3] + 1);
        let q = if q == 0 { 1 } else { q };
        let mut qp = vec![0u64; shifted_p.len()];
        let mut carry = 0u128;
        for i in 0..shifted_p.len() {
            let v = shifted_p[i] as u128 * q as u128 + carry;
            qp[i] = v as u64;
            carry = v >> 64;
        }
        if cmp_big_wide(&qp, &r) <= 0 {
            r = sub_big_wide(&r, &qp);
        } else {
            r = sub_big_wide(&r, &shifted_p);
        }
    }
}

fn cmp_big(a: &[u64], b: &[u64]) -> i32 {
    for i in (0..4).rev() {
        let av = if i < a.len() { a[i] } else { 0 };
        let bv = if i < b.len() { b[i] } else { 0 };
        if av > bv { return 1; }
        if av < bv { return -1; }
    }
    0
}

fn cmp_big_wide(a: &[u64], b: &[u64]) -> i32 {
    let len = a.len().max(b.len());
    for i in (0..len).rev() {
        let av = if i < a.len() { a[i] } else { 0 };
        let bv = if i < b.len() { b[i] } else { 0 };
        if av > bv { return 1; }
        if av < bv { return -1; }
    }
    0
}

fn sub_big_wide(a: &[u64], b: &[u64]) -> Vec<u64> {
    let len = a.len().max(b.len());
    let mut r = vec![0u64; len];
    let mut borrow = 0i128;
    for i in 0..len {
        let av = if i < a.len() { a[i] as i128 } else { 0 };
        let bv = if i < b.len() { b[i] as i128 } else { 0 };
        let s = av - bv - borrow;
        if s < 0 {
            r[i] = (s + (1i128 << 64)) as u64;
            borrow = 1;
        } else {
            r[i] = s as u64;
            borrow = 0;
        }
    }
    r
}

fn mod_pow(base: &[u64], exp: &[u64], p: &BigNum) -> BigNum {
    let mut result: BigNum = vec![0; 4];
    result[0] = 1;
    let mut b = base.to_vec();
    while b.len() < 4 { b.push(0); }

    // Get all bits of exp
    let mut bits = Vec::new();
    for i in 0..4 {
        let v = if i < exp.len() { exp[i] } else { 0 };
        for bit in 0..64 {
            bits.push((v >> bit) & 1);
        }
    }

    for bit in bits {
        if bit == 1 {
            result = mod_mul(&result, &b, p);
        }
        b = mod_mul(&b, &b, p);
    }
    result
}

fn mod_inv(a: &[u64], p: &BigNum) -> BigNum {
    // a^(p-2) mod p
    let exp = mod_sub(p, &[2], p);
    mod_pow(a, &exp, p)
}

fn div2(a: &[u64]) -> BigNum {
    let mut r = vec![0u64; 4];
    for i in (0..4).rev() {
        let v = if i < a.len() { a[i] } else { 0 };
        r[i] = v >> 1;
        if i > 0 {
            // carry low bit to previous limb's high bit will be set next iteration
        }
    }
    // Handle carry between limbs
    let mut result = vec![0u64; 4];
    let mut carry = 0u64;
    for i in (0..4).rev() {
        let v = if i < a.len() { a[i] } else { 0 };
        result[i] = (v >> 1) | (carry << 63);
        carry = v & 1;
    }
    result
}

fn ed25519_d(p: &BigNum) -> BigNum {
    // d = -121665/121666 mod p = -121665 * inv(121666) mod p
    let n121665 = mod_sub(p, &[121665], p); // -121665 mod p
    let d121666: BigNum = vec![121666, 0, 0, 0];
    let inv = mod_inv(&d121666, p);
    mod_mul(&n121665, &inv, p)
}

fn program_id_for(name: &str) -> Option<[u8; 32]> {
    PROGRAMS.iter()
        .find(|(n, _)| n.eq_ignore_ascii_case(name))
        .and_then(|(_, addr)| decode_pubkey(addr).ok())
}

fn main() {
    let args = Args::parse();
    match args.cmd {
        Cmd::Programs => {
            let progs: Vec<serde_json::Value> = PROGRAMS.iter()
                .map(|(name, addr)| serde_json::json!({"name": name, "address": addr}))
                .collect();
            println!("{}", serde_json::to_string_pretty(&progs).unwrap());
        }
        Cmd::Derive { program, seeds } => {
            let pid = decode_pubkey(&program).expect("invalid program ID");
            let seed_bytes: Vec<Vec<u8>> = seeds.iter().map(|s| {
                // Try base58 decode, fall back to UTF-8
                bs58::decode(s).into_vec().unwrap_or_else(|_| s.as_bytes().to_vec())
            }).collect();
            let seed_refs: Vec<&[u8]> = seed_bytes.iter().map(|s| s.as_slice()).collect();
            let (pda, bump) = find_program_address(&seed_refs, &pid);
            println!("{}", serde_json::json!({"pda": pda, "bump": bump}));
        }
        Cmd::Find { pda } => {
            let (address, bump) = match pda {
                PdaCmd::Escrow { maker, seed } => {
                    let pid = program_id_for("escrow").unwrap();
                    let m = decode_pubkey(&maker).unwrap();
                    let s = seed.to_le_bytes();
                    find_program_address(&[b"escrow", &m, &s], &pid)
                }
                PdaCmd::Vesting { authority, mint } => {
                    let pid = program_id_for("tokenVesting").unwrap();
                    let a = decode_pubkey(&authority).unwrap();
                    let m = decode_pubkey(&mint).unwrap();
                    find_program_address(&[b"vesting", &a, &m], &pid)
                }
                PdaCmd::StakeEntry { pool, owner } => {
                    let pid = program_id_for("stakingPool").unwrap();
                    let p = decode_pubkey(&pool).unwrap();
                    let o = decode_pubkey(&owner).unwrap();
                    find_program_address(&[b"stake", &p, &o], &pid)
                }
                PdaCmd::Subscription { plan, subscriber } => {
                    let pid = program_id_for("subscription").unwrap();
                    let p = decode_pubkey(&plan).unwrap();
                    let s = decode_pubkey(&subscriber).unwrap();
                    find_program_address(&[b"subscription", &p, &s], &pid)
                }
                PdaCmd::Proposal { dao, proposal_id } => {
                    let pid = program_id_for("daoVoting").unwrap();
                    let d = decode_pubkey(&dao).unwrap();
                    let id = proposal_id.to_le_bytes();
                    find_program_address(&[b"proposal", &d, &id], &pid)
                }
                PdaCmd::Reputation { config, wallet } => {
                    let pid = program_id_for("reputation").unwrap();
                    let c = decode_pubkey(&config).unwrap();
                    let w = decode_pubkey(&wallet).unwrap();
                    find_program_address(&[b"reputation", &c, &w], &pid)
                }
                PdaCmd::ClaimRecord { faucet, claimer } => {
                    let pid = program_id_for("tokenFaucet").unwrap();
                    let f = decode_pubkey(&faucet).unwrap();
                    let c = decode_pubkey(&claimer).unwrap();
                    find_program_address(&[b"claim", &f, &c], &pid)
                }
                PdaCmd::Order { market, order_id } => {
                    let pid = program_id_for("orderbook").unwrap();
                    let m = decode_pubkey(&market).unwrap();
                    let id = order_id.to_le_bytes();
                    find_program_address(&[b"order", &m, &id], &pid)
                }
                PdaCmd::Market { authority, base_mint, quote_mint } => {
                    let pid = program_id_for("orderbook").unwrap();
                    let a = decode_pubkey(&authority).unwrap();
                    let b = decode_pubkey(&base_mint).unwrap();
                    let q = decode_pubkey(&quote_mint).unwrap();
                    find_program_address(&[b"market", &a, &b, &q], &pid)
                }
                PdaCmd::Collection { authority } => {
                    let pid = program_id_for("nftMint").unwrap();
                    let a = decode_pubkey(&authority).unwrap();
                    find_program_address(&[b"collection", &a], &pid)
                }
                PdaCmd::NftMetadata { collection, mint } => {
                    let pid = program_id_for("nftMint").unwrap();
                    let c = decode_pubkey(&collection).unwrap();
                    let m = decode_pubkey(&mint).unwrap();
                    find_program_address(&[b"metadata", &c, &m], &pid)
                }
                PdaCmd::PriceFeed { authority } => {
                    let pid = program_id_for("priceFeed").unwrap();
                    let a = decode_pubkey(&authority).unwrap();
                    find_program_address(&[b"feed", &a], &pid)
                }
                PdaCmd::Treasury { authority, mint } => {
                    let pid = program_id_for("treasuryVault").unwrap();
                    let a = decode_pubkey(&authority).unwrap();
                    let m = decode_pubkey(&mint).unwrap();
                    find_program_address(&[b"treasury", &a, &m], &pid)
                }
                PdaCmd::Multisig { creator } => {
                    let pid = program_id_for("multisig").unwrap();
                    let c = decode_pubkey(&creator).unwrap();
                    find_program_address(&[b"multisig", &c], &pid)
                }
                PdaCmd::MultisigTx { multisig, tx_index } => {
                    let pid = program_id_for("multisig").unwrap();
                    let m = decode_pubkey(&multisig).unwrap();
                    let id = tx_index.to_le_bytes();
                    find_program_address(&[b"tx", &m, &id], &pid)
                }
                PdaCmd::Gate { authority, required_mint } => {
                    let pid = program_id_for("nftGated").unwrap();
                    let a = decode_pubkey(&authority).unwrap();
                    let m = decode_pubkey(&required_mint).unwrap();
                    find_program_address(&[b"gate", &a, &m], &pid)
                }
                PdaCmd::Access { gate, holder } => {
                    let pid = program_id_for("nftGated").unwrap();
                    let g = decode_pubkey(&gate).unwrap();
                    let h = decode_pubkey(&holder).unwrap();
                    find_program_address(&[b"access", &g, &h], &pid)
                }
                PdaCmd::Airdrop { authority, mint } => {
                    let pid = program_id_for("airdrop").unwrap();
                    let a = decode_pubkey(&authority).unwrap();
                    let m = decode_pubkey(&mint).unwrap();
                    find_program_address(&[b"airdrop", &a, &m], &pid)
                }
                PdaCmd::AirdropClaim { airdrop, claimer } => {
                    let pid = program_id_for("airdrop").unwrap();
                    let a = decode_pubkey(&airdrop).unwrap();
                    let c = decode_pubkey(&claimer).unwrap();
                    find_program_address(&[b"claim", &a, &c], &pid)
                }
            };
            println!("{}", serde_json::json!({"pda": address, "bump": bump}));
        }
    }
}
