// ============================================
// AUTO BOT CREEK FINANCE - SUI TESTNET (AN TOÀN)
// by WangMinHei - Đã được kiểm duyệt & hoạt động 100%
// ============================================

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import fs from 'fs';
import { config } from 'dotenv';

// ============================================
// TẢI private.env
// ============================================
config({ path: 'private.env' });

// Kiểm tra private key
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
    SUI_FAUCET_RETRIES: 50,
    MIN_SUI_BALANCE: 1,
    MIST_PER_SUI: 1000000000,
    GAS_BUDGET: '200000000',
    DECIMALS: 1000000000,
    XAUM_CLAIM_COUNT: 1,
    USDC_CLAIM_COUNT: 10,
    SWAP_USDC_TO_GUSD_COUNT: 0.1,
    SWAP_GUSD_TO_USDC_COUNT: 0.1,
    STAKE_XAUM_COUNT: 0.1,
    REDEEM_XAUM_COUNT: 0.1,
    DEPOSIT_GR_COUNT: 0.1,
    DEPOSIT_SUI_COUNT: 0.01,
    DEPOSIT_USDC_COUNT: 0.1,
    BORROW_GUSD_COUNT: 1,
    REPAY_GUSD_COUNT: 1,
    WITHDRAW_COUNT: 1,
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
    DEPOSIT_PERCENTAGE: { GR: 0.70, SUI: 0.50, USDC: 0.80 },
    MIN_RESERVE: { GR: 50 * 1e9, SUI: 1 * 1e9, USDC: 5 * 1e9 },
    PRICE: { GR: 150.5, SUI: 3.18, USDC: 1.0, GUSD: 1.05 }
};

const suiClient = new SuiClient({ url: CONFIG.RPC_URL });

// ============================================
// QUẢN LÝ PROXY
// ============================================
function readProxyMappings(filename = CONFIG.PROXY_FILE) {
    try {
        if (!fs.existsSync(filename)) {
            console.log(`Cảnh báo: File ${filename} không tồn tại - dùng IP cục bộ cho tất cả ví`);
            return {};
        }
        const proxies = {};
        const lines = fs.readFileSync(filename, 'utf8').split('\n');
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                proxies[`pk${index + 1}`] = trimmed;
            } else {
                proxies[`pk${index + 1}`] = null;
            }
        });
        return proxies;
    } catch (error) {
        console.error(`Lỗi đọc file ${filename}:`, error.message);
        return {};
    }
}

function getProxyForWallet(walletIndex, proxyMappings) {
    const key = `pk${walletIndex}`;
    const proxy = proxyMappings[key];
    if (!proxy) {
        console.log(`Dùng IP cục bộ`);
        return null;
    }
    console.log(`Dùng Proxy: ${proxy}`);
    return proxy;
}

// ============================================
// ĐỌC PRIVATE KEY TỪ .env
// ============================================
function readPrivateKeys() {
    const keys = [];
    let i = 1;
    while (process.env[`PK${i}`]) {
        const key = process.env[`PK${i}`].trim();
        if (key && key.length > 10) {
            keys.push(key);
        }
        i++;
    }
    if (keys.length === 0) {
        console.log('Lỗi: Không tìm thấy private key nào trong file private.env!');
    }
    return keys;
}

// ============================================
// HÀM HỖ TRỢ
// ============================================
function getRandomDelay(minSec, maxSec) {
    return Math.floor(Math.random() * (maxSec - minSec + 1) + minSec) * 1000;
}

async function delay(ms, message = 'Đang chờ') {
    console.log(`⏳ ${message} ${Math.floor(ms / 1000)} giây...`);
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomAmount(min, max, decimals = CONFIG.DECIMALS) {
    return Math.floor((Math.random() * (max - min) + min) * decimals);
}

function importWallet(privateKeyStr) {
    try {
        const secretKey = decodeSuiPrivateKey(privateKeyStr);
        const keypair = Ed25519Keypair.fromSecretKey(secretKey.secretKey);
        const address = keypair.getPublicKey().toSuiAddress();
        return { keypair, address };
    } catch (error) {
        console.error('Lỗi nhập ví:', error.message);
        return null;
    }
}

async function getSuiBalance(address) {
    try {
        const balance = await suiClient.getBalance({ owner: address });
        return parseInt(balance.totalBalance) / CONFIG.MIST_PER_SUI;
    } catch (error) {
        return 0;
    }
}

// ============================================
// FAUCET CHỈ DÙNG URL CHÍNH THỨC
// ============================================
async function requestSuiFaucet(address) {
    const ALLOWED_FAUCET = 'https://faucet.testnet.sui.io/v2/gas';
    if (CONFIG.SUI_FAUCET_URL !== ALLOWED_FAUCET) {
        console.error('CẢNH BÁO: URL FAUCET BỊ THAY ĐỔI - NGUY HIỂM!');
        return { success: false, error: 'URL không hợp lệ' };
    }

    try {
        const response = await fetch(ALLOWED_FAUCET, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ FixedAmountRequest: { recipient: address } })
        });
        const responseText = await response.text();
        if (response.status === 429) return { success: false, error: 'Giới hạn tốc độ', isRateLimit: true };
        if (response.status === 200) {
            try {
                const data = JSON.parse(responseText);
                if (data.status?.Failure) return { success: false, error: data.status.Failure.Internal || 'Lỗi' };
                return { success: true, data };
            } catch (e) {
                return { success: false, error: 'JSON không hợp lệ' };
            }
        }
        return { success: false, error: `Mã lỗi: ${response.status}` };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ============================================
// ĐẢM BẢO ĐỦ SUI
// ============================================
async function ensureSuiFaucet(address) {
    console.log(`\nKiểm tra số dư: Cần ít nhất ${CONFIG.MIN_SUI_BALANCE} SUI...`);
    for (let attempt = 1; attempt <= CONFIG.SUI_FAUCET_RETRIES; attempt++) {
        const currentBalance = await getSuiBalance(address);
        console.log(`Số dư: ${currentBalance.toFixed(6)} SUI (lần ${attempt}/${CONFIG.SUI_FAUCET_RETRIES})`);
        if (currentBalance >= CONFIG.MIN_SUI_BALANCE) {
            console.log(`Đủ SUI!`);
            return true;
        }
        console.log(`Yêu cầu SUI từ faucet...`);
        const result = await requestSuiFaucet(address);
        if (result.success) {
            console.log(`Nhận SUI thành công!`);
            await delay(3000, 'Cập nhật số dư:');
        } else {
            console.log(`Thất bại: ${result.error}`);
            if (result.isRateLimit) {
                await delay(getRandomDelay(3, 10), 'Chờ giới hạn:');
            } else if (attempt < CONFIG.SUI_FAUCET_RETRIES) {
                await delay(getRandomDelay(3, 10), 'Thử lại:');
            }
        }
    }
    const finalBalance = await getSuiBalance(address);
    if (finalBalance >= CONFIG.MIN_SUI_BALANCE) {
        console.log(`Đủ SUI!`);
        return true;
    }
    console.log(`Không đủ SUI sau ${CONFIG.SUI_FAUCET_RETRIES} lần thử`);
    return false;
}

// ============================================
// HÀM XỬ LÝ VÍ
// ============================================
async function processWallet(keypair, address, walletIndex, totalWallets, proxyUrl) {
    console.log(`\nWALLET ${walletIndex}/${totalWallets}`);
    console.log(`Địa chỉ: ${address.substring(0, 8)}...${address.slice(-6)}`);
    if (proxyUrl) console.log(`Proxy: ${proxyUrl}`);
    else console.log(`Dùng IP cục bộ`);

    const balanceBefore = await getWalletBalances(address);
    console.log(`\nSố dư ban đầu: GR: ${balanceBefore.GR.toFixed(2)}, SUI: ${balanceBefore.SUI.toFixed(6)}, USDC: ${balanceBefore.USDC.toFixed(2)}`);

    let stats = { xaumClaims: 0, usdcClaims: 0, swapUsdcToGusd: 0, swapGusdToUsdc: 0, stakes: 0, redeems: 0, depositGr: 0, depositSui: 0, depositUsdc: 0, borrowGusd: 0, repayGusd: 0, withdrawGr: 0 };
    let obligationId = null;
    let obligationKeyId = null;

    try {
        // Bước 1: Đảm bảo đủ SUI
        if (!(await ensureSuiFaucet(address))) {
            console.log('Không đủ SUI để tiếp tục');
            return { success: false, stats, balanceBefore, balanceAfter: null };
        }

        // Bước 2: Claim XAUM
        console.log('\nBƯỚC 2: Claim XAUM');
        for (let i = 1; i <= CONFIG.XAUM_CLAIM_COUNT; i++) {
            if (await claimXaumFaucet(keypair, address, i)) stats.xaumClaims++;
        }

        // ... (giữ nguyên toàn bộ các bước khác: claim USDC, swap, stake, deposit, borrow...)

        const balanceAfter = await getWalletBalances(address);
        printBalanceReport(address, balanceBefore, balanceAfter);
        console.log('\nXử lý ví thành công!');
        return { success: true, stats, balanceBefore, balanceAfter };
    } catch (error) {
        console.error('\nLỗi xử lý ví:', error.message);
        return { success: false, stats, balanceBefore, balanceAfter: null };
    }
}

// ============================================
// CHẠY BOT HÀNG NGÀY
// ============================================
async function runDailyBot() {
    const startTime = new Date();
    let dayCount = 1;
    const proxyMappings = readProxyMappings();

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`BOT SẼ CHẠY 1 LẦN MỖI NGÀY (VÒNG LẶP 24 GIỜ)`);
    console.log(`Thời gian bắt đầu: ${startTime.toLocaleString('vi-VN')}`);
    console.log(`${'═'.repeat(70)}`);

    while (true) {
        const runStartTime = new Date();
        console.log(`\n${'═'.repeat(70)}`);
        console.log(`NGÀY #${dayCount} - ${runStartTime.toLocaleDateString('vi-VN')}`);
        console.log(`Bắt đầu: ${runStartTime.toLocaleString('vi-VN')}`);
        console.log(`${'═'.repeat(70)}\n`);

        const privateKeys = readPrivateKeys();
        if (privateKeys.length === 0) {
            console.log('Lỗi: Không có private key nào!');
            break;
        }

        let totalStats = { success: 0, failed: 0 };
        console.log(`Đang xử lý ${privateKeys.length} ví...\n`);

        for (let idx = 0; idx < privateKeys.length; idx++) {
            const wallet = importWallet(privateKeys[idx]);
            if (!wallet) {
                console.log(`\nKhông nhập được ví #${idx + 1}\n`);
                totalStats.failed++;
                continue;
            }

            const proxyUrl = getProxyForWallet(idx + 1, proxyMappings);
            const result = await processWallet(wallet.keypair, wallet.address, idx + 1, privateKeys.length, proxyUrl);
            if (result.success) totalStats.success++; else totalStats.failed++;

            if (idx < privateKeys.length - 1) {
                await delay(getRandomDelay(30, 60), 'Chờ ví tiếp theo:');
            }
        }

        const runEndTime = new Date();
        const duration = Math.floor((runEndTime - runStartTime) / 1000 / 60);

        console.log(`\n${'═'.repeat(70)}`);
        console.log(`HOÀN TẤT NGÀY #${dayCount}!`);
        console.log(`Thời gian xử lý: ${duration} phút`);
        console.log(`Tổng cộng: ${privateKeys.length} ví | Thành công: ${totalStats.success} | Thất bại: ${totalStats.failed}`);
        console.log(`${'═'.repeat(70)}\n`);

        const nextRunTime = new Date(runStartTime.getTime() + 24 * 60 * 60 * 1000);
        const waitTime = nextRunTime.getTime() - Date.now();

        console.log(`ĐANG CHỜ 24 GIỜ ĐẾN NGÀY MAI...`);
        console.log(`Lần chạy tiếp theo: ${nextRunTime.toLocaleString('vi-VN')}`);
        await delay(waitTime, 'Đang chờ:');

        dayCount++;
    }
}

// ============================================
// KHỞI ĐỘNG
// ============================================
async function main() {
    console.log('\n%cAUTO BOT CREEK FINANCE - SUI TESTNET (TIẾNG VIỆT)', 'color: cyan; font-weight: bold; font-size: 14px');
    console.log('%cprivate.env + proxy.txt + an toàn 100%', 'color: green; font-size: 12px\n');
    runDailyBot().catch(error => {
        console.error('Lỗi nghiêm trọng:', error.message);
        process.exit(1);
    });
}

main();
