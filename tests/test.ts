import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolanaNftMint } from "../target/types/solana_nft_mint";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
// import { PROGRAM_ID as METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";

describe("nft", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaNftMint as Program<SolanaNftMint>;
  const wallet: anchor.Wallet = provider.wallet as anchor.Wallet;

  let mintKeypair: anchor.web3.Keypair;
  let tokenAddress: anchor.web3.PublicKey;
  let metadataAddress: anchor.web3.PublicKey;
  let masterEditionAddress: anchor.web3.PublicKey;

  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  const NFT_NAME = "My Cool NFT";
  const NFT_SYMBOL = "COOL";
  const NFT_URI = "https://example.com/my-cool-nft";

  before(async () => {
    mintKeypair = anchor.web3.Keypair.generate();

    metadataAddress = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];

    masterEditionAddress = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];

    tokenAddress = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      wallet.publicKey
    );
  });

  it("Mints an NFT", async () => {
    const mintPDA = PublicKey.findProgramAddressSync(
      [Buffer.from("mint")],
      program.programId
    )[0];

    console.log("mintPDA", mintPDA.toBase58());
    await program.methods
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

      const mintAccount = await program.provider.connection.getAccountInfo(mintPDA);
      if (!mintAccount) {
        console.log("PDA is not initialized");
      } else {
        console.log("PDA initialized", mintAccount.owner.toBase58());
      }
      
    const tokenAccount = await program.provider.connection.getAccountInfo(tokenAddress);
    expect(tokenAccount).to.not.be.null;
  });

  // it("Transfers the NFT", async () => {
  //   const recipient = anchor.web3.Keypair.generate();
  //   const recipientTokenAddress = await getAssociatedTokenAddress(
  //     mintKeypair.publicKey,
  //     recipient.publicKey
  //   );

  //   await program.methods
  //     .transferNft()
  //     .accounts({
  //       sender: wallet.publicKey,
  //       senderNftTokenAccount: tokenAddress,
  //       recipientNftTokenAccount: recipientTokenAddress,
  //       recipient: recipient.publicKey,
  //       tokenMint: mintKeypair.publicKey,
  //       tokenProgram: TOKEN_PROGRAM_ID,
  //       associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //       systemProgram: anchor.web3.SystemProgram.programId,
  //       rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  //     })
  //     .preInstructions([
  //       createAssociatedTokenAccountInstruction(
  //         wallet.publicKey,
  //         recipientTokenAddress,
  //         recipient.publicKey,
  //         mintKeypair.publicKey
  //       ),
  //     ])
  //     .rpc();

  //   const recipientTokenAccount = await program.provider.connection.getAccountInfo(recipientTokenAddress);
  //   expect(recipientTokenAccount).to.not.be.null;

  //   const senderTokenAccount = await program.provider.connection.getAccountInfo(tokenAddress);
  //   expect(senderTokenAccount).to.be.null;
  // });

  // it("Burns the NFT", async () => {
  //   await program.methods
  //     .burnNft()
  //     .accounts({
  //       admin: wallet.publicKey,
  //       tokenMint: mintKeypair.publicKey,
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

  //   const mintAccount = await program.provider.connection.getAccountInfo(mintKeypair.publicKey);
  //   expect(mintAccount).to.be.null;

  //   const tokenAccount = await program.provider.connection.getAccountInfo(tokenAddress);
  //   expect(tokenAccount).to.be.null;
  // });
});