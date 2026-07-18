use anchor_lang::prelude::Pubkey as AnchorPubkey;
use anchor_lang::{AccountDeserialize, InstructionData};
use anchor_spl::token::spl_token::state::{Account as TokenAccountState, Mint as MintState};
use gacha_er::MomentRecord;
use solana_program_option::COption;
use solana_program_pack::Pack;
use litesvm::LiteSVM;
use solana_address::Address;
use solana_instruction::{account_meta::AccountMeta, Instruction};
use solana_keypair::Keypair;
use solana_message::Message;
use solana_signer::Signer;
use solana_transaction::Transaction;

fn to_address(pk: AnchorPubkey) -> Address {
    Address::from(pk.to_bytes())
}

fn to_anchor(addr: Address) -> AnchorPubkey {
    AnchorPubkey::from(addr.to_bytes())
}

fn sample_signature(fill: u8) -> [u8; 64] {
    [fill; 64]
}

fn moment_mint_pda(signature_bytes: &[u8; 64]) -> (AnchorPubkey, u8) {
    AnchorPubkey::find_program_address(
        &[
            gacha_er::MOMENT_MINT_SEED,
            &signature_bytes[0..32],
            &signature_bytes[32..64],
        ],
        &gacha_er::ID,
    )
}

fn build_mint_moment_ix(
    payer: &Keypair,
    signature_bytes: [u8; 64],
    fixture_id: u32,
    kind: u8,
    rarity: u8,
    delta_bps: i16,
) -> (Instruction, AnchorPubkey, AnchorPubkey, AnchorPubkey) {
    let payer_key = to_anchor(payer.pubkey());
    let (mint_pda, _) = moment_mint_pda(&signature_bytes);
    let (moment_record_pda, _) =
        AnchorPubkey::find_program_address(&[gacha_er::MOMENT_RECORD_SEED, mint_pda.as_ref()], &gacha_er::ID);
    let token_account_pda = anchor_spl::associated_token::get_associated_token_address(&payer_key, &mint_pda);

    let ix = Instruction {
        program_id: to_address(gacha_er::ID),
        accounts: vec![
            AccountMeta::new(payer.pubkey(), true),
            AccountMeta::new(to_address(mint_pda), false),
            AccountMeta::new(to_address(moment_record_pda), false),
            AccountMeta::new(to_address(token_account_pda), false),
            AccountMeta::new_readonly(to_address(anchor_spl::token::ID), false),
            AccountMeta::new_readonly(to_address(anchor_spl::associated_token::ID), false),
            AccountMeta::new_readonly(to_address(anchor_lang::solana_program::system_program::ID), false),
        ],
        data: gacha_er::instruction::MintMomentNft {
            signature_bytes,
            fixture_id,
            kind,
            rarity,
            delta_bps,
        }
        .data(),
    };

    (ix, mint_pda, moment_record_pda, token_account_pda)
}

fn svm_with_program() -> LiteSVM {
    let mut svm = LiteSVM::new();
    svm.add_program_from_file(to_address(gacha_er::ID), "../../target/deploy/gacha_er.so")
        .unwrap();
    svm
}

#[test]
fn mint_moment_nft_creates_a_one_of_one_token() {
    let mut svm = svm_with_program();
    let payer = Keypair::new();
    svm.airdrop(&payer.pubkey(), 1_000_000_000).unwrap();

    let signature_bytes = sample_signature(7);
    let (ix, mint_pda, moment_record_pda, token_account_pda) =
        build_mint_moment_ix(&payer, signature_bytes, 42, 1, 2, -3300);

    let blockhash = svm.latest_blockhash();
    let tx = Transaction::new(&[&payer], Message::new(&[ix], Some(&payer.pubkey())), blockhash);
    svm.send_transaction(tx).unwrap_or_else(|e| panic!("mint_moment_nft failed: {e:?}"));

    let mint_account = svm.get_account(&to_address(mint_pda)).expect("mint account should exist");
    let mint_state = MintState::unpack(&mint_account.data).expect("valid mint state");
    assert_eq!(mint_state.decimals, 0);
    assert_eq!(mint_state.supply, 1);
    assert_eq!(mint_state.mint_authority, COption::None);
    assert_eq!(mint_state.freeze_authority, COption::None);

    let token_account = svm
        .get_account(&to_address(token_account_pda))
        .expect("token account should exist");
    let token_state = TokenAccountState::unpack(&token_account.data).expect("valid token account state");
    assert_eq!(token_state.amount, 1);
    assert_eq!(token_state.mint, mint_pda);

    let record_account = svm
        .get_account(&to_address(moment_record_pda))
        .expect("moment record account should exist");
    let record = MomentRecord::try_deserialize(&mut &record_account.data[..]).expect("valid moment record");
    assert_eq!(record.mint, mint_pda);
    assert_eq!(record.fixture_id, 42);
    assert_eq!(record.kind, 1);
    assert_eq!(record.rarity, 2);
    assert_eq!(record.delta_bps, -3300);
    assert_eq!(record.signature, signature_bytes);
}

#[test]
fn mint_moment_nft_rejects_duplicate_claim() {
    // Two different wallets race to claim the same Moment (same signature). Only the first
    // succeeds — this is the entire first-claimer-wins mechanism, exercised directly.
    let mut svm = svm_with_program();
    let first = Keypair::new();
    let second = Keypair::new();
    svm.airdrop(&first.pubkey(), 1_000_000_000).unwrap();
    svm.airdrop(&second.pubkey(), 1_000_000_000).unwrap();

    let signature_bytes = sample_signature(9);

    let (ix1, ..) = build_mint_moment_ix(&first, signature_bytes, 1, 0, 0, 2500);
    let blockhash = svm.latest_blockhash();
    let tx1 = Transaction::new(&[&first], Message::new(&[ix1], Some(&first.pubkey())), blockhash);
    svm.send_transaction(tx1).unwrap_or_else(|e| panic!("first claim should succeed: {e:?}"));

    let (ix2, ..) = build_mint_moment_ix(&second, signature_bytes, 1, 0, 0, 2500);
    let blockhash = svm.latest_blockhash();
    let tx2 = Transaction::new(&[&second], Message::new(&[ix2], Some(&second.pubkey())), blockhash);
    let result = svm.send_transaction(tx2);
    assert!(result.is_err(), "a second claim on an already-claimed Moment must fail");
}

#[test]
fn mint_moment_nft_rejects_invalid_kind() {
    let mut svm = svm_with_program();
    let payer = Keypair::new();
    svm.airdrop(&payer.pubkey(), 1_000_000_000).unwrap();

    let (ix, ..) = build_mint_moment_ix(&payer, sample_signature(1), 1, 2, 0, 0); // kind=2 is invalid
    let blockhash = svm.latest_blockhash();
    let tx = Transaction::new(&[&payer], Message::new(&[ix], Some(&payer.pubkey())), blockhash);
    assert!(svm.send_transaction(tx).is_err(), "an out-of-range kind byte must be rejected");
}

#[test]
fn mint_moment_nft_rejects_invalid_rarity() {
    let mut svm = svm_with_program();
    let payer = Keypair::new();
    svm.airdrop(&payer.pubkey(), 1_000_000_000).unwrap();

    let (ix, ..) = build_mint_moment_ix(&payer, sample_signature(2), 1, 0, 3, 0); // rarity=3 is invalid
    let blockhash = svm.latest_blockhash();
    let tx = Transaction::new(&[&payer], Message::new(&[ix], Some(&payer.pubkey())), blockhash);
    assert!(svm.send_transaction(tx).is_err(), "an out-of-range rarity byte must be rejected");
}

#[test]
fn client_side_moment_pda_derivation_matches_program() {
    // Cross-check against the exact seeds the TS frontend must derive client-side.
    let signature_bytes = sample_signature(0xAB);
    let (mint_pda, _) = moment_mint_pda(&signature_bytes);
    let (moment_record_pda, _) =
        AnchorPubkey::find_program_address(&[gacha_er::MOMENT_RECORD_SEED, mint_pda.as_ref()], &gacha_er::ID);

    // Re-derive independently to prove determinism (no payer/wallet component involved).
    let (mint_pda_again, _) = AnchorPubkey::find_program_address(
        &[
            gacha_er::MOMENT_MINT_SEED,
            &signature_bytes[0..32],
            &signature_bytes[32..64],
        ],
        &gacha_er::ID,
    );
    assert_eq!(mint_pda, mint_pda_again);
    assert_ne!(mint_pda, moment_record_pda);
}
