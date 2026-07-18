use anchor_lang::prelude::Pubkey as AnchorPubkey;
use anchor_lang::InstructionData;
use anchor_spl::token::spl_token::state::Account as TokenAccountState;
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

fn svm_with_program() -> LiteSVM {
    let mut svm = LiteSVM::new();
    svm.add_program_from_file(to_address(gacha_er::ID), "../../target/deploy/gacha_er.so")
        .unwrap();
    svm
}

fn ata(owner: &AnchorPubkey, mint: &AnchorPubkey) -> AnchorPubkey {
    anchor_spl::associated_token::get_associated_token_address(owner, mint)
}

fn token_amount(svm: &LiteSVM, ata_pda: &AnchorPubkey) -> u64 {
    let account = svm.get_account(&to_address(*ata_pda)).expect("token account should exist");
    TokenAccountState::unpack(&account.data).expect("valid token account state").amount
}

fn account_lamports(svm: &LiteSVM, pda: &AnchorPubkey) -> u64 {
    svm.get_account(&to_address(*pda)).map(|a| a.lamports).unwrap_or(0)
}

/// Mints a fresh Tarot card NFT owned by `payer`, returning its mint address.
fn mint_card(svm: &mut LiteSVM, payer: &Keypair, pull_index: u32) -> AnchorPubkey {
    let payer_key = to_anchor(payer.pubkey());
    let (mint_pda, _) = AnchorPubkey::find_program_address(
        &[gacha_er::CARD_MINT_SEED, payer_key.as_ref(), &pull_index.to_le_bytes()],
        &gacha_er::ID,
    );
    let (card_record_pda, _) =
        AnchorPubkey::find_program_address(&[gacha_er::CARD_RECORD_SEED, mint_pda.as_ref()], &gacha_er::ID);
    let token_account_pda = ata(&payer_key, &mint_pda);

    let ix = Instruction {
        program_id: to_address(gacha_er::ID),
        accounts: vec![
            AccountMeta::new(payer.pubkey(), true),
            AccountMeta::new(to_address(mint_pda), false),
            AccountMeta::new(to_address(card_record_pda), false),
            AccountMeta::new(to_address(token_account_pda), false),
            AccountMeta::new_readonly(to_address(anchor_spl::token::ID), false),
            AccountMeta::new_readonly(to_address(anchor_spl::associated_token::ID), false),
            AccountMeta::new_readonly(to_address(anchor_lang::solana_program::system_program::ID), false),
        ],
        data: gacha_er::instruction::MintCardNft {
            rarity: 2,
            card_seed: 1,
            pull_index,
            category: 0,
            special: 0,
        }
        .data(),
    };

    let blockhash = svm.latest_blockhash();
    let tx = Transaction::new(&[payer], Message::new(&[ix], Some(&payer.pubkey())), blockhash);
    svm.send_transaction(tx).unwrap_or_else(|e| panic!("mint_card_nft failed: {e:?}"));
    mint_pda
}

/// Creates the player + global treasury PDAs, exactly as the real app does before any pull.
fn initialize(svm: &mut LiteSVM, payer: &Keypair) {
    let payer_key = to_anchor(payer.pubkey());
    let (player_pda, _) =
        AnchorPubkey::find_program_address(&[gacha_er::PLAYER_SEED, payer_key.as_ref()], &gacha_er::ID);
    let (treasury_pda, _) = AnchorPubkey::find_program_address(&[gacha_er::TREASURY_SEED], &gacha_er::ID);

    let ix = Instruction {
        program_id: to_address(gacha_er::ID),
        accounts: vec![
            AccountMeta::new(payer.pubkey(), true),
            AccountMeta::new(to_address(player_pda), false),
            AccountMeta::new(to_address(treasury_pda), false),
            AccountMeta::new_readonly(to_address(anchor_lang::solana_program::system_program::ID), false),
        ],
        data: gacha_er::instruction::Initialize {}.data(),
    };

    let blockhash = svm.latest_blockhash();
    let tx = Transaction::new(&[payer], Message::new(&[ix], Some(&payer.pubkey())), blockhash);
    svm.send_transaction(tx).unwrap_or_else(|e| panic!("initialize failed: {e:?}"));
}

fn listing_pda(mint: &AnchorPubkey) -> (AnchorPubkey, u8) {
    AnchorPubkey::find_program_address(&[gacha_er::LISTING_SEED, mint.as_ref()], &gacha_er::ID)
}

fn list_card(svm: &mut LiteSVM, seller: &Keypair, mint: &AnchorPubkey, price: u64) {
    let seller_key = to_anchor(seller.pubkey());
    let (listing, _) = listing_pda(mint);
    let seller_ata = ata(&seller_key, mint);
    let vault = ata(&listing, mint);

    let ix = Instruction {
        program_id: to_address(gacha_er::ID),
        accounts: vec![
            AccountMeta::new(seller.pubkey(), true),
            AccountMeta::new_readonly(to_address(*mint), false),
            AccountMeta::new(to_address(seller_ata), false),
            AccountMeta::new(to_address(listing), false),
            AccountMeta::new(to_address(vault), false),
            AccountMeta::new_readonly(to_address(anchor_spl::token::ID), false),
            AccountMeta::new_readonly(to_address(anchor_spl::associated_token::ID), false),
            AccountMeta::new_readonly(to_address(anchor_lang::solana_program::system_program::ID), false),
        ],
        data: gacha_er::instruction::ListCard { price }.data(),
    };

    let blockhash = svm.latest_blockhash();
    let tx = Transaction::new(&[seller], Message::new(&[ix], Some(&seller.pubkey())), blockhash);
    svm.send_transaction(tx).unwrap_or_else(|e| panic!("list_card failed: {e:?}"));
}

fn try_list_card(svm: &mut LiteSVM, seller: &Keypair, mint: &AnchorPubkey, price: u64) -> Result<(), String> {
    let seller_key = to_anchor(seller.pubkey());
    let (listing, _) = listing_pda(mint);
    let seller_ata = ata(&seller_key, mint);
    let vault = ata(&listing, mint);

    let ix = Instruction {
        program_id: to_address(gacha_er::ID),
        accounts: vec![
            AccountMeta::new(seller.pubkey(), true),
            AccountMeta::new_readonly(to_address(*mint), false),
            AccountMeta::new(to_address(seller_ata), false),
            AccountMeta::new(to_address(listing), false),
            AccountMeta::new(to_address(vault), false),
            AccountMeta::new_readonly(to_address(anchor_spl::token::ID), false),
            AccountMeta::new_readonly(to_address(anchor_spl::associated_token::ID), false),
            AccountMeta::new_readonly(to_address(anchor_lang::solana_program::system_program::ID), false),
        ],
        data: gacha_er::instruction::ListCard { price }.data(),
    };

    let blockhash = svm.latest_blockhash();
    let tx = Transaction::new(&[seller], Message::new(&[ix], Some(&seller.pubkey())), blockhash);
    svm.send_transaction(tx).map(|_| ()).map_err(|e| format!("{e:?}"))
}

fn cancel_listing(svm: &mut LiteSVM, seller: &Keypair, mint: &AnchorPubkey) {
    let seller_key = to_anchor(seller.pubkey());
    let (listing, _) = listing_pda(mint);
    let seller_ata = ata(&seller_key, mint);
    let vault = ata(&listing, mint);

    let ix = Instruction {
        program_id: to_address(gacha_er::ID),
        accounts: vec![
            AccountMeta::new(seller.pubkey(), true),
            AccountMeta::new_readonly(to_address(*mint), false),
            AccountMeta::new(to_address(listing), false),
            AccountMeta::new(to_address(vault), false),
            AccountMeta::new(to_address(seller_ata), false),
            AccountMeta::new_readonly(to_address(anchor_spl::token::ID), false),
            AccountMeta::new_readonly(to_address(anchor_spl::associated_token::ID), false),
            AccountMeta::new_readonly(to_address(anchor_lang::solana_program::system_program::ID), false),
        ],
        data: gacha_er::instruction::CancelListing {}.data(),
    };

    let blockhash = svm.latest_blockhash();
    let tx = Transaction::new(&[seller], Message::new(&[ix], Some(&seller.pubkey())), blockhash);
    svm.send_transaction(tx).unwrap_or_else(|e| panic!("cancel_listing failed: {e:?}"));
}

fn buy_card(svm: &mut LiteSVM, buyer: &Keypair, seller: &AnchorPubkey, mint: &AnchorPubkey) -> Result<(), String> {
    let buyer_key = to_anchor(buyer.pubkey());
    let (listing, _) = listing_pda(mint);
    let (treasury, _) = AnchorPubkey::find_program_address(&[gacha_er::TREASURY_SEED], &gacha_er::ID);
    let vault = ata(&listing, mint);
    let buyer_ata = ata(&buyer_key, mint);

    let ix = Instruction {
        program_id: to_address(gacha_er::ID),
        accounts: vec![
            AccountMeta::new(buyer.pubkey(), true),
            AccountMeta::new(to_address(*seller), false),
            AccountMeta::new_readonly(to_address(*mint), false),
            AccountMeta::new(to_address(listing), false),
            AccountMeta::new(to_address(treasury), false),
            AccountMeta::new(to_address(vault), false),
            AccountMeta::new(to_address(buyer_ata), false),
            AccountMeta::new_readonly(to_address(anchor_spl::token::ID), false),
            AccountMeta::new_readonly(to_address(anchor_spl::associated_token::ID), false),
            AccountMeta::new_readonly(to_address(anchor_lang::solana_program::system_program::ID), false),
        ],
        data: gacha_er::instruction::BuyCard {}.data(),
    };

    let blockhash = svm.latest_blockhash();
    let tx = Transaction::new(&[buyer], Message::new(&[ix], Some(&buyer.pubkey())), blockhash);
    svm.send_transaction(tx).map(|_| ()).map_err(|e| format!("{e:?}"))
}

#[test]
fn list_card_and_buy_card_round_trip() {
    let mut svm = svm_with_program();
    let seller = Keypair::new();
    let buyer = Keypair::new();
    svm.airdrop(&seller.pubkey(), 2_000_000_000).unwrap();
    svm.airdrop(&buyer.pubkey(), 2_000_000_000).unwrap();

    initialize(&mut svm, &seller); // creates the global treasury PDA up front

    let mint = mint_card(&mut svm, &seller, 1);
    let seller_key = to_anchor(seller.pubkey());
    let seller_ata_pda = ata(&seller_key, &mint);
    assert_eq!(token_amount(&svm, &seller_ata_pda), 1);

    let price: u64 = 1_000_000_000; // 1 SOL
    list_card(&mut svm, &seller, &mint, price);
    assert_eq!(token_amount(&svm, &seller_ata_pda), 0, "token should have moved into escrow");

    let (listing, _) = listing_pda(&mint);
    let vault = ata(&listing, &mint);
    assert_eq!(token_amount(&svm, &vault), 1);

    // Capture exactly how much rent the vault/listing hold right now — this is exactly how
    // much comes back to the seller when buy_card closes them, no independent rent math needed.
    let vault_rent = account_lamports(&svm, &vault);
    let listing_rent = account_lamports(&svm, &listing);
    let seller_lamports_before = account_lamports(&svm, &seller_key);
    let (treasury, _) = AnchorPubkey::find_program_address(&[gacha_er::TREASURY_SEED], &gacha_er::ID);
    let treasury_lamports_before = account_lamports(&svm, &treasury);
    let buyer_lamports_before = account_lamports(&svm, &to_anchor(buyer.pubkey()));

    buy_card(&mut svm, &buyer, &seller_key, &mint).unwrap_or_else(|e| panic!("buy_card failed: {e}"));

    let fee = (price as u128 * gacha_er::MARKETPLACE_FEE_BPS as u128 / 10_000) as u64;
    let seller_amount = price - fee;

    let buyer_ata_pda = ata(&to_anchor(buyer.pubkey()), &mint);
    assert_eq!(token_amount(&svm, &buyer_ata_pda), 1, "buyer should now hold the NFT");
    assert_eq!(account_lamports(&svm, &vault), 0, "vault should be closed");
    assert_eq!(account_lamports(&svm, &listing), 0, "listing should be closed");

    let seller_lamports_after = account_lamports(&svm, &seller_key);
    assert_eq!(
        seller_lamports_after - seller_lamports_before,
        seller_amount + vault_rent + listing_rent,
        "seller should receive price-minus-fee plus every reclaimed rent lamport, exactly"
    );

    let treasury_lamports_after = account_lamports(&svm, &treasury);
    assert_eq!(treasury_lamports_after - treasury_lamports_before, fee, "treasury should receive exactly the fee");

    let buyer_lamports_after = account_lamports(&svm, &to_anchor(buyer.pubkey()));
    assert!(
        buyer_lamports_before - buyer_lamports_after >= price,
        "buyer must pay at least the listed price (plus tx fees/rent on top)"
    );
}

#[test]
fn cancel_listing_round_trip() {
    let mut svm = svm_with_program();
    let seller = Keypair::new();
    svm.airdrop(&seller.pubkey(), 1_000_000_000).unwrap();

    let mint = mint_card(&mut svm, &seller, 1);
    list_card(&mut svm, &seller, &mint, 500_000_000);

    let seller_key = to_anchor(seller.pubkey());
    let seller_ata_pda = ata(&seller_key, &mint);
    assert_eq!(token_amount(&svm, &seller_ata_pda), 0);

    cancel_listing(&mut svm, &seller, &mint);

    assert_eq!(token_amount(&svm, &seller_ata_pda), 1, "token should be back with the seller");
    let (listing, _) = listing_pda(&mint);
    let vault = ata(&listing, &mint);
    assert_eq!(account_lamports(&svm, &vault), 0, "vault should be closed");
    assert_eq!(account_lamports(&svm, &listing), 0, "listing should be closed");
}

#[test]
fn buy_card_fails_with_insufficient_buyer_funds() {
    let mut svm = svm_with_program();
    let seller = Keypair::new();
    let buyer = Keypair::new();
    svm.airdrop(&seller.pubkey(), 1_000_000_000).unwrap();
    svm.airdrop(&buyer.pubkey(), 1_000); // nowhere near enough

    initialize(&mut svm, &seller);
    let mint = mint_card(&mut svm, &seller, 1);
    list_card(&mut svm, &seller, &mint, 1_000_000_000);

    let seller_key = to_anchor(seller.pubkey());
    let result = buy_card(&mut svm, &buyer, &seller_key, &mint);
    assert!(result.is_err(), "buying with insufficient funds must fail");
}

#[test]
fn list_card_fails_when_already_listed() {
    let mut svm = svm_with_program();
    let seller = Keypair::new();
    svm.airdrop(&seller.pubkey(), 1_000_000_000).unwrap();

    let mint = mint_card(&mut svm, &seller, 1);
    list_card(&mut svm, &seller, &mint, 500_000_000);

    let result = try_list_card(&mut svm, &seller, &mint, 500_000_000);
    assert!(result.is_err(), "a second listing on an already-listed mint must fail");
}

#[test]
fn client_side_listing_pda_derivation_matches_program() {
    let mint: AnchorPubkey = "11111111111111111111111111111112".parse().unwrap();
    let (listing_a, _) = listing_pda(&mint);
    let (listing_b, _) = AnchorPubkey::find_program_address(&[gacha_er::LISTING_SEED, mint.as_ref()], &gacha_er::ID);
    assert_eq!(listing_a, listing_b);
}
