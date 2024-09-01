import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import type { NFT } from "../target/types/nft";

// Configure the client to use the local cluster
anchor.setProvider(anchor.AnchorProvider.env());

const program = anchor.workspace.NFT as anchor.Program<NFT>;

async function confirmAndLogTransaction(txHash) {
    const { blockhash, lastValidBlockHeight } =
        await program.provider.connection.getLatestBlockhash();

    await program.provider.connection.confirmTransaction(
        {
            blockhash,
            lastValidBlockHeight,
            signature: txHash,
        },
        "confirmed"
    );

    console.log(
        `Solana Explorer: https://explorer.solana.com/tx/${txHash}?cluster=devnet`
    );
}
