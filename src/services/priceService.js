// priceService.js
// Fetches live market prices from Yahoo Finance.
// There is no AI in this file. Nova will ASK for a price (a tool request),
// and our code answers that request by calling this service.

const YahooFinance = require('yahoo-finance2').default;

// One shared Yahoo client for the whole app.
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// Symbol cheatsheet:
//   Indian stocks (NSE):  RELIANCE.NS, TCS.NS, HDFCBANK.NS
//   Crude oil futures:    CL=F (WTI), BZ=F (Brent)
//   Currency:             INR=X (US Dollar -> Indian Rupee)
//   Indices:              ^NSEI (Nifty 50), ^BSESN (Sensex)
async function getPrice(symbol) {
  const quote = await yahooFinance.quote(symbol);

  // Return only the fields the AI actually needs.
  // Smaller tool results = fewer input tokens on the next Nova call.
  return {
    symbol: quote.symbol,
    name: quote.shortName || quote.longName || quote.symbol,
    price: quote.regularMarketPrice,
    currency: quote.currency,
    change: quote.regularMarketChange,
    changePercent: quote.regularMarketChangePercent,
    marketState: quote.marketState, // REGULAR = open, CLOSED = closed
  };
}

module.exports = {
  getPrice,
};
