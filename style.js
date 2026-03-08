
const storageKey = 'state_v1';
const initBalance = 100000;
const priceTicker = 3500;
const tickVolatile = 0.018;

const defaultMarket = [
    { id: 1, ticker: 'RELIANCE', name: 'Reliance Industries', currentPrice: 2950.45, change: 0 },
    { id: 2, ticker: 'TCS', name: 'Tata Consultancy', currentPrice: 4120.80, change: 0 },
    { id: 3, ticker: 'HDFC', name: 'HDFC Bank Ltd', currentPrice: 1645.20, change: 0 },
    { id: 4, ticker: 'INFY', name: 'Infosys Ltd', currentPrice: 1480.65, change: 0 },
    { id: 5, ticker: 'ITC', name: 'ITC Ltd', currentPrice: 415.10, change: 0 },
    { id: 6, ticker: 'WIPRO', name: 'Wipro Ltd', currentPrice: 462.35, change: 0 },
    { id: 7, ticker: 'SBIN', name: 'State Bank of India', currentPrice: 752.90, change: 0 }
];

let state = {
    balance: initBalance,
    market: [],
    portfolio: [],
    history: []
};

let activeSymbol = 'RELIANCE';

function initFreshState() {
    state.balance = initBalance;
    state.market = defaultMarket.map(s => ({ ...s, change: 0 }));
    state.portfolio = [];
    state.history = [];
    saveState();
}

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

const btnTheme = document.getElementById('btn-theme');
const btnReset = document.getElementById('btn-reset');
const volatilitySlider = document.getElementById('volatility-slider');
const qtyInput = document.querySelector('.qty-input');
const buyBtn = document.querySelector('.btn-buy');
const sellBtn = document.querySelector('.btn-sell');
const toast = document.getElementById('trade-toast');

function initApp() {
    loadState();
    if(typeof lucide !== 'undefined') lucide.createIcons();
    renderWatchlist();
    renderTradeDesk();
    renderSummary();
    renderHoldings();
    renderHistory();
    initChart();

    setInterval(tickMarketPrices, priceTicker);
}

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

function renderTradeDesk() {
    const stock = state.market.find(s => s.ticker === activeSymbol);
    if (!stock) return;

    document.querySelector('.stock-symbol h2').innerText = activeSymbol;
    document.querySelector('.stock-company').innerText = stock.name;

    const [whole, decimal] = stock.currentPrice.toFixed(2).split('.');
    document.querySelector('.big-price').innerHTML = `₹${parseInt(whole).toLocaleString('en-IN')}<span class="paise">.${decimal}</span>`;

    // Day Stats
    const statOpen = document.getElementById('stat-open');
    const statPrev = document.getElementById('stat-prev');
    const statHigh = document.getElementById('stat-high');
    const statLow = document.getElementById('stat-low');
    if (statOpen) statOpen.innerText = `₹${(stock.currentPrice * 0.99).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (statPrev) statPrev.innerText = `₹${(stock.currentPrice * 0.985).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (statHigh) statHigh.innerText = `₹${(stock.currentPrice * 1.012).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (statLow) statLow.innerText = `₹${(stock.currentPrice * 0.978).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    const qty = parseInt(qtyInput.value) || 1;
    const estCost = (qty * stock.currentPrice).toLocaleString('en-IN', {minimumFractionDigits: 2});
    const estCostElement = document.querySelector('.est-cost strong');
    if(estCostElement) estCostElement.innerText = `₹${estCost}`;
}

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
        const plBadge = document.querySelector('.pl-badge');
        if(plBadge) {
            plBadge.innerText = `${totalPL >= 0 ? '+' : ''}${plPct.toFixed(2)}%`;
            plValue.style.color = totalPL >= 0 ? '#34d399' : '#fb7185';
            plBadge.style.color = totalPL >= 0 ? '#34d399' : '#fb7185';
        }
    }

    if (typeof updateLiveChart === 'function') {
        updateLiveChart(netWorth);
    }
}

function renderHoldings() {
    const list = document.querySelector('.holdings-list');
    if (!list) return;

    if (state.portfolio.length === 0) {
        list.innerHTML = `<div style="padding: 20px; text-align: center; color: #64748b; font-size: 12px;">No active holdings. Buy some stocks!</div>`;
        return;
    }

    list.innerHTML = state.portfolio.map(holding => {
        const stock = state.market.find(s => s.ticker === holding.ticker);
        if (!stock) return '';

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

function renderHistory() {
    const historyContainer = document.getElementById('transaction-history');
    if (!historyContainer) return;

    if (state.history.length === 0) {
        historyContainer.innerHTML = `
            <div class="txn-card buy">
                <div class="txn-glow"></div>
                <div class="txn-content">
                    <div class="txn-meta">
                        <span class="txn-icon"><i data-lucide="info" style="width:16px;height:16px;"></i></span>
                        <span class="txn-type" style="color:#64748b;">System Info</span>
                    </div>
                    <h3 class="txn-title">No Trades Yet</h3>
                    <p class="txn-desc">Make your first trade in the Trade Desk to see your transaction history update here in real-time.</p>
                </div>
            </div>
        `;
        if(typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    historyContainer.innerHTML = state.history.map(txn => {
        const isBuy = txn.type === 'buy';
        const dateObj = new Date(txn.date);
        const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

        return `
            <div class="txn-card ${isBuy ? 'buy' : 'sell'}">
                <div class="txn-glow"></div>
                <div class="txn-content">
                    <div class="txn-meta">
                        <span class="txn-icon"><i data-lucide="${isBuy ? 'arrow-down-left' : 'arrow-up-right'}"></i></span>
                        <span class="txn-type">${isBuy ? 'Buy Order' : 'Sell Order'}</span>
                        <span class="txn-date">${dateStr} · ${timeStr}</span>
                    </div>
                    <h3 class="txn-title">
                        ${isBuy ? 'Bought' : 'Sold'} <span style="color:${isBuy ? '#34d399' : '#fb7185'}">${txn.qty}</span> shares of <span style="color:${isBuy ? '#34d399' : '#fb7185'}">${txn.stock}</span>
                    </h3>
                    <div class="txn-stats">
                        <div class="txn-stat">
                            <p class="txn-stat-label">Price</p>
                            <p class="txn-stat-value font-mono">₹${txn.price.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                        </div>
                        <div class="txn-stat">
                            <p class="txn-stat-label">Total Value</p>
                            <p class="txn-stat-value font-mono">₹${txn.total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                        </div>
                        <div class="txn-stat">
                            <p class="txn-stat-label">Status</p>
                            <p class="txn-stat-value ${isBuy ? 'up' : 'down'} font-mono">Executed ✓</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if(typeof lucide !== 'undefined') lucide.createIcons();
}

if (btnTheme) {
    btnTheme.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        if (portfolioChart) {
            const isDark = document.documentElement.classList.contains('dark');
            const gridColor = isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(71, 85, 105, 0.1)';
            const textColor = isDark ? '#94a3b8' : '#64748b';
            portfolioChart.options.scales.x.ticks.color = textColor;
            portfolioChart.options.scales.y.ticks.color = textColor;
            portfolioChart.options.scales.y.grid.color = gridColor;
            portfolioChart.options.plugins.tooltip.backgroundColor = isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)';
            portfolioChart.options.plugins.tooltip.titleColor = isDark ? '#fff' : '#0f172a';
            portfolioChart.options.plugins.tooltip.bodyColor = isDark ? '#cbd5e1' : '#475569';
            portfolioChart.options.plugins.tooltip.borderColor = isDark ? '#1e293b' : '#e2e8f0';
            portfolioChart.update();
        }
    });
}

if (btnReset) {
    btnReset.addEventListener('click', () => {
        if(confirm("Are you sure you want to reset your portfolio?")) {
            initFreshState();
            renderWatchlist();
            renderTradeDesk();
            renderSummary();
            renderHoldings();
            renderHistory();
            showToast("Portfolio has been reset.");
        }
    });
}

document.querySelectorAll('.qty-btn').forEach((btn, idx) => {
    btn.addEventListener('click', () => {
        let val = parseInt(qtyInput.value) || 1;
        qtyInput.value = idx === 0 ? Math.max(1, val - 1) : val + 1;
        renderTradeDesk();
    });
});

if (buyBtn) {
    buyBtn.addEventListener('click', () => {
        const qty = parseInt(qtyInput.value);
        const stock = state.market.find(s => s.ticker === activeSymbol);
        const cost = qty * stock.currentPrice;

        if (state.balance >= cost) {
            state.balance -= cost;
            const existing = state.portfolio.find(h => h.ticker === activeSymbol);
            if (existing) {
                const totalCost = (existing.qty * existing.avgPrice) + cost;
                existing.qty += qty;
                existing.avgPrice = totalCost / existing.qty;
            } else {
                state.portfolio.push({ ticker: activeSymbol, qty: qty, avgPrice: stock.currentPrice });
            }

            state.history.unshift({
                type: 'buy',
                stock: activeSymbol,
                qty: qty,
                price: stock.currentPrice,
                total: cost,
                date: new Date().toISOString()
            });

            saveState();
            showToast(`Bought ${qty} ${activeSymbol} at ₹${stock.currentPrice.toFixed(2)}`);
            renderSummary();
            renderHoldings();
            renderHistory();
        } else {
            alert("Insufficient Cash Balance!");
        }
    });
}

if (sellBtn) {
    sellBtn.addEventListener('click', () => {
        const qtyToSell = parseInt(qtyInput.value) || 1;
        const stock = state.market.find(s => s.ticker === activeSymbol);
        const holdingIndex = state.portfolio.findIndex(h => h.ticker === activeSymbol);

        if (holdingIndex !== -1 && state.portfolio[holdingIndex].qty >= qtyToSell) {
            const saleValue = qtyToSell * stock.currentPrice;
            state.balance += saleValue;
            state.portfolio[holdingIndex].qty -= qtyToSell;

            if (state.portfolio[holdingIndex].qty === 0) {
                state.portfolio.splice(holdingIndex, 1);
            }

            state.history.unshift({
                type: 'sell',
                stock: activeSymbol,
                qty: qtyToSell,
                price: stock.currentPrice,
                total: saleValue,
                date: new Date().toISOString()
            });

            saveState();
            showToast(`Sold ${qtyToSell} ${activeSymbol} at ₹${stock.currentPrice.toFixed(2)}`);
            renderSummary();
            renderHoldings();
            renderHistory();
        } else {
            alert("Not enough shares to sell!");
        }
    });
}

function showToast(msg) {
    document.getElementById('toast-subtitle').innerText = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 4000);
}
window.hideToast = () => toast.classList.remove('visible');

// =====================================
// Dynamic Chart Logic
// =====================================
let portfolioChart;

function initChart() {
    const ctx = document.getElementById('portfolioChart');
    if (!ctx) return;

    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(71, 85, 105, 0.1)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    const now = new Date();
    const timeLabel = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0');

    portfolioChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [timeLabel],
            datasets: [{
                label: 'Net Worth (₹)',
                data: [initBalance],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#0f172a',
                pointBorderColor: '#10b981',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index', intersect: false,
                    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                    titleColor: isDark ? '#fff' : '#0f172a',
                    bodyColor: isDark ? '#cbd5e1' : '#475569',
                    borderColor: isDark ? '#1e293b' : '#e2e8f0',
                    borderWidth: 1,
                    callbacks: { label: function(context) { return '₹' + context.parsed.y.toLocaleString('en-IN'); } }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: textColor, font: { family: "'JetBrains Mono', monospace", size: 10 } } },
                y: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: "'JetBrains Mono', monospace", size: 10 } } }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false },
            animation: { duration: 400 }
        }
    });
}

function updateLiveChart(currentNetWorth) {
    if (!portfolioChart) return;
    const activeBtn = document.querySelector('.chart-period-btn.active');

    if (activeBtn && activeBtn.innerText === '1M') {
        const dataArray = portfolioChart.data.datasets[0].data;
        const labelsArray = portfolioChart.data.labels;
        const now = new Date();
        const timeLabel = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0');

        dataArray.push(currentNetWorth);
        labelsArray.push(timeLabel);

        if (dataArray.length > 15) {
            dataArray.shift();
            labelsArray.shift();
        }

        const isProfit = currentNetWorth >= initBalance;
        const lineColor = isProfit ? '#10b981' : '#f43f5e';
        const bgColor = isProfit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)';

        portfolioChart.data.datasets[0].borderColor = lineColor;
        portfolioChart.data.datasets[0].pointBorderColor = lineColor;
        portfolioChart.data.datasets[0].backgroundColor = bgColor;

        portfolioChart.update('none');
    }
}

document.addEventListener('DOMContentLoaded', initApp);