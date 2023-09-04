import {
    PublicKey, Connection, LAMPORTS_PER_SOL, SystemProgram, TransactionInstruction, Keypair,
    TransactionMessage, VersionedTransaction, clusterApiUrl, Cluster
} from '@solana/web3.js'
import {
    getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountIdempotentInstruction, createTransferInstruction
} from '@solana/spl-token';
import dotenv from 'dotenv'

dotenv.config()


async function depositSparks(receiver: PublicKey, sparksToDeposit: number) {
    const adminWallet = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(process.env.ADMIN_SECRET_KEY!))
    );
    const connection = new Connection(clusterApiUrl(process.env.SOLANA_CLUSTER! as Cluster))
    const sparkMint = new PublicKey(process.env.SPARK_MINT!)
    const allInstructions: TransactionInstruction[] = [];

    const minRequiredSolAmount = LAMPORTS_PER_SOL / 100;  // 0.01 SOL should be enough to send money to the exchange
    const actualReceiversBalance = await connection.getBalance(receiver)
    if (actualReceiversBalance < minRequiredSolAmount) {
        allInstructions.push(SystemProgram.transfer({
            fromPubkey: adminWallet.publicKey,
            toPubkey: receiver,
            lamports: minRequiredSolAmount - actualReceiversBalance,
        }))
    }

    const usersAccountSpakrs = getAssociatedTokenAddressSync(sparkMint, receiver, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    allInstructions.push(createAssociatedTokenAccountIdempotentInstruction(
        adminWallet.publicKey,
        usersAccountSpakrs,
        receiver,
        sparkMint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    ));

    const adminsAccountSpakrs = getAssociatedTokenAddressSync(sparkMint, adminWallet.publicKey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    allInstructions.push(createTransferInstruction(
        adminsAccountSpakrs,
        usersAccountSpakrs,
        adminWallet.publicKey,
        sparksToDeposit
    ))

    const messageV0 = new TransactionMessage({
        payerKey: adminWallet.publicKey,
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
        instructions: allInstructions
    }).compileToV0Message();

    const createMetadataTransaction = new VersionedTransaction(messageV0);
    createMetadataTransaction.sign([adminWallet]);

    const txHash = await connection.sendTransaction(createMetadataTransaction, {
        preflightCommitment: "confirmed",
    });

    // Would be nice to save it to the database
    console.log(txHash);
}

const sparkDecimals = LAMPORTS_PER_SOL;
depositSparks(new PublicKey("2KgowxogBrGqRcgXQEmqFvC3PGtCu66qERNJevYW8Ajh"), sparkDecimals / 100);