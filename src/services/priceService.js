// priceService.js
// Fetches live market prices from Yahoo Finance.
// There is no AI in this file. The model will ASK for a price (a tool request),
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
  // Smaller tool results = fewer input tokens on the next model call.
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

// Finds the Yahoo Finance symbol for a company name.
// Needed when the model does not know the ticker — "Tata Motors" is TMCV.NS,
// which no model can reliably guess.
async function searchSymbol(query) {
  const results = await yahooFinance.search(query);

  // search() also returns news articles and other entities.
  // isYahooFinance marks the entries that are real, quotable tickers.
  const tickers = results.quotes.filter((item) => item.isYahooFinance);

  // The same company is listed on several exchanges (NSE, BSE, NYSE...),
  // so we hand the model a short list and let it pick the right one.
  return {
    query,
    matches: tickers.slice(0, 5).map((item) => ({
      symbol: item.symbol,
      name: item.shortname || item.longname || item.symbol,
      exchange: item.exchange, // NSI = NSE, BSE = BSE, NYQ = NYSE
      type: item.quoteType, // EQUITY, INDEX, CURRENCY, FUTURE...
    })),
  };
}

module.exports = {
  getPrice,
  searchSymbol,
};
