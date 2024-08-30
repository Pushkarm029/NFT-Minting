import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import type { BossBattle } from "../target/types/boss_battle";

// Configure the client to use the local cluster
anchor.setProvider(anchor.AnchorProvider.env());

const program = anchor.workspace.BossBattle as anchor.Program<BossBattle>;

const [enemyBossPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("boss")],
    program.programId
);

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

async function respawnEnemyBoss() {
    console.log("Respawning Enemy Boss");
    const tx = await program.methods.respawn().accounts({
        player: program.provider.publicKey,
    }).rpc();
    await confirmAndLogTransaction(tx);

    const enemyBossData = await program.account.enemyBoss.fetch(enemyBossPDA);
    console.log("Enemy Health: ", enemyBossData.health.toNumber() + "\n");
}

async function attackLoop() {
    let enemyBossData;

    try {
        do {
            console.log("Attacking Enemy Boss");
            const tx = await program.methods
                .attack()
                .accounts({
                    player: program.provider.publicKey,
                    enemyBoss: enemyBossPDA,
                })
                .rpc();
            await confirmAndLogTransaction(tx);

            enemyBossData = await program.account.enemyBoss.fetch(enemyBossPDA);
            console.log("Enemy Health: ", enemyBossData.health.toNumber() + "\n");
        } while (enemyBossData.health.toNumber() >= 0);
    } catch (e) {
        console.log(e.error.errorMessage);
    }
}

// await respawnEnemyBoss();
// await attackLoop();