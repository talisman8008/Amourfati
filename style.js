// =============================
//intilizing vars and consts
// =============================
    const storageKey='state_v1';
    const initBalance=10_000;//initial balance
    const priceTicker=3500;//time in ms
    const tickVolatile=0.018;//+-1.8%

// =============================
//Mock data
// =============================

const defaultMarket = [
    {
     id: 1, ticker: 'AAPL',
        name: 'Apple Inc.',
        currentPrice: 189.30,
        change: 0
    },
    { id: 2,
        ticker: 'MSFT',
        name: 'Microsoft Corp.',
        currentPrice: 415.50,
        change: 0
    },
    { id: 3,
        ticker: 'GOOGL',
        name: 'Alphabet Inc.',
        currentPrice: 165.80,
        change: 0
    },
    { id: 4,
        ticker: 'AMZN',
        name: 'Amazon.com Inc.',
        currentPrice: 202.50,
        change: 0
    },
    { id: 5,
        ticker: 'NVDA',
        name: 'NVIDIA Corp.',
        currentPrice: 875.20,
        change: 0
    },
    { id: 6,
        ticker: 'TSLA',
        name: 'Tesla Inc.',
        currentPrice: 210.10,
        change: 0
    },
    { id: 7,
        ticker: 'META',
        name: 'Meta Platforms Inc.',
        currentPrice: 502.80,
        change: 0
    },
    { id: 8,
        ticker: 'BRK',
        name: 'Berkshire Hathaway',
        currentPrice: 398.60,
        change: 0
    },
    { id: 9,
        ticker: 'JPM',
        name: 'JPMorgan Chase & Co.',
        currentPrice: 198.40,
        change: 0
    },
    { id: 10,
        ticker: 'V',
        name: 'Visa Inc.',
        currentPrice: 274.90,
        change: 0
    },
    { id: 11,
        ticker: 'JNJ',
        name: 'Johnson & Johnson',
        currentPrice: 147.60,
        change: 0
    },
    { id: 12,
        ticker: 'WMT',
        name: 'Walmart Inc.',
        currentPrice: 68.20,
        change: 0
    },
    { id: 13,
        ticker: 'PG',
        name: 'Procter & Gamble Co.',
        currentPrice: 163.50,
        change: 0
    },
    { id: 14,
        ticker: 'UNH',
        name: 'UnitedHealth Group',
        currentPrice: 529.40,
        change: 0
    },
    { id: 15,
        ticker: 'HD',
        name: 'Home Depot Inc.',
        currentPrice: 359.80,
        change: 0
    },
    { id: 16,
        ticker: 'DIS',
        name: 'Walt Disney Co.',
        currentPrice: 112.70,
        change: 0
    },
];

// =============================
//inti state
// =============================

let state={
    balance:initBalance,
    mrkt:[],
    portfolio:[],
    history:[]
};
let activeSymbol='AAPL' //default active stock

//initilize state
function initFreshState(){
    state.balance = initBalance;
    state.mrkt = defaultMarket.map(s=>({...s,change:0}))
    state.portfolio=[];
    state.history=[];
    saveState();
}

// =====================================
//local memomry storage for persistance
// =====================================

//saving the state to local storage
function loadState() {
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return initFreshState();
        const saved = JSON.parse(raw);
        // Merge saved market prices back onto the default market list, keeps new stocks in DEFAULT_MARKET appear.
        const priceMap = {};
        (saved.market || []).forEach(s => {
            priceMap[s.ticker] = { price: s.currentPrice, change: s.change || 0 }; });

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

function saveState(){
    localStorage.setItem(storageKey, JSON.stringify(state));
}

// ======================================
// // ui starts
// ======================================
const btnTheme = document.getElementById('btn-theme');
const btnReset = document.getElementById('btn-reset');
const volatilitySlider = document.getElementById('volatility-slider');
const qtyInput = document.querySelector('.qty-input');
const buyBtn = document.querySelector('.btn-buy');
const sellBtn = document.querySelector('.btn-sell');
const toast = document.getElementById('trade-toast');

// ==================
//functions
// ==================

// market logic
function tickMarketPrices() {
    const volMode = volatilitySlider ? parseInt(volatilitySlider.value) : 1;
    // Base volatility from your constants, scaled by slider
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






//main initilize
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