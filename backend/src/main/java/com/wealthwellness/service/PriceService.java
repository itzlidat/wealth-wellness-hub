package com.wealthwellness.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.wealthwellness.model.OhlcBar;
import com.wealthwellness.model.OhlcResponse;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Fetches live market prices from:
 *   - Binance (crypto in USDT, free, no key, high rate limit)
 *   - Yahoo Finance v8 chart (stocks/ETFs, free, no key)
 *   - ExchangeRate-API (USD → SGD, free, no key)
 *
 * MAS Open Finance / Plaid require institutional registration —
 * bank balances are entered manually via CSV.
 */
@Service
public class PriceService {

    private static final Logger log = LoggerFactory.getLogger(PriceService.class);

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private final ObjectMapper mapper = new ObjectMapper();

    private static final String USER_AGENT =
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

    // Ticker symbol → Binance pair (all quoted in USDT ≈ USD)
    private static final Map<String, String> BINANCE_PAIRS = new HashMap<>(Map.ofEntries(
            Map.entry("BTC",   "BTCUSDT"),
            Map.entry("ETH",   "ETHUSDT"),
            Map.entry("SOL",   "SOLUSDT"),
            Map.entry("BNB",   "BNBUSDT"),
            Map.entry("ADA",   "ADAUSDT"),
            Map.entry("XRP",   "XRPUSDT"),
            Map.entry("DOGE",  "DOGEUSDT"),
            Map.entry("DOT",   "DOTUSDT"),
            Map.entry("MATIC", "MATICUSDT"),
            Map.entry("AVAX",  "AVAXUSDT"),
            Map.entry("LTC",   "LTCUSDT"),
            Map.entry("LINK",  "LINKUSDT"),
            Map.entry("UNI",   "UNIUSDT"),
            Map.entry("ATOM",  "ATOMUSDT")
    ));

    // Stablecoins treated as 1 USD each
    private static final Set<String> STABLECOINS = Set.of("USDT", "USDC");

    public boolean isCryptoSymbol(String ticker) {
        if (ticker == null) return false;
        String upper = ticker.toUpperCase();
        return BINANCE_PAIRS.containsKey(upper) || STABLECOINS.contains(upper);
    }

    /**
     * Fetch crypto prices in USD from Binance, then convert to SGD.
     * Returns: { "BTC" -> 90000.0, "ETH" -> 4800.0, ... } (values in SGD)
     */
    public Map<String, Double> fetchCryptoPricesSgd(List<String> symbols) {
        if (symbols.isEmpty()) return Collections.emptyMap();

        // Build Binance symbols array, skip stablecoins (treat as 1 USD)
        List<String> pairs = symbols.stream()
                .map(String::toUpperCase)
                .filter(s -> BINANCE_PAIRS.containsKey(s) && BINANCE_PAIRS.get(s) != null)
                .map(BINANCE_PAIRS::get)
                .distinct()
                .collect(Collectors.toList());

        double usdToSgd = fetchUsdToSgd();
        Map<String, Double> result = new HashMap<>();

        // Stablecoins: 1 USDT/USDC ≈ 1 USD
        symbols.stream()
                .map(String::toUpperCase)
                .filter(STABLECOINS::contains)
                .forEach(s -> result.put(s, usdToSgd));

        if (pairs.isEmpty()) return result;

        try {
            String symbolsJson = URLEncoder.encode(
                    "[" + pairs.stream().map(p -> "\"" + p + "\"").collect(Collectors.joining(",")) + "]",
                    StandardCharsets.UTF_8);

            String url = "https://api.binance.com/api/v3/ticker/price?symbols=" + symbolsJson;
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(8))
                    .GET().build();

            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            JsonNode arr = mapper.readTree(resp.body());

            // Build reverse map: BTCUSDT → BTC
            Map<String, String> pairToSymbol = new HashMap<>();
            for (String sym : symbols) {
                String pair = BINANCE_PAIRS.get(sym.toUpperCase());
                if (pair != null) pairToSymbol.put(pair, sym.toUpperCase());
            }

            if (arr.isArray()) {
                for (JsonNode item : arr) {
                    String pair  = item.path("symbol").asText();
                    double price = item.path("price").asDouble(0);
                    String sym   = pairToSymbol.get(pair);
                    if (sym != null && price > 0) {
                        result.put(sym, price * usdToSgd);
                    }
                }
            }
            log.info("Binance: fetched {} crypto prices (USD/SGD rate: {})", result.size(), usdToSgd);

        } catch (Exception e) {
            log.warn("Binance fetch failed: {}", e.getMessage());
        }

        return result;
    }

    /**
     * Fetch stock/ETF price from Yahoo Finance v8 chart endpoint.
     * Returns: { "SPY" -> StockQuote(price, currency), ... }
     */
    public Map<String, StockQuote> fetchStockQuotes(List<String> tickers) {
        if (tickers.isEmpty()) return Collections.emptyMap();

        Map<String, StockQuote> result = new HashMap<>();

        for (String ticker : tickers) {
            try {
                String url = "https://query2.finance.yahoo.com/v8/finance/chart/"
                        + ticker + "?interval=1d&range=1d";

                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("User-Agent", USER_AGENT)
                        .header("Accept", "application/json")
                        .timeout(Duration.ofSeconds(8))
                        .GET().build();

                HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
                JsonNode meta = mapper.readTree(resp.body())
                        .path("chart").path("result").path(0).path("meta");

                double price    = meta.path("regularMarketPrice").asDouble(0);
                String currency = meta.path("currency").asText("USD");

                if (price > 0) {
                    result.put(ticker, new StockQuote(price, currency));
                    log.info("Yahoo Finance: {} = {} {}", ticker, price, currency);
                }

            } catch (Exception e) {
                log.warn("Yahoo Finance fetch failed for {}: {}", ticker, e.getMessage());
            }
        }

        return result;
    }

    /**
     * Fetch USD → SGD exchange rate from ExchangeRate-API (free, no key).
     * Falls back to 1.35 if unreachable.
     */
    public double fetchUsdToSgd() {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://open.er-api.com/v6/latest/USD"))
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(8))
                    .GET().build();

            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            double rate = mapper.readTree(resp.body()).path("rates").path("SGD").asDouble(0);
            if (rate > 0) {
                log.info("FX: USD/SGD = {}", rate);
                return rate;
            }
        } catch (Exception e) {
            log.warn("FX rate fetch failed: {}", e.getMessage());
        }
        return 1.35;
    }

    public record StockQuote(double price, String currency) {}

    // -------------------------------------------------------------------------
    // OHLC / Candlestick data
    // -------------------------------------------------------------------------

    /**
     * Fetch OHLC candlestick bars for a ticker.
     * range: "1mo" | "3mo" | "6mo" | "1y"
     */
    public OhlcResponse fetchOhlcData(String ticker, String range) {
        if (isCryptoSymbol(ticker)) {
            return fetchCryptoOhlc(ticker, range);
        } else {
            return fetchStockOhlc(ticker, range);
        }
    }

    private OhlcResponse fetchCryptoOhlc(String symbol, String range) {
        String pair = BINANCE_PAIRS.get(symbol.toUpperCase());
        if (pair == null) return new OhlcResponse(symbol, "USD", List.of());

        int limit = switch (range) {
            case "1mo" -> 30;
            case "6mo" -> 180;
            case "1y"  -> 365;
            default    -> 90; // 3mo
        };

        double usdToSgd = fetchUsdToSgd();
        String url = "https://api.binance.com/api/v3/klines?symbol=" + pair
                + "&interval=1d&limit=" + limit;

        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(10))
                    .GET().build();

            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            JsonNode arr = mapper.readTree(resp.body());

            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneOffset.UTC);
            List<OhlcBar> bars = new ArrayList<>();

            if (arr.isArray()) {
                for (JsonNode row : arr) {
                    long openMs   = row.get(0).asLong();
                    double open   = row.get(1).asDouble() * usdToSgd;
                    double high   = row.get(2).asDouble() * usdToSgd;
                    double low    = row.get(3).asDouble() * usdToSgd;
                    double close  = row.get(4).asDouble() * usdToSgd;
                    String date   = fmt.format(Instant.ofEpochMilli(openMs));
                    bars.add(new OhlcBar(date, round(open), round(high), round(low), round(close)));
                }
            }
            log.info("Binance OHLC: {} bars for {}", bars.size(), symbol);
            return new OhlcResponse(symbol, "SGD", bars);

        } catch (Exception e) {
            log.warn("Binance OHLC failed for {}: {}", symbol, e.getMessage());
            return new OhlcResponse(symbol, "SGD", List.of());
        }
    }

    private OhlcResponse fetchStockOhlc(String ticker, String range) {
        String url = "https://query2.finance.yahoo.com/v8/finance/chart/"
                + ticker + "?interval=1d&range=" + range;

        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", USER_AGENT)
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(10))
                    .GET().build();

            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            JsonNode root     = mapper.readTree(resp.body());
            JsonNode result   = root.path("chart").path("result").path(0);
            JsonNode meta     = result.path("meta");
            JsonNode timestamps = result.path("timestamp");
            JsonNode quote    = result.path("indicators").path("quote").path(0);

            String currency   = meta.path("currency").asText("USD");
            boolean needsFx   = "USD".equals(currency);
            double usdToSgd   = needsFx ? fetchUsdToSgd() : 1.0;
            String displayCcy = needsFx ? "SGD" : currency;

            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneOffset.UTC);
            List<OhlcBar> bars = new ArrayList<>();

            for (int i = 0; i < timestamps.size(); i++) {
                JsonNode o = quote.path("open").path(i);
                JsonNode h = quote.path("high").path(i);
                JsonNode l = quote.path("low").path(i);
                JsonNode c = quote.path("close").path(i);

                // Skip bars with null values (market closed)
                if (o.isNull() || h.isNull() || l.isNull() || c.isNull()) continue;

                long ts     = timestamps.get(i).asLong();
                String date = fmt.format(Instant.ofEpochSecond(ts));
                bars.add(new OhlcBar(date,
                        round(o.asDouble() * usdToSgd),
                        round(h.asDouble() * usdToSgd),
                        round(l.asDouble() * usdToSgd),
                        round(c.asDouble() * usdToSgd)));
            }
            log.info("Yahoo OHLC: {} bars for {} ({})", bars.size(), ticker, displayCcy);
            return new OhlcResponse(ticker, displayCcy, bars);

        } catch (Exception e) {
            log.warn("Yahoo OHLC failed for {}: {}", ticker, e.getMessage());
            return new OhlcResponse(ticker, "SGD", List.of());
        }
    }

    private double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
