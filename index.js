// ============================================
// AUTO BOT CREEK FINANCE - SUI TESTNET
// by WangMinHei - ĐẸP TRAI :)
// ============================================

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { config } from 'dotenv';

config({ path: 'private.env' });
if (!process.env.PK1) {
    console.error('LỖI: File private.env không tồn tại hoặc trống!');
    console.error('Hướng dẫn: Tạo file private.env với PK1, PK2...');
    process.exit(1);
}

// ============================================
// CẤU HÌNH
// ============================================
const CONFIG = {
    RPC_URL: 'https://sui-testnet-rpc.publicnode.com',
    PROXY_FILE: 'proxy.txt',
    SUI_FAUCET_URL: 'https://faucet.testnet.sui.io/v2/gas',
    MIN_SUI_BALANCE: 1,
    MIST_PER_SUI: 1000000000,
    GAS_BUDGET: '200000000',
    DECIMALS: 1000000000,
    XAUM_CLAIM_COUNT: 3,
    USDC_CLAIM_COUNT: 3,
    SWAP_USDC_TO_GUSD_COUNT: 3,
    SWAP_GUSD_TO_USDC_COUNT: 1,
    STAKE_XAUM_COUNT: 3,
    REDEEM_XAUM_COUNT: 3,
    DEPOSIT_GR_COUNT: 3,
    DEPOSIT_SUI_COUNT: 3,
    DEPOSIT_USDC_COUNT: 3,
    BORROW_GUSD_COUNT: 3,
    REPAY_GUSD_COUNT: 3,
    WITHDRAW_COUNT: 3,
    COIN_FETCH_RETRIES: 5,
    RATE_LIMIT_COOLDOWN: 30,
    FAUCET_PACKAGE: '0xa03cb0b29e92c6fa9bfb7b9c57ffdba5e23810f20885b4390f724553d32efb8b',
    XAUM_SHARED_OBJECT: '0x66984752afbd878aaee450c70142747bb31fca2bb63f0a083d75c361da39adb1',
    USDC_SHARED_OBJECT: '0x77153159c4e3933658293a46187c30ef68a8f98aa48b0ce76ffb0e6d20c0776b',
    GUSD_PACKAGE: '0x8cee41afab63e559bc236338bfd7c6b2af07c9f28f285fc8246666a7ce9ae97a',
    GUSD_VAULT: '0x1fc1b07f7c1d06d4d8f0b1d0a2977418ad71df0d531c476273a2143dfeffba0e',
    GUSD_MARKET: '0x166dd68901d2cb47b55c7cfbb7182316f84114f9e12da9251fd4c4f338e37f5d',
    STAKING_MANAGER: '0x5c9d26e8310f740353eac0e67c351f71bad8748cf5ac90305ffd32a5f3326990',
    CLOCK_OBJECT: '0x0000000000000000000000000000000000000000000000000000000000000006',
    LENDING_PACKAGE: '0x8cee41afab63e559bc236338bfd7c6b2af07c9f28f285fc8246666a7ce9ae97a',
    PROTOCOL_OBJECT: '0x13f4679d0ebd6fc721875af14ee380f45cde02f81d690809ac543901d66f6758',
    LENDING_MARKET: '0x166dd68901d2cb47b55c7cfbb7182316f84114f9e12da9251fd4c4f338e37f5d',
    XORACLE_OBJECT: '0x9052b77605c1e2796582e996e0ce60e2780c9a440d8878a319fa37c50ca32530',
    PRICE_ORACLE: '0x3a865c5bc0e47efc505781598396d75b647e4f1218359e89b08682519c3ac060',
    ORACLE_PACKAGE: '0xca9b2f66c5ab734939e048d0732e2a09f486402bb009d88f95c27abe8a4872ee',
    RULE_PACKAGE: '0xbd6d8bb7f40ca9921d0c61404cba6dcfa132f184cf8c0f273008a103889eb0e8',
    USDC_TYPE: '0xa03cb0b29e92c6fa9bfb7b9c57ffdba5e23810f20885b4390f724553d32efb8b::usdc::USDC',
    GUSD_TYPE: '0x5434351f2dcae30c0c4b97420475c5edc966b02fd7d0bbe19ea2220d2f623586::coin_gusd::COIN_GUSD',
    XAUM_TYPE: '0xa03cb0b29e92c6fa9bfb7b9c57ffdba5e23810f20885b4390f724553d32efb8b::coin_xaum::COIN_XAUM',
    GY_TYPE: '0x0ac2d5ebd2834c0db725eedcc562c60fa8e281b1772493a4d199fd1e70065671::coin_gy::COIN_GY',
    GR_TYPE: '0x5504354cf3dcbaf64201989bc734e97c1d89bba5c7f01ff2704c43192cc2717c::coin_gr::COIN_GR',
    SUI_TYPE: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
};

const HEALTH_FACTOR_CONFIG = {
    DEPOSIT_PERCENTAGE: { GR: 0.70, SUI: 0.010, USDC: 0.80 },
    MIN_RESERVE: { GR: 50 * 1e9, SUI: 1 * 1e9, USDC: 5 * 1e9 },
    PRICE: { GR: 150.5, SUI: 3.18, USDC: 1.0, GUSD: 1.05 }
};

const suiClient = new SuiClient({ url: CONFIG.RPC_URL });

// ============================================
// UTILITY
// ============================================
function getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
}
async function delay(ms, msg = 'Đang chờ') {
    console.log(`[Clock] ${msg} ${Math.floor(ms / 1000)} giây...`);
    return new Promise(r => setTimeout(r, ms));
}
function getRandomAmount(min, max) {
    return Math.floor((Math.random() * (max - min) + min) * CONFIG.DECIMALS);
}
function readPrivateKeys() {
    const keys = [];
    let i = 1;
    while (process.env[`PK${i}`]) {
        const k = process.env[`PK${i}`].trim();
        if (k && k.length > 10) keys.push(k);
        i++;
    }
    return keys;
}
function importWallet(k) {
    try {
        const s = decodeSuiPrivateKey(k);
        const kp = Ed25519Keypair.fromSecretKey(s.secretKey);
        return { keypair: kp, address: kp.getPublicKey().toSuiAddress() };
    } catch { return null; }
}

// ============================================
// BALANCE & COINS
// ============================================
async function getSuiBalance(addr) {
    try {
        return parseInt((await suiClient.getBalance({ owner: addr })).totalBalance) / CONFIG.MIST_PER_SUI;
    } catch { return 0; }
}
async function ensureSuiFaucet(addr) {
    if (await getSuiBalance(addr) >= CONFIG.MIN_SUI_BALANCE) return true;
    for (let i = 1; i <= 5; i++) {
        try {
            const res = await fetch(CONFIG.SUI_FAUCET_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ FixedAmountRequest: { recipient: addr } })
            });
            if (res.status === 200) return true;
            if (res.status === 429) await delay(5000);
        } catch { await delay(5000); }
    }
    return false;
}
async function getCoins(addr, type) {
    try {
        return (await suiClient.getCoins({ owner: addr, coinType: type })).data;
    } catch (e) {
        if (e.message.includes('429')) await delay(CONFIG.RATE_LIMIT_COOLDOWN * 1000);
        return [];
    }
}
async function getCoinsWithRetry(addr, type) {
    let coins = [];
    for (let i = 0; i < CONFIG.COIN_FETCH_RETRIES; i++) {
        coins = await getCoins(addr, type);
        if (coins.length > 0) break;
        await delay(getRandomDelay(10, 15));
    }
    return coins;
}
async function getTokenBalance(addr, type) {
    if (type === CONFIG.SUI_TYPE) return await getSuiBalance(addr);
    const coins = await getCoins(addr, type);
    const total = coins.reduce((s, c) => s + BigInt(c.balance), 0n);
    return Number(total) / CONFIG.DECIMALS;
}
async function getWalletBalances(addr) {
    return {
        GR: Number(await getTokenBalance(addr, CONFIG.GR_TYPE)),
        SUI: Number(await getTokenBalance(addr, CONFIG.SUI_TYPE)),
        USDC: Number(await getTokenBalance(addr, CONFIG.USDC_TYPE)),
        GUSD: Number(await getTokenBalance(addr, CONFIG.GUSD_TYPE)),
        XAUM: Number(await getTokenBalance(addr, CONFIG.XAUM_TYPE))
    };
}
function printBalanceReport(addr, b, a) {
    console.log(`\nBÁO CÁO SỐ DƯ SAU XỬ LÝ`);
    console.log(`Địa chỉ: ${addr.substring(0, 8)}...${addr.slice(-6)}`);
    console.log(`GR:   ${b.GR.toFixed(2)} → ${a.GR.toFixed(2)}`);
    console.log(`SUI:  ${b.SUI.toFixed(6)} → ${a.SUI.toFixed(6)}`);
    console.log(`USDC: ${b.USDC.toFixed(2)} → ${a.USDC.toFixed(2)}`);
    console.log(`GUSD: ${b.GUSD.toFixed(2)} → ${a.GUSD.toFixed(2)}`);
    console.log(`XAUM: ${b.XAUM.toFixed(2)} → ${a.XAUM.toFixed(2)}`);
}

// ============================================
// CLAIM XAUM & USDC
// ============================================
async function claimXaumFaucet(kp, addr, i) {
    console.log(`BƯỚC 2: Claim XAUM #${i}...`);
    const tx = new Transaction();
    tx.moveCall({
        target: `${CONFIG.FAUCET_PACKAGE}::coin_xaum::mint`,  // ĐÃ SỬA
        arguments: [
            tx.object(CONFIG.XAUM_SHARED_OBJECT),
            tx.pure.u64('1000000000'),     // 1 XAUM
            tx.pure.address(addr)
        ]
    });
    tx.setGasBudget(CONFIG.GAS_BUDGET);
    try {
        const r = await suiClient.signAndExecuteTransaction({ transaction: tx, signer: kp });
        const success = r.effects?.status?.status === 'success';
        console.log(success ? `Thành công!` : `Thất bại: ${r.effects?.status?.error || 'Unknown'}`);
        return success;
    } catch (e) {
        console.log(`Lỗi: ${e.message}`);
        return false;
    }
}

async function claimUsdcFaucet(kp, addr, i) {
    console.log(`BƯỚC 3: Claim USDC #${i}...`);
    const tx = new Transaction();
    tx.moveCall({
        target: `${CONFIG.FAUCET_PACKAGE}::usdc::mint`,  // ĐÃ SỬA
        arguments: [
            tx.object(CONFIG.USDC_SHARED_OBJECT),
            tx.pure.u64('10000000000'),    // 10 USDC
            tx.pure.address(addr)
        ]
    });
    tx.setGasBudget(CONFIG.GAS_BUDGET);
    try {
        const r = await suiClient.signAndExecuteTransaction({ transaction: tx, signer: kp });
        const success = r.effects?.status?.status === 'success';
        console.log(success ? `Thành công!` : `Thất bại`);
        return success;
    } catch (e) {
        console.log(`Lỗi: ${e.message}`);
        return false;
    }
}

// ============================================
// SWAP, STAKE, REDEEM, DEPOSIT, BORROW, REPAY, WITHDRAW
// ============================================
async function swapUsdcToGusd(kp, addr, i) {
    console.log(`BƯỚC 4: Swap USDC → GUSD #${i}...`);
    const amount = getRandomAmount(1, 5);
    const coins = await getCoinsWithRetry(addr, CONFIG.USDC_TYPE);
    if (!coins.length) { console.log('Không có USDC'); return false; }
    const tx = new Transaction();
    let coin = tx.object(coins[0].coinObjectId);
    if (coins.length > 1) tx.mergeCoins(coin, coins.slice(1).map(c => tx.object(c.coinObjectId)));
    const [split] = tx.splitCoins(coin, [tx.pure.u64(amount.toString())]);
    tx.moveCall({
        target: `${CONFIG.GUSD_PACKAGE}::gusd_usdc_vault::mint_gusd`,
        arguments: [tx.object(CONFIG.GUSD_VAULT), tx.object(CONFIG.GUSD_MARKET), split, tx.object(CONFIG.CLOCK_OBJECT)]
    });
    tx.setGasBudget(CONFIG.GAS_BUDGET);
    try {
        const r = await suiClient.signAndExecuteTransaction({ transaction: tx, signer: kp });
        return r.effects?.status?.status === 'success';
    } catch { return false; }
}

async function swapGusdToUsdc(kp, addr, i) {
    console.log(`BƯỚC 5: Swap GUSD → USDC #${i}...`);
    const amount = getRandomAmount(1, 3);
    const coins = await getCoinsWithRetry(addr, CONFIG.GUSD_TYPE);
    if (!coins.length) { console.log('Không có GUSD'); return false; }
    const tx = new Transaction();
    let coin = tx.object(coins[0].coinObjectId);
    if (coins.length > 1) tx.mergeCoins(coin, coins.slice(1).map(c => tx.object(c.coinObjectId)));
    const [split] = tx.splitCoins(coin, [tx.pure.u64(amount.toString())]);
    tx.moveCall({
        target: `${CONFIG.GUSD_PACKAGE}::gusd_usdc_vault::redeem_gusd`,
        arguments: [tx.object(CONFIG.GUSD_VAULT), tx.object(CONFIG.GUSD_MARKET), split]
    });
    tx.setGasBudget(CONFIG.GAS_BUDGET);
    try {
        const r = await suiClient.signAndExecuteTransaction({ transaction: tx, signer: kp });
        return r.effects?.status?.status === 'success';
    } catch { return false; }
}

async function stakeXaum(kp, addr, i) {
    console.log(`BƯỚC 6: Stake XAUM #${i}...`);
    const amount = getRandomAmount(1, 3);
    const coins = await getCoinsWithRetry(addr, CONFIG.XAUM_TYPE);
    if (!coins.length) return false;
    const tx = new Transaction();
    let coin = tx.object(coins[0].coinObjectId);
    if (coins.length > 1) tx.mergeCoins(coin, coins.slice(1).map(c => tx.object(c.coinObjectId)));
    const [split] = tx.splitCoins(coin, [tx.pure.u64(amount.toString())]);
    tx.moveCall({
        target: `${CONFIG.GUSD_PACKAGE}::staking_manager::stake_xaum`,
        arguments: [tx.object(CONFIG.STAKING_MANAGER), split]
    });
    tx.setGasBudget(CONFIG.GAS_BUDGET);
    try {
        const r = await suiClient.signAndExecuteTransaction({ transaction: tx, signer: kp });
        return r.effects?.status?.status === 'success';
    } catch { return false; }
}

async function redeemXaum(kp, addr, i) {
    console.log(`BƯỚC 7: Redeem XAUM #${i}...`);
    const amount = getRandomAmount(0.1, 1);
    const grCoins = await getCoinsWithRetry(addr, CONFIG.GR_TYPE);
    const gyCoins = await getCoinsWithRetry(addr, CONFIG.GY_TYPE);
    if (!grCoins.length || !gyCoins.length) return false;
    const tx = new Transaction();
    let grCoin = tx.object(grCoins[0].coinObjectId);
    let gyCoin = tx.object(gyCoins[0].coinObjectId);
    if (grCoins.length > 1) tx.mergeCoins(grCoin, grCoins.slice(1).map(c => tx.object(c.coinObjectId)));
    if (gyCoins.length > 1) tx.mergeCoins(gyCoin, gyCoins.slice(1).map(c => tx.object(c.coinObjectId)));
    const [grSplit] = tx.splitCoins(grCoin, [tx.pure.u64((amount * 100).toString())]);
    const [gySplit] = tx.splitCoins(gyCoin, [tx.pure.u64((amount * 100).toString())]);
    tx.moveCall({
        target: `${CONFIG.GUSD_PACKAGE}::staking_manager::unstake`,
        arguments: [tx.object(CONFIG.STAKING_MANAGER), grSplit, gySplit]
    });
    tx.setGasBudget(CONFIG.GAS_BUDGET);
    try {
        const r = await suiClient.signAndExecuteTransaction({ transaction: tx, signer: kp });
        return r.effects?.status?.status === 'success';
    } catch { return false; }
}

async function depositGrCollateral(kp, addr, i, obligationId = null, obligationKeyId = null) {
    console.log(`BƯỚC 8: Deposit GR #${i}...`);
    const coins = await getCoinsWithRetry(addr, CONFIG.GR_TYPE);
    if (!coins.length) return { success: false };
    const amount = getRandomAmount(1, 10);
    const tx = new Transaction();
    let coin = tx.object(coins[0].coinObjectId);
    if (coins.length > 1) tx.mergeCoins(coin, coins.slice(1).map(c => tx.object(c.coinObjectId)));
    const [split] = tx.splitCoins(coin, [tx.pure.u64(amount.toString())]);

    if (!obligationId) {
        const [newObligation, newKey] = tx.moveCall({
            target: `${CONFIG.LENDING_PACKAGE}::open_obligation::open_obligation`,
            arguments: [tx.object(CONFIG.PROTOCOL_OBJECT)]
        });
        tx.moveCall({
            target: `${CONFIG.LENDING_PACKAGE}::deposit_collateral::deposit_collateral`,
            typeArguments: [CONFIG.GR_TYPE],
            arguments: [tx.object(CONFIG.PROTOCOL_OBJECT), newObligation, tx.object(CONFIG.LENDING_MARKET), split]
        });
        tx.transferObjects([newKey], tx.pure.address(addr));
    } else {
        tx.moveCall({
            target: `${CONFIG.LENDING_PACKAGE}::deposit_collateral::deposit_collateral`,
            typeArguments: [CONFIG.GR_TYPE],
            arguments: [tx.object(CONFIG.PROTOCOL_OBJECT), tx.object(obligationId), tx.object(CONFIG.LENDING_MARKET), split]
        });
    }
    tx.setGasBudget(CONFIG.GAS_BUDGET);
    try {
        const r = await suiClient.signAndExecuteTransaction({ transaction: tx, signer: kp, options: { showObjectChanges: true } });
        if (r.effects?.status?.status === 'success') {
            if (!obligationId && r.objectChanges) {
                const created = r.objectChanges.find(o => o.type === 'created' && o.objectType.includes('Obligation'));
                const key = r.objectChanges.find(o => o.type === 'created' && o.objectType.includes('ObligationKey'));
                return { success: true, obligationId: created?.objectId, obligationKeyId: key?.objectId };
            }
            return { success: true, obligationId, obligationKeyId };
        }
        return { success: false };
    } catch { return { success: false }; }
}

// (Các hàm depositSuiCollateral, depositUsdcCollateral, borrowGusd, repayGusd, withdrawGrCollateral - tương tự, dùng tx.pure.u64)

// ============================================
// XỬ LÝ VÍ (13 BƯỚC)
// ============================================
async function processWallet(kp, addr, idx, total) {
    console.log(`\nWALLET ${idx}/${total} | ${addr.substring(0, 8)}...${addr.slice(-6)}`);
    console.log(`Dùng IP cục bộ`);

    const before = await getWalletBalances(addr);
    console.log(`\nSố dư ban đầu:\n  SUI: ${before.SUI.toFixed(6)}\n  USDC: ${before.USDC.toFixed(2)}\n  XAUM: ${before.XAUM.toFixed(2)}`);

    let stats = { xaumClaims: 0, usdcClaims: 0, swapUsdcToGusd: 0, swapGusdToUsdc: 0, stakes: 0, redeems: 0, depositGr: 0 };
    let obligationId = null, obligationKeyId = null;

    if (!(await ensureSuiFaucet(addr))) {
        console.log('Không đủ SUI → Bỏ qua ví');
        return { success: false };
    }

    // 1. Claim XAUM
    for (let i = 1; i <= CONFIG.XAUM_CLAIM_COUNT; i++) {
        if (await claimXaumFaucet(kp, addr, i)) stats.xaumClaims++;
        await delay(getRandomDelay(5, 10));
    }

    // 2. Claim USDC
    for (let i = 1; i <= CONFIG.USDC_CLAIM_COUNT; i++) {
        if (await claimUsdcFaucet(kp, addr, i)) stats.usdcClaims++;
        await delay(getRandomDelay(5, 10));
    }

    // 3. Swap USDC → GUSD
    for (let i = 1; i <= CONFIG.SWAP_USDC_TO_GUSD_COUNT; i++) {
        if (await swapUsdcToGusd(kp, addr, i)) stats.swapUsdcToGusd++;
        await delay(getRandomDelay(8, 12));
    }

    // 4. Swap GUSD → USDC
    for (let i = 1; i <= CONFIG.SWAP_GUSD_TO_USDC_COUNT; i++) {
        if (await swapGusdToUsdc(kp, addr, i)) stats.swapGusdToUsdc++;
        await delay(getRandomDelay(8, 12));
    }

    // 5. Stake XAUM
    for (let i = 1; i <= CONFIG.STAKE_XAUM_COUNT; i++) {
        if (await stakeXaum(kp, addr, i)) stats.stakes++;
        await delay(getRandomDelay(8, 12));
    }

    // 6. Redeem XAUM
    for (let i = 1; i <= CONFIG.REDEEM_XAUM_COUNT; i++) {
        if (await redeemXaum(kp, addr, i)) stats.redeems++;
        await delay(getRandomDelay(8, 12));
    }

    // 7. Deposit GR + Tạo Obligation
    const grRes = await depositGrCollateral(kp, addr, 1, obligationId, obligationKeyId);
    if (grRes.success) {
        stats.depositGr++;
        obligationId = grRes.obligationId;
        obligationKeyId = grRes.obligationKeyId;
        console.log(`Obligation tạo thành công: ${obligationId}`);
    }

    const after = await getWalletBalances(addr);
    printBalanceReport(addr, before, after);

    console.log(`\nHOÀN TẤT VÍ ${idx}: Claim XAUM ${stats.xaumClaims}, USDC ${stats.usdcClaims}, Swap ${stats.swapUsdcToGusd}`);
    return { success: true };
}

// ============================================
// CHẠY BOT
// ============================================
async function runDailyBot() {
    while (true) {
        const keys = readPrivateKeys();
        if (keys.length === 0) break;
        for (let i = 0; i < keys.length; i++) {
            const w = importWallet(keys[i]);
            if (w) {
                await processWallet(w.keypair, w.address, i + 1, keys.length);
                if (i < keys.length - 1) await delay(getRandomDelay(30, 60));
            }
        }
        const next = new Date(Date.now() + 24 * 3600 * 1000);
        await delay(next - Date.now(), 'Chờ 24h đến lần chạy tiếp theo');
    }
}

async function main() {
    console.log('\nBOT CREEK FINANCE - by WangMinHei - ĐẸP TRAI :)');
    runDailyBot().catch(e => console.error('Lỗi nghiêm trọng:', e.message));
}
main();
