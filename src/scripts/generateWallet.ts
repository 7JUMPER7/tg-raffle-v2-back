import dotenv from "dotenv";
dotenv.config();

import { WalletContractV5R1 } from "@ton/ton";
import { mnemonicNew, mnemonicToWalletKey } from "@ton/crypto";

const main = async () => {
    // Generate mnemonic seed phrase (24 words)
    const mnemonic = await mnemonicNew(24);
    // Derive key pair from mnemonic phrase
    const { publicKey, secretKey } = await mnemonicToWalletKey(mnemonic);

    // Create Wallet V5R1 contract
    const wallet = WalletContractV5R1.create({
        workchain: 0,
        publicKey,
    });
    
    console.log("Generated TON Wallet V5R1:");
    console.log("Address:", wallet.address.toString());
    console.log("Mnemonic seed phrase:", mnemonic.join(" "));
    console.log("Private key (hex):", secretKey.toString("hex"));
    console.log("Public key (hex):", publicKey.toString("hex"));
};

main();
