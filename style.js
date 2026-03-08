// =============================
// Initializing vars and consts
// =============================
const storageKey = 'state_v1';
const initBalance = 100000; // Updated to 1 Lakh to match your HTML summary
const priceTicker = 3500; // time in ms
const tickVolatile = 0.018; // +-1.8%

// =============================
// Mock data
// =============================
const defaultMarket = [
    { id: 1, ticker: 'RELIANCE', name: 'Reliance Industries', currentPrice: 2950.45, change: 0 },
    { id: 2, ticker: 'TCS', name: 'Tata Consultancy', currentPrice: 4120.80, change: 0 },
    { id: 3, ticker: 'HDFC', name: 'HDFC Bank Ltd', currentPrice: 1645.20, change: 0 },
    { id: 4, ticker: 'INFY', name: 'Infosys Ltd', currentPrice: 1480.65, change: 0 },
    { id: 5, ticker: 'ITC', name: 'ITC Ltd', currentPrice: 415.10, change: 0 },
    { id: 6, ticker: 'WIPRO', name: 'Wipro Ltd', currentPrice: 462.35, change: 0 },
    { id: 7, ticker: 'SBIN', name: 'State Bank of India', currentPrice: 752.90, change: 0 }
];

// =============================
// Init state
// =============================
let state = {
    balance: initBalance,
    market: [],
    portfolio: [],
    history: []
};

let activeSymbol = 'RELIANCE'; // Default active stock

function initFreshState() {
    state.balance = initBalance;
    state.market = defaultMarket.map(s => ({ ...s, change: 0 }));
    state.portfolio = [];
    state.history = [];
    saveState();
}

// =====================================
// Local memory storage for persistence
// =====================================
function loadState() {
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
            initFreshState();
            return;
        }
        const saved = JSON.parse(raw);

        const priceMap = {};
        (saved.market || []).forEach(s => {
            priceMap[s.ticker] = { price: s.currentPrice, change: s.change || 0 };
        });

        state.balance = typeof saved.balance === 'number' ? saved.balance : initBalance;
        state.portfolio = Array.isArray(saved.portfolio) ? saved.portfolio : [];
        state.history = Array.isArray(saved.history) ? saved.history : [];

        state.market = defaultMarket.map(s => ({
            ...s,
            currentPrice: priceMap[s.ticker]?.price ?? s.currentPrice,
            change: priceMap[s.ticker]?.change ?? 0,
        }));
    } catch {
        initFreshState();
    }
}

function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
}

// =====================================
// UI Integration & Trading Logic
// =====================================

// DOM Elements
const btnTheme = document.getElementById('btn-theme');
const btnReset = document.getElementById('btn-reset');
const volatilitySlider = document.getElementById('volatility-slider');
const qtyInput = document.querySelector('.qty-input');
const buyBtn = document.querySelector('.btn-buy');
const sellBtn = document.querySelector('.btn-sell');
const toast = document.getElementById('trade-toast');

// Initialize App
function initApp() {
    loadState();
    lucide.createIcons();
    renderWatchlist();
    renderTradeDesk();
    renderSummary();
    renderHoldings();

    // Start market engine
    setInterval(tickMarketPrices, priceTicker);
}

// Market Engine
function tickMarketPrices() {
    const volMode = volatilitySlider ? parseInt(volatilitySlider.value) : 1;
    const currentVol = tickVolatile * (volMode * 0.5);

    state.market = state.market.map(stock => {
        const movePercent = (Math.random() - 0.5) * 2 * currentVol;
        const newPrice = stock.currentPrice * (1 + movePercent);
        return {
            ...stock,
            currentPrice: newPrice,
            change: stock.change + (movePercent * 100)
        };
    });

    saveState();
    renderWatchlist();
    renderTradeDesk();
    renderSummary();
    renderHoldings();
}

// Render Left Panel (Watchlist)
function renderWatchlist() {
    const watchlist = document.querySelector('.watchlist');
    if (!watchlist) return;

    watchlist.innerHTML = state.market.map(stock => {
        const isUp = stock.change >= 0;
        return `
            <div class="wl-item ${stock.ticker === activeSymbol ? 'active' : ''}" onclick="setActiveStock('${stock.ticker}')">
                <div>
                    <h4 class="wl-name">${stock.ticker}</h4>
                    <p class="wl-company">${stock.name}</p>
                </div>
                <div>
                    <p class="wl-price ${isUp ? 'up' : 'down'} font-mono">₹${stock.currentPrice.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    <p class="wl-change ${isUp ? 'up' : 'down'}">${isUp ? '▲' : '▼'} ${stock.change.toFixed(2)}%</p>
                </div>
            </div>
        `;
    }).join('');
}

window.setActiveStock = (symbol) => {
    activeSymbol = symbol;
    renderTradeDesk();
    renderWatchlist();
};

// Render Center Panel (Trade Desk)
function renderTradeDesk() {
    const stock = state.market.find(s => s.ticker === activeSymbol);
    if (!stock) return;

    document.querySelector('.stock-symbol h2').innerText = activeSymbol;
    document.querySelector('.stock-company').innerText = stock.name;
    document.querySelector('.nse-tag').innerText = 'NSE';
    document.querySelector('.stock-exchange').innerText = 'NSE';

    const [whole, decimal] = stock.currentPrice.toFixed(2).split('.');
    document.querySelector('.big-price').innerHTML = `₹${parseInt(whole).toLocaleString('en-IN')}<span class="paise">.${decimal}</span>`;

    const qty = parseInt(qtyInput.value) || 1;
    const estCost = (qty * stock.currentPrice).toLocaleString('en-IN', {minimumFractionDigits: 2});
    document.querySelector('.est-cost strong').innerText = `₹${estCost}`;
}

// Render Top Panel (Summary)
function renderSummary() {
    let portfolioValue = 0;
    state.portfolio.forEach(holding => {
        const currentStock = state.market.find(s => s.ticker === holding.ticker);
        if (currentStock) {
            portfolioValue += holding.qty * currentStock.currentPrice;
        }
    });

    const netWorth = state.balance + portfolioValue;
    const totalPL = netWorth - initBalance;
    const plPct = (totalPL / initBalance) * 100;

    const cards = document.querySelectorAll('.card-value');
    if(cards.length >= 3) {
        cards[0].innerHTML = `₹${state.balance.toLocaleString('en-IN', {maximumFractionDigits: 0})}<span class="decimal">.${(state.balance % 1).toFixed(2).substring(2)}</span>`;
        cards[1].innerHTML = `₹${portfolioValue.toLocaleString('en-IN', {maximumFractionDigits: 0})}<span class="decimal">.${(portfolioValue % 1).toFixed(2).substring(2)}</span>`;
        cards[2].innerHTML = `₹${netWorth.toLocaleString('en-IN', {maximumFractionDigits: 0})}<span class="decimal">.${(netWorth % 1).toFixed(2).substring(2)}</span>`;
    }

    const plValue = document.querySelector('.pl-value');
    if (plValue) {
        plValue.innerHTML = `${totalPL >= 0 ? '+' : ''}₹${Math.abs(totalPL).toLocaleString('en-IN', {maximumFractionDigits: 0})}<span class="decimal">.${(Math.abs(totalPL) % 1).toFixed(2).substring(2)}</span>`;
        document.querySelector('.pl-badge').innerText = `${totalPL >= 0 ? '+' : ''}${plPct.toFixed(2)}%`;

        // Update color based on P/L
        plValue.style.color = totalPL >= 0 ? '#34d399' : '#fb7185';
        document.querySelector('.pl-badge').style.color = totalPL >= 0 ? '#34d399' : '#fb7185';
    }
}

// Render Right Panel (My Holdings)
function renderHoldings() {
    const list = document.querySelector('.holdings-list');
    if (!list) return;

    if (state.portfolio.length === 0) {
        list.innerHTML = `<div style="padding: 20px; text-align: center; color: #64748b; font-size: 12px;">No active holdings. Buy some stocks to build your portfolio!</div>`;
        return;
    }

    list.innerHTML = state.portfolio.map(holding => {
        const stock = state.market.find(s => s.ticker === holding.ticker);
        const currentVal = holding.qty * stock.currentPrice;
        const invested = holding.qty * holding.avgPrice;
        const pl = currentVal - invested;
        const plPct = (pl / invested) * 100;
        const isUp = pl >= 0;

        return `
            <div class="holding-row">
                <div>
                    <h4 class="h-stock">${holding.ticker}</h4>
                    <p class="h-company">${stock.name.substring(0, 12)}...</p>
                </div>
                <div><p class="h-qty">${holding.qty}</p></div>
                <div><p class="h-avg">₹${holding.avgPrice.toFixed(2)}</p></div>
                <div><p class="h-val font-mono" style="font-weight:700;">₹${currentVal.toFixed(0)}</p></div>
                <div>
                    <p class="h-pl ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}₹${Math.abs(pl).toFixed(0)}</p>
                    <p class="h-pl-pct ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${plPct.toFixed(2)}%</p>
                </div>
            </div>
        `;
    }).join('');
}

// =====================================
// Event Listeners
// =====================================

// Theme Toggle
if (btnTheme) {
    btnTheme.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
    });
}

// Reset Portfolio
if (btnReset) {
    btnReset.addEventListener('click', () => {
        if(confirm("Are you sure you want to reset your portfolio? All progress will be lost.")) {
            initFreshState();
            renderWatchlist();
            renderTradeDesk();
            renderSummary();
            renderHoldings();
            showToast("Portfolio has been reset to initial state.");
        }
    });
}

// Quantity controls
document.querySelectorAll('.qty-btn').forEach((btn, idx) => {
    btn.addEventListener('click', () => {
        let val = parseInt(qtyInput.value) || 1;
        qtyInput.value = idx === 0 ? Math.max(1, val - 1) : val + 1;
        renderTradeDesk();
    });
});

// Buy Logic
if (buyBtn) {
    buyBtn.addEventListener('click', () => {
        const qty = parseInt(qtyInput.value);
        const stock = state.market.find(s => s.ticker === activeSymbol);
        const cost = qty * stock.currentPrice;

        if (state.balance >= cost) {
            state.balance -= cost;

            // Check if holding exists
            const existing = state.portfolio.find(h => h.ticker === activeSymbol);
            if (existing) {
                // Calculate new average price
                const totalCost = (existing.qty * existing.avgPrice) + cost;
                existing.qty += qty;
                existing.avgPrice = totalCost / existing.qty;
            } else {
                state.portfolio.push({ ticker: activeSymbol, qty: qty, avgPrice: stock.currentPrice });
            }

            saveState();
            showToast(`Bought ${qty} ${activeSymbol} at ₹${stock.currentPrice.toFixed(2)}`);
            renderSummary();
            renderHoldings();
        } else {
            alert("Insufficient Cash Balance!");
        }
    });
}

// Sell Logic
if (sellBtn) {
    sellBtn.addEventListener('click', () => {
        const qtyToSell = parseInt(qtyInput.value) || 1;
        const stock = state.market.find(s => s.ticker === activeSymbol);

        // 1. Portfolio mein check karo ki kya ye stock hai
        const holdingIndex = state.portfolio.findIndex(h => h.ticker === activeSymbol);

        if (holdingIndex !== -1) {
            const holding = state.portfolio[holdingIndex];

            // 2. Check karo ki kya utni quantity hai bechne ke liye
            if (holding.qty >= qtyToSell) {
                const saleValue = qtyToSell * stock.currentPrice;

                // Balance badhao
                state.balance += saleValue;

                // Quantity kam karo
                holding.qty -= qtyToSell;

                // 3. Agar shares zero ho gaye, toh portfolio array se hata do
                if (holding.qty === 0) {
                    state.portfolio.splice(holdingIndex, 1);
                }

                saveState();
                showToast(`Sold ${qtyToSell} ${activeSymbol} at ₹${stock.currentPrice.toFixed(2)}`);
                renderSummary();
                renderHoldings();
            } else {
                alert(`You only have ${holding.qty} shares of ${activeSymbol} to sell!`);
            }
        } else {
            alert(`You don't own any shares of ${activeSymbol} yet!`);
        }
    });
}

// Toast System
function showToast(msg) {
    document.getElementById('toast-subtitle').innerText = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 4000);
}
window.hideToast = () => toast.classList.remove('visible');

// Boot up
document.addEventListener('DOMContentLoaded', initApp);