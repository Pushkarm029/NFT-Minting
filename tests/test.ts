import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolanaNftMint } from "../target/types/solana_nft_mint";
import { AccountLayout } from '@solana/spl-token';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";

describe("nft", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaNftMint as Program<SolanaNftMint>;
  const wallet: anchor.Wallet = provider.wallet as anchor.Wallet;

  let tokenAddress: anchor.web3.PublicKey;
  let metadataAddress: anchor.web3.PublicKey;
  let masterEditionAddress: anchor.web3.PublicKey;
  let mintPDA: anchor.web3.PublicKey;

  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  const NFT_NAME = "My Cool NFT";
  const NFT_SYMBOL = "COOL";
  const NFT_URI = "https://example.com/my-cool-nft";

  before(async () => {
    // Get the PDA for the mint account
    [mintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint")],
      program.programId
    );

    // Derive the metadata account address
    metadataAddress = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintPDA.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];

    // Derive the master edition account address
    masterEditionAddress = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintPDA.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];

    // Get the associated token account address
    tokenAddress = await getAssociatedTokenAddress(
      mintPDA,
      wallet.publicKey
    );

    console.log("Mint PDA:", mintPDA.toBase58());
    console.log("Metadata Address:", metadataAddress.toBase58());
    console.log("Master Edition Address:", masterEditionAddress.toBase58());
    console.log("Token Address:", tokenAddress.toBase58());
  });

  it("Mints an NFT", async () => {
    const tx = await program.methods
      .mintNft(NFT_NAME, NFT_SYMBOL, NFT_URI)
      .accounts({
        admin: wallet.publicKey,
        tokenMint: mintPDA,
        associatedTokenAccount: tokenAddress,
        metadataAccount: metadataAddress,
        masterEditionAccount: masterEditionAddress,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("Transaction signature:", tx);

    // Verify the mint account was created
    const mintAccount = await program.provider.connection.getAccountInfo(mintPDA);
    expect(mintAccount).to.not.be.null;

    // Verify the token account was created
    const tokenAccount = await program.provider.connection.getAccountInfo(tokenAddress);
    expect(tokenAccount).to.not.be.null;
  });

  it("Transfers the NFT", async () => {
    const recipient = anchor.web3.Keypair.generate();
    const recipientTokenAddress = await getAssociatedTokenAddress(
      mintPDA,
      recipient.publicKey
    );

    // Transfer the NFT
    await program.methods
      .transferNft()
      .accounts({
        sender: wallet.publicKey,
        senderNftTokenAccount: tokenAddress,
        recipientNftTokenAccount: recipientTokenAddress,
        recipient: recipient.publicKey,
        tokenMint: mintPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // Check that the recipient's token account now has the NFT
    const recipientTokenAccountInfo = await program.provider.connection.getAccountInfo(recipientTokenAddress);
    expect(recipientTokenAccountInfo).to.not.be.null;

    // Decode the recipient token account data
    const recipientTokenAccountData = AccountLayout.decode(recipientTokenAccountInfo.data);
    expect(recipientTokenAccountData.amount.toString()).to.not.equal('0'); // Expecting some amount

    // Verify that the sender's token account no longer holds the NFT
    const senderTokenAccountInfo = await program.provider.connection.getAccountInfo(tokenAddress);
    expect(senderTokenAccountInfo).to.not.be.null; // It should still be not null

    // Decode the sender token account data
    const senderTokenAccountData = AccountLayout.decode(senderTokenAccountInfo.data);
    expect(senderTokenAccountData.amount.toString()).to.equal('0'); // Should be 0 after transfer
  });

  // it("Mints a new NFT to burn", async () => {
  //   // Create a new mint PDA for the new NFT
  //   const [newMintPDA] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("mint")],
  //     program.programId
  //   );

  //   // Derive a new associated token address and metadata for the new NFT
  //   const newTokenAddress = await getAssociatedTokenAddress(
  //     newMintPDA,
  //     wallet.publicKey
  //   );
  //   const newMetadataAddress = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from("metadata"),
  //       TOKEN_METADATA_PROGRAM_ID.toBuffer(),
  //       newMintPDA.toBuffer(),
  //     ],
  //     TOKEN_METADATA_PROGRAM_ID
  //   )[0];

  //   const newMasterEditionAddress = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from("metadata"),
  //       TOKEN_METADATA_PROGRAM_ID.toBuffer(),
  //       newMintPDA.toBuffer(),
  //       Buffer.from("edition"),
  //     ],
  //     TOKEN_METADATA_PROGRAM_ID
  //   )[0];

  //   const tx = await program.methods
  //     .mintNft("SSDS", "SSS", "SSS.com/example")
  //     .accounts({
  //       admin: wallet.publicKey,
  //       tokenMint: newMintPDA,
  //       associatedTokenAccount: newTokenAddress,
  //       metadataAccount: newMetadataAddress,
  //       masterEditionAccount: newMasterEditionAddress,
  //       tokenProgram: TOKEN_PROGRAM_ID,
  //       associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //       tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
  //       systemProgram: anchor.web3.SystemProgram.programId,
  //       rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  //     })
  //     .rpc();

  //   console.log("Transaction signature for new NFT:", tx);

  //   // Verify the mint account was created
  //   const mintAccount = await program.provider.connection.getAccountInfo(newMintPDA);
  //   expect(mintAccount).to.not.be.null;

  //   // Verify the token account was created
  //   const tokenAccount = await program.provider.connection.getAccountInfo(newTokenAddress);
  //   expect(tokenAccount).to.not.be.null;
  // });

  // it("Burns the newly minted NFT", async () => {
  //   // Setup: Ensure the new NFT token account has a balance of 1
  //   const newTokenAccountInfo = await program.provider.connection.getAccountInfo(tokenAddress);
  //   const newTokenAccountData = AccountLayout.decode(newTokenAccountInfo.data);
  //   expect(newTokenAccountData.amount.toString()).to.equal('1');

  //   // Set up the burn method call
  //   await program.methods
  //     .burnNft()
  //     .accounts({
  //       admin: wallet.publicKey,
  //       tokenMint: mintPDA,
  //       nftTokenAccount: tokenAddress,
  //       metadataAccount: metadataAddress,
  //       masterEditionAccount: masterEditionAddress,
  //       tokenProgram: TOKEN_PROGRAM_ID,
  //       associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //       tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
  //       systemProgram: anchor.web3.SystemProgram.programId,
  //       rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  //     })
  //     .rpc();

  //   // Verify the mint account has been burned
  //   const mintAccount = await program.provider.connection.getAccountInfo(mintPDA);
  //   expect(mintAccount).to.be.null; // The mint account should no longer exist

  //   // Verify the token account has been burned
  //   const tokenAccount = await program.provider.connection.getAccountInfo(tokenAddress);
  //   expect(tokenAccount).to.be.null; // The associated token account should also no longer exist

  //   // Verify that the metadata and master edition accounts are still valid (optional)
  //   const metadataAccountInfo = await program.provider.connection.getAccountInfo(metadataAddress);
  //   expect(metadataAccountInfo).to.not.be.null; // Metadata account should still exist

  //   const masterEditionAccountInfo = await program.provider.connection.getAccountInfo(masterEditionAddress);
  //   expect(masterEditionAccountInfo).to.not.be.null; // Master edition account should still exist
  // });
});
