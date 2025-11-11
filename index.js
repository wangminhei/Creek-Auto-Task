// ============================================
// AUTO BOT CREEK FINANCE - SUI TESTNET
// by WangMinHei - ĐẸP TRAI :)
// ============================================

import { config as loadEnv } from 'dotenv';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Transaction } from '@mysten/sui/transactions';

loadEnv({ path: 'private.env' });
if (!process.env.PK1) {
  console.error('LỖI: File private.env không tồn tại hoặc trống!');
  console.error('Hướng dẫn: Tạo file private.env với PK1, PK2...');
  process.exit(1);
}

// ============================================
// CẤU HÌNH
// ============================================
const CONFIG = {
  OFFICIAL_RPC_URL: getFullnodeUrl('testnet'),
  PROXY_FILE: 'proxy.txt',
  SUI_FAUCET_URL: 'https://faucet.testnet.sui.io/v2/gas',
  MIN_SUI_BALANCE: 0.1,
  GAS_BUDGET: 200_000_000,
  XAUM_CLAIM_COUNT: 3,
  USDC_CLAIM_COUNT: 3,
  SWAP_USDC_TO_GUSD_COUNT: 3,
  SWAP_GUSD_TO_USDC_COUNT: 1,
  STAKE_XAUM_COUNT: 3,
  REDEEM_XAUM_COUNT: 3,
  DEPOSIT_GR_COUNT: 1,
  COIN_FETCH_RETRIES: 5,
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
  USDC_TYPE: '0xa03cb0b29e92c6fa9bfb7b9c57ffdba5e23810f20885b4390f724553d32efb8b::usdc::USDC',
  GUSD_TYPE: '0x5434351f2dcae30c0c4b97420475c5edc966b02fd7d0bbe19ea2220d2f623586::coin_gusd::COIN_GUSD',
  XAUM_TYPE: '0xa03cb0b29e92c6fa9bfb7b9c57ffdba5e23810f20885b4390f724553d32efb8b::coin_xaum::COIN_XAUM',
  GY_TYPE: '0x0ac2d5ebd2834c0db725eedcc562c60fa8e281b1772493a4d199fd1e70065671::coin_gy::COIN_GY',
  GR_TYPE: '0x5504354cf3dcbaf64201989bc734e97c1d89bba5c7f01ff2704c43192cc2717c::coin_gr::COIN_GR',
  SUI_TYPE: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
};

const suiClient = new SuiClient({ url: CONFIG.OFFICIAL_RPC_URL });

// ============================================
// UTILITY – JS THUẦN
// ============================================
function getRandomDelay(minSec, maxSec) {
  return Math.floor(Math.random() * (maxSec - minSec + 1) + minSec) * 1000;
}
async function delay(ms, msg = 'Đang chờ') {
  console.log(`[Clock] ${msg} ${Math.floor(ms / 1000)} giây...`);
  return new Promise(r => setTimeout(r, ms));
}
function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
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
    const d = decodeSuiPrivateKey(k);
    const kp = Ed25519Keypair.fromSecretKey(d.secretKey);
    return { keypair: kp, address: kp.getPublicKey().toSuiAddress() };
  } catch {
    return null;
  }
}
function shortErr(e) {
  try { return (e?.message || e?.toString?.() || String(e)).slice(0, 400); }
  catch { return 'unknown error'; }
}
async function withRetry(fn, label = 'RPC', times = 4) {
  let wait = 2000;
  for (let i = 0; i < times; i++) {
    try { return await fn(); }
    catch (e) {
      await delay(wait, `${label} thất bại: ${shortErr(e)} — retry`);
      wait = Math.min(wait * 2, 30000);
    }
  }
  throw new Error(`${label} retry exhausted`);
}
async function getCoinsAllPages(owner, coinType) {
  const out = [];
  let cursor = null;
  do {
    const page = await withRetry(() => suiClient.getCoins({ owner, coinType, cursor, limit: 50 }));
    out.push(...page.data);
    if (!page.hasNextPage) break;
    cursor = page.nextCursor;
  } while (true);
  return out;
}
const coinMetaCache = new Map();
async function decimalsOf(coinType) {
  if (coinMetaCache.has(coinType)) return coinMetaCache.get(coinType);
  const meta = await withRetry(() => suiClient.getCoinMetadata({ coinType }));
  const d = meta?.decimals ?? 9;
  coinMetaCache.set(coinType, d);
  return d;
}
async function toUnits(amountFloat, coinType) {
  const d = await decimalsOf(coinType);
  const scale = Math.min(d, 9);
  const a = Math.floor(amountFloat * 10 ** scale);
  const rest = d - scale;
  return BigInt(a) * BigInt(10 ** rest);
}
async function executeTx(tx, signer, label = 'TX') {
  tx.setGasBudget(CONFIG.GAS_BUDGET);
  const res = await withRetry(() =>
    suiClient.signAndExecuteTransaction({
      signer,
      transaction: tx,
      options: { showEffects: true, showEvents: true, showObjectChanges: true, showBalanceChanges: true },
    }), label
  );
  await withRetry(() => suiClient.waitForTransaction({ digest: res.digest }), 'waitForTransaction');
  return res;
}

// ============================================
// BALANCE
// ============================================
async function getTokenBalance(addr, coinType) {
  const b = await withRetry(() => suiClient.getBalance({ owner: addr, coinType }));
  const d = await decimalsOf(coinType);
  const raw = BigInt(b.totalBalance || '0');
  return Number(raw) / 10 ** d;
}
async function getSuiBalance(addr) { return getTokenBalance(addr, CONFIG.SUI_TYPE); }
async function getWalletBalances(addr) {
  return {
    GR: await getTokenBalance(addr, CONFIG.GR_TYPE),
    SUI: await getTokenBalance(addr, CONFIG.SUI_TYPE),
    USDC: await getTokenBalance(addr, CONFIG.USDC_TYPE),
    GUSD: await getTokenBalance(addr, CONFIG.GUSD_TYPE),
    XAUM: await getTokenBalance(addr, CONFIG.XAUM_TYPE),
  };
}
function printBalanceReport(addr, before, after) {
  console.log(`\nBÁO CÁO SỐ DƯ SAU XỬ LÝ`);
  console.log(`Địa chỉ: ${addr.substring(0, 8)}...${addr.slice(-6)}`);
  console.log(`GR:   ${before.GR.toFixed(2)} → ${after.GR.toFixed(2)}`);
  console.log(`SUI:  ${before.SUI.toFixed(6)} → ${after.SUI.toFixed(6)}`);
  console.log(`USDC: ${before.USDC.toFixed(2)} → ${after.USDC.toFixed(2)}`);
  console.log(`GUSD: ${before.GUSD.toFixed(2)} → ${after.GUSD.toFixed(2)}`);
  console.log(`XAUM: ${before.XAUM.toFixed(2)} → ${after.XAUM.toFixed(2)}`);
}
async function ensureSuiFaucet(addr) {
  if (await getSuiBalance(addr) >= CONFIG.MIN_SUI_BALANCE) return true;
  const url = CONFIG.SUI_FAUCET_URL;
  let wait = 5000;
  for (let i = 0; i < 6; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ FixedAmountRequest: { recipient: addr } }),
      });
      if (res.ok) return true;
      await delay(wait, `Faucet lỗi HTTP ${res.status}`);
      wait = Math.min(wait * 2, 60000);
    } catch {
      await delay(wait, `Faucet network error`);
      wait = Math.min(wait * 2, 60000);
    }
  }
  return false;
}

// ============================================
// CLAIM XAUM & USDC (DÙNG ::mint)
// ============================================
async function claimXaumFaucet(kp, addr, i) {
  console.log(`BƯỚC 2: Claim XAUM #${i}...`);
  const amount = await toUnits(1, CONFIG.XAUM_TYPE);
  const tx = new Transaction();
  tx.moveCall({
    target: `${CONFIG.FAUCET_PACKAGE}::coin_xaum::mint`,
    arguments: [tx.object(CONFIG.XAUM_SHARED_OBJECT), tx.pure.u64(amount.toString()), tx.pure.address(addr)],
  });
  try {
    const r = await executeTx(tx, kp, 'claimXaumFaucet');
    const ok = r.effects?.status?.status === 'success';
    console.log(ok ? `Thành công!` : `Thất bại: ${r.effects?.status?.error || 'Unknown'}`);
    return ok;
  } catch (e) {
    console.log(`Lỗi: ${shortErr(e)}`);
    return false;
  }
}
async function claimUsdcFaucet(kp, addr, i) {
  console.log(`BƯỚC 3: Claim USDC #${i}...`);
  const amount = await toUnits(10, CONFIG.USDC_TYPE);
  const tx = new Transaction();
  tx.moveCall({
    target: `${CONFIG.FAUCET_PACKAGE}::usdc::mint`,
    arguments: [tx.object(CONFIG.USDC_SHARED_OBJECT), tx.pure.u64(amount.toString()), tx.pure.address(addr)],
  });
  try {
    const r = await executeTx(tx, kp, 'claimUsdcFaucet');
    const ok = r.effects?.status?.status === 'success';
    console.log(ok ? `Thành công!` : `Thất bại`);
    return ok;
  } catch (e) {
    console.log(`Lỗi: ${shortErr(e)}`);
    return false;
  }
}

// ============================================
// SWAP, STAKE, REDEEM, DEPOSIT...
// ============================================
async function swapUsdcToGusd(kp, addr, i) {
  console.log(`BƯỚC 4: Swap USDC → GUSD #${i}...`);
  const amountUnits = await toUnits(getRandomFloat(1, 5), CONFIG.USDC_TYPE);
  const coins = await getCoinsAllPages(addr, CONFIG.USDC_TYPE);
  if (!coins.length) { console.log('Không có USDC'); return false; }
  const tx = new Transaction();
  let coin = tx.object(coins[0].coinObjectId);
  if (coins.length > 1) tx.mergeCoins(coin, coins.slice(1).map(c => tx.object(c.coinObjectId)));
  const [split] = tx.splitCoins(coin, [tx.pure.u64(amountUnits.toString())]);
  tx.moveCall({
    target: `${CONFIG.GUSD_PACKAGE}::gusd_usdc_vault::mint_gusd`,
    arguments: [tx.object(CONFIG.GUSD_VAULT), tx.object(CONFIG.GUSD_MARKET), split, tx.object(CONFIG.CLOCK_OBJECT)],
  });
  try {
    const r = await executeTx(tx, kp, 'swapUsdcToGusd');
    return r.effects?.status?.status === 'success';
  } catch { return false; }
}

async function swapGusdToUsdc(kp, addr, i) {
  console.log(`BƯỚC 5: Swap GUSD → USDC #${i}...`);
  const amountUnits = await toUnits(getRandomFloat(1, 3), CONFIG.GUSD_TYPE);
  const coins = await getCoinsAllPages(addr, CONFIG.GUSD_TYPE);
  if (!coins.length) { console.log('Không có GUSD'); return false; }
  const tx = new Transaction();
  let coin = tx.object(coins[0].coinObjectId);
  if (coins.length > 1) tx.mergeCoins(coin, coins.slice(1).map(c => tx.object(c.coinObjectId)));
  const [split] = tx.splitCoins(coin, [tx.pure.u64(amountUnits.toString())]);
  tx.moveCall({
    target: `${CONFIG.GUSD_PACKAGE}::gusd_usdc_vault::redeem_gusd`,
    arguments: [tx.object(CONFIG.GUSD_VAULT), tx.object(CONFIG.GUSD_MARKET), split],
  });
  try {
    const r = await executeTx(tx, kp, 'swapGusdToUsdc');
    return r.effects?.status?.status === 'success';
  } catch { return false; }
}

async function stakeXaum(kp, addr, i) {
  console.log(`BƯỚC 6: Stake XAUM #${i}...`);
  const amount = await toUnits(getRandomFloat(1, 3), CONFIG.XAUM_TYPE);
  const coins = await getCoinsAllPages(addr, CONFIG.XAUM_TYPE);
  if (!coins.length) return false;
  const tx = new Transaction();
  let coin = tx.object(coins[0].coinObjectId);
  if (coins.length > 1) tx.mergeCoins(coin, coins.slice(1).map(c => tx.object(c.coinObjectId)));
  const [split] = tx.splitCoins(coin, [tx.pure.u64(amount.toString())]);
  tx.moveCall({
    target: `${CONFIG.GUSD_PACKAGE}::staking_manager::stake_xaum`,
    arguments: [tx.object(CONFIG.STAKING_MANAGER), split],
  });
  try {
    const r = await executeTx(tx, kp, 'stakeXaum');
    return r.effects?.status?.status === 'success';
  } catch { return false; }
}

async function redeemXaum(kp, addr, i) {
  console.log(`BƯỚC 7: Redeem XAUM #${i}...`);
  const grCoins = await getCoinsAllPages(addr, CONFIG.GR_TYPE);
  const gyCoins = await getCoinsAllPages(addr, CONFIG.GY_TYPE);
  if (!grCoins.length || !gyCoins.length) return false;
  const amount = getRandomFloat(0.1, 1);
  const grAmount = await toUnits(amount, CONFIG.GR_TYPE);
  const gyAmount = await toUnits(amount, CONFIG.GY_TYPE);
  const tx = new Transaction();
  let grCoin = tx.object(grCoins[0].coinObjectId);
  let gyCoin = tx.object(gyCoins[0].coinObjectId);
  if (grCoins.length > 1) tx.mergeCoins(grCoin, grCoins.slice(1).map(c => tx.object(c.coinObjectId)));
  if (gyCoins.length > 1) tx.mergeCoins(gyCoin, gyCoins.slice(1).map(c => tx.object(c.coinObjectId)));
  const [grSplit] = tx.splitCoins(grCoin, [tx.pure.u64(grAmount.toString())]);
  const [gySplit] = tx.splitCoins(gyCoin, [tx.pure.u64(gyAmount.toString())]);
  tx.moveCall({
    target: `${CONFIG.GUSD_PACKAGE}::staking_manager::unstake`,
    arguments: [tx.object(CONFIG.STAKING_MANAGER), grSplit, gySplit],
  });
  try {
    const r = await executeTx(tx, kp, 'redeemXaum');
    return r.effects?.status?.status === 'success';
  } catch { return false; }
}

async function depositGrCollateral(kp, addr, i, obligationId = null, obligationKeyId = null) {
  console.log(`BƯỚC 8: Deposit GR #${i}...`);
  const coins = await getCoinsAllPages(addr, CONFIG.GR_TYPE);
  if (!coins.length) return { success: false };
  const amount = await toUnits(getRandomFloat(1, 10), CONFIG.GR_TYPE);
  const tx = new Transaction();
  let coin = tx.object(coins[0].coinObjectId);
  if (coins.length > 1) tx.mergeCoins(coin, coins.slice(1).map(c => tx.object(c.coinObjectId)));
  const [split] = tx.splitCoins(coin, [tx.pure.u64(amount.toString())]);
  if (!obligationId) {
    const [newObligation, newKey] = tx.moveCall({
      target: `${CONFIG.LENDING_PACKAGE}::open_obligation::open_obligation`,
      arguments: [tx.object(CONFIG.PROTOCOL_OBJECT)],
    });
    tx.moveCall({
      target: `${CONFIG.LENDING_PACKAGE}::deposit_collateral::deposit_collateral`,
      typeArguments: [CONFIG.GR_TYPE],
      arguments: [tx.object(CONFIG.PROTOCOL_OBJECT), newObligation, tx.object(CONFIG.LENDING_MARKET), split],
    });
    tx.transferObjects([newKey], tx.pure.address(addr));
  } else {
    tx.moveCall({
      target: `${CONFIG.LENDING_PACKAGE}::deposit_collateral::deposit_collateral`,
      typeArguments: [CONFIG.GR_TYPE],
      arguments: [tx.object(CONFIG.PROTOCOL_OBJECT), tx.object(obligationId), tx.object(CONFIG.LENDING_MARKET), split],
    });
  }
  try {
    const r = await executeTx(tx, kp, 'depositGrCollateral');
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

// ============================================
// XỬ LÝ VÍ
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

  for (let i = 1; i <= CONFIG.XAUM_CLAIM_COUNT; i++) {
    if (await claimXaumFaucet(kp, addr, i)) stats.xaumClaims++;
    await delay(getRandomDelay(10, 15));
  }
  for (let i = 1; i <= CONFIG.USDC_CLAIM_COUNT; i++) {
    if (await claimUsdcFaucet(kp, addr, i)) stats.usdcClaims++;
    await delay(getRandomDelay(10, 15));
  }
  for (let i = 1; i <= CONFIG.SWAP_USDC_TO_GUSD_COUNT; i++) {
    if (await swapUsdcToGusd(kp, addr, i)) stats.swapUsdcToGusd++;
    await delay(getRandomDelay(10, 15));
  }
  for (let i = 1; i <= CONFIG.SWAP_GUSD_TO_USDC_COUNT; i++) {
    if (await swapGusdToUsdc(kp, addr, i)) stats.swapGusdToUsdc++;
    await delay(getRandomDelay(10, 15));
  }
  for (let i = 1; i <= CONFIG.STAKE_XAUM_COUNT; i++) {
    if (await stakeXaum(kp, addr, i)) stats.stakes++;
    await delay(getRandomDelay(10, 15));
  }
  for (let i = 1; i <= CONFIG.REDEEM_XAUM_COUNT; i++) {
    if (await redeemXaum(kp, addr, i)) stats.redeems++;
    await delay(getRandomDelay(10, 15));
  }
  for (let i = 1; i <= CONFIG.DEPOSIT_GR_COUNT; i++) {
    const res = await depositGrCollateral(kp, addr, i, obligationId, obligationKeyId);
    if (res.success) {
      stats.depositGr++;
      obligationId = res.obligationId || obligationId;
      obligationKeyId = res.obligationKeyId || obligationKeyId;
      if (res.obligationId) console.log(`Obligation tạo: ${res.obligationId}`);
    }
    await delay(getRandomDelay(10, 15));
  }

  const after = await getWalletBalances(addr);
  printBalanceReport(addr, before, after);
  console.log(`\nHOÀN TẤT VÍ ${idx}: XAUM ${stats.xaumClaims}, USDC ${stats.usdcClaims}, Swap ${stats.swapUsdcToGusd}, Deposit ${stats.depositGr}`);
  return { success: true };
}

// ============================================
// CHẠY BOT
// ============================================
async function runOnce() {
  const keys = readPrivateKeys();
  if (keys.length === 0) {
    console.log('Không tìm thấy PK trong private.env');
    return;
  }
  for (let i = 0; i < keys.length; i++) {
    const w = importWallet(keys[i]);
    if (!w) { console.log(`PK${i + 1} không hợp lệ`); continue; }
    await processWallet(w.keypair, w.address, i + 1, keys.length);
    if (i < keys.length - 1) await delay(getRandomDelay(30, 60));
  }
}

async function main() {
  console.log('\nBOT CREEK FINANCE by WangMinHei - ĐẸP TRAI');
  await runOnce();
}
main().catch(e => console.error('Lỗi:', shortErr(e)));
