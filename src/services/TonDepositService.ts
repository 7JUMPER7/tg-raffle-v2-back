import { TonClient, WalletContractV5R1, Address, beginCell, internal, toNano, SendMode } from "@ton/ton";
import { Cell, Transaction } from "@ton/core";
import { KeyPair, mnemonicToPrivateKey } from "@ton/crypto";
import { checkReferralCode, timeout } from "../helpers/Helpers";
import UserDBController from "../DBControllers/UserDBController";
import TonDepositDBController from "../DBControllers/TonDepositDBController";
import { TWithdrawUser } from "../helpers/Types";
import TonWithdrawDBController from "../DBControllers/TonWithdrawDBController";

// if (!process.env.TON_WALLET_SEED) {
//     throw new Error("TON_WALLET_SEED not set");
// }
// if (!process.env.TONCENTER_ENDPOINT) {
//     throw new Error("TONCENTER_ENDPOINT not set");
// }
// if (!process.env.TONCENTER_API_KEY) {
//     throw new Error("TONCENTER_API_KEY not set");
// }

const CHECK_INTERVAL_MS = 5000;

class TonDepositService {
    private client: TonClient;
    private keyPair!: KeyPair;
    private wallet!: WalletContractV5R1;

    private lastLt?: bigint;
    private withdrawals: Array<TWithdrawUser> = [];

    constructor() {
        this.client = new TonClient({ endpoint: process.env.TONCENTER_ENDPOINT!, apiKey: process.env.TONCENTER_API_KEY! });
    }

    get depositAddress() {
        return this.wallet.address.toString({ bounceable: false });
    }

    init = async () => {
        const words = process.env.TON_WALLET_SEED!.trim().split(/\s+/);
        this.keyPair = await mnemonicToPrivateKey(words);
        this.wallet = WalletContractV5R1.create({
            workchain: 0,
            publicKey: this.keyPair.publicKey,
        });
        console.log(`Initialized TON Deposit Service for wallet: ${this.wallet.address.toString({ bounceable: false })}`);
    };

    startLoop = async () => {
        try {
            await this.processTransactions();
            await timeout(CHECK_INTERVAL_MS);
        } catch (e: any) {
            console.error("TonDepositService startLoop error:", e.message);
        } finally {
            this.startLoop();
        }
    };

    // Fetch last transactions and process them
    private processTransactions = async () => {
        try {
            const txs = await this.client.getTransactions(this.wallet.address, {
                limit: 20,
                to_lt: this.lastLt?.toString(),
            });
            if (txs.length === 0) return;

            for (const tx of txs.reverse()) {
                this.lastLt = tx.lt;
                await this.parseTransaction(tx);
            }
        } catch (e: any) {
            console.error("TonDepositService processTransactions error:", e.message);
        }
    };

    // Parse transaction and credit user if valid deposit
    private parseTransaction = async (tx: Transaction) => {
        try {
            const inMsg = tx.inMessage;
            if (!inMsg || inMsg.info.type !== "internal" || !inMsg.info.dest) return null;

            const src = inMsg.info.src;
            const dest = inMsg.info.dest;
            if (!dest.equals(this.wallet.address)) return null;

            const nano = inMsg.info.value.coins ?? 0n;
            if (nano === 0n) return null;

            const userRefCode = this.extractRefferalCode(inMsg.body);
            if (!userRefCode) return null;

            const hash = Buffer.from(tx.hash()).toString("hex");
            await this.creditUser(userRefCode, nano, src.toString(), hash);
        } catch (e: any) {
            console.error("TonDepositService parseTransaction error:", e.message);
            return null;
        }
    };

    // Extract referral code from tx comment
    private extractRefferalCode = (body?: Cell): string | null => {
        if (!body) return null;
        const cs = body.beginParse();
        if (cs.remainingBits < 32 || cs.loadUint(32) !== 0) return null;
        const comment = cs.loadStringTail();
        return checkReferralCode(comment) ? comment : null;
    };

    // Update user balance & create deposit record
    private async creditUser(refCode: string, nano: bigint, srcWallet: string, hash: string) {
        const dbDeposit = await TonDepositDBController.getByHash(hash);
        if (dbDeposit) {
            throw new Error(`Deposit with hash ${hash} already exists, skipping.`);
        }

        const ton = Number(nano) / 1e9;
        const dbUser = await UserDBController.getByReferralCode(refCode);
        const userId = dbUser?.id || null;
        const result = await TonDepositDBController.create(hash, srcWallet, refCode, ton, userId);
        if (!result) {
            throw new Error(`Failed to create deposit for user ${userId} with referral code ${refCode} (${ton} TON)`);
        }

        console.log(`New deposit for user ${userId || "Unknown"} from ${srcWallet} (${ton} TON)`);
        if (dbUser) {
            await UserDBController.updateBalances(dbUser, ton, 0, 0);
        } else {
            console.error(`User with referral code ${refCode} not found`);
        }
    }

    // Withdraw funds to user address
    private withdrawToAddress = async (userId: string, destWallet: string, amount: number) => {
        let wasSent = false;
        const user = await UserDBController.get(userId);
        if (!user) {
            console.log("User not found for withdraw");
            return null;
        }
        if (user.tonBalance < amount) {
            console.log(`Insufficient balance for user ${userId}: ${user.tonBalance} < ${amount}`);
            return null;
        }
        // Charge user before sending transaction to prevent multi withdraw
        await UserDBController.updateBalances(user, -amount, 0, 0);

        try {
            // Open wallet contract
            const nanoAmount = toNano(amount);
            const walletContract = this.client.open(this.wallet);

            // Check service wallet balance
            const balance = await walletContract.getBalance();
            if (balance < nanoAmount) {
                throw new Error(`Insufficient balance for withdrawal: ${balance} < ${nanoAmount}`);
            }

            // Build internal transfer
            const seqno = await walletContract.getSeqno();
            const comment = "TON withdrawal";
            const internalMessage = internal({
                to: Address.parse(destWallet),
                value: nanoAmount,
                bounce: true,
                body: beginCell().storeUint(0, 32).storeStringTail(comment).endCell(),
            });

            // Send
            await walletContract.sendTransfer({
                seqno,
                secretKey: this.keyPair.secretKey,
                messages: [internalMessage],
                sendMode: SendMode.PAY_GAS_SEPARATELY,
            });
            wasSent = true;

            // Save withdrawal record
            const hash = "";
            await TonWithdrawDBController.create(hash, destWallet, comment, amount, user.id);

            // Wait until seqno increments (tx confirmed)
            for (let i = 0; i < 30; i++) {
                const newSeqno = await walletContract.getSeqno();
                if (newSeqno !== seqno) {
                    console.log(`Withdrawn ${amount} TON to ${destWallet}`);
                    return true;
                }
                await timeout(1000);
            }

            return true;
        } catch (e: any) {
            console.error("TonDepositService withdrawToAddress error:", e?.message ?? e);
            if (!wasSent) {
                await UserDBController.updateBalances(user, amount, 0, 0);
            }
            return null;
        }
    };

    // Add withdrawal to queue
    addWithdrawal = (userId: string, address: string, amount: number) => {
        this.withdrawals.push({ userId, address, amount });
        if (this.withdrawals.length === 1) {
            // If queue was empty, start processing right away.
            this.next();
        }
    };

    private removeFirst = () => {
        this.withdrawals.shift();
    };

    private next = async () => {
        if (this.withdrawals.length === 0) return;

        try {
            const { userId, address, amount } = this.withdrawals[0];
            await this.withdrawToAddress(userId, address, amount);
            this.removeFirst();
            await timeout(500);
        } catch (e: any) {
            console.error("TonDepositService withdrawal error:", e?.message ?? e);
        } finally {
            this.next();
        }
    };
}

export default new TonDepositService();
