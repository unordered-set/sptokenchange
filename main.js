"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function depositSparks(receiver, sparksToDeposit) {
    return __awaiter(this, void 0, void 0, function* () {
        const adminWallet = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.ADMIN_SECRET_KEY)));
        const connection = new web3_js_1.Connection((0, web3_js_1.clusterApiUrl)(process.env.SOLANA_CLUSTER));
        const sparkMint = new web3_js_1.PublicKey(process.env.SPARK_MINT);
        const allInstructions = [];
        const minRequiredSolAmount = web3_js_1.LAMPORTS_PER_SOL / 100; // 0.01 SOL should be enough to send money to the exchange
        const actualReceiversBalance = yield connection.getBalance(receiver);
        if (actualReceiversBalance < minRequiredSolAmount) {
            allInstructions.push(web3_js_1.SystemProgram.transfer({
                fromPubkey: adminWallet.publicKey,
                toPubkey: receiver,
                lamports: minRequiredSolAmount - actualReceiversBalance,
            }));
        }
        const usersAccountSpakrs = (0, spl_token_1.getAssociatedTokenAddressSync)(sparkMint, receiver, false, spl_token_1.TOKEN_PROGRAM_ID, spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID);
        allInstructions.push((0, spl_token_1.createAssociatedTokenAccountIdempotentInstruction)(adminWallet.publicKey, usersAccountSpakrs, receiver, sparkMint, spl_token_1.TOKEN_PROGRAM_ID, spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID));
        const adminsAccountSpakrs = (0, spl_token_1.getAssociatedTokenAddressSync)(sparkMint, adminWallet.publicKey, false, spl_token_1.TOKEN_PROGRAM_ID, spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID);
        allInstructions.push((0, spl_token_1.createTransferInstruction)(adminsAccountSpakrs, usersAccountSpakrs, adminWallet.publicKey, sparksToDeposit));
        const messageV0 = new web3_js_1.TransactionMessage({
            payerKey: adminWallet.publicKey,
            recentBlockhash: (yield connection.getLatestBlockhash()).blockhash,
            instructions: allInstructions
        }).compileToV0Message();
        const createMetadataTransaction = new web3_js_1.VersionedTransaction(messageV0);
        createMetadataTransaction.sign([adminWallet]);
        const txHash = yield connection.sendTransaction(createMetadataTransaction, {
            preflightCommitment: "confirmed",
        });
        // Would be nice to save it to the database
        console.log(txHash);
    });
}
const sparkDecimals = web3_js_1.LAMPORTS_PER_SOL;
depositSparks(new web3_js_1.PublicKey("4qti6FcMybVSLL2k4rqRQ3Ph1a2jGrzPmBN8Wmt4A5wr"), sparkDecimals / 100);
