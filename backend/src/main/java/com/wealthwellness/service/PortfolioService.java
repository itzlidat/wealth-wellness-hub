package com.wealthwellness.service;

import com.wealthwellness.model.Asset;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PortfolioService {

    @Autowired
    private PriceService priceService;

    private static final List<String> REQUIRED_COLS = List.of(
            "asset_name", "asset_class", "value_sgd", "liquidity_days", "risk_tag", "source"
    );

    public List<Asset> parseCSV(InputStream inputStream) throws IOException {
        BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8));

        String headerLine = reader.readLine();
        if (headerLine == null) throw new IllegalArgumentException("CSV is empty.");

        String[] headers = Arrays.stream(headerLine.split(","))
                .map(String::trim)
                .toArray(String[]::new);

        Map<String, Integer> colIndex = new HashMap<>();
        for (int i = 0; i < headers.length; i++) {
            colIndex.put(headers[i], i);
        }

        for (String req : REQUIRED_COLS) {
            if (!colIndex.containsKey(req)) {
                throw new IllegalArgumentException("CSV missing column: " + req
                        + ". Required: " + String.join(", ", REQUIRED_COLS));
            }
        }

        List<Asset> assets = new ArrayList<>();
        String line;
        int row = 2;
        while ((line = reader.readLine()) != null) {
            if (line.trim().isEmpty()) continue;
            String[] parts = line.split(",", -1);
            try {
                Asset a = new Asset();
                a.setAssetName(parts[colIndex.get("asset_name")].trim());
                a.setAssetClass(parts[colIndex.get("asset_class")].trim());
                a.setValueSgd(Double.parseDouble(parts[colIndex.get("value_sgd")].trim()));
                a.setLiquidityDays(Double.parseDouble(parts[colIndex.get("liquidity_days")].trim()));
                a.setRiskTag(parts[colIndex.get("risk_tag")].trim());
                a.setSource(parts[colIndex.get("source")].trim());

                // Optional live-price columns
                if (colIndex.containsKey("ticker") && colIndex.get("ticker") < parts.length) {
                    String t = parts[colIndex.get("ticker")].trim();
                    if (!t.isEmpty()) a.setTicker(t);
                }
                if (colIndex.containsKey("quantity") && colIndex.get("quantity") < parts.length) {
                    String q = parts[colIndex.get("quantity")].trim();
                    if (!q.isEmpty()) a.setQuantity(Double.parseDouble(q));
                }
                a.setPriceSource("manual");
                assets.add(a);
            } catch (NumberFormatException | ArrayIndexOutOfBoundsException e) {
                throw new IllegalArgumentException("Invalid data at row " + row + ": " + e.getMessage());
            }
            row++;
        }

        if (assets.isEmpty()) throw new IllegalArgumentException("CSV has no data rows.");
        return enrichWithLivePrices(assets);
    }

    public List<Asset> loadSample(String name) throws IOException {
        String resourcePath = "/samples/" + name + ".csv";
        InputStream is = getClass().getResourceAsStream(resourcePath);
        if (is == null) throw new IllegalArgumentException("Sample not found: " + name);
        return parseCSV(is);
    }

    /**
     * For each asset that has a ticker + quantity, fetch the live price
     * and recompute value_sgd = quantity * livePrice.
     * Assets without a ticker keep their manual value_sgd.
     */
    public List<Asset> enrichWithLivePrices(List<Asset> assets) {
        List<Asset> withTicker = assets.stream()
                .filter(a -> a.getTicker() != null && a.getQuantity() != null)
                .collect(Collectors.toList());

        if (withTicker.isEmpty()) return assets;

        // Separate crypto vs stock tickers
        List<String> cryptoSymbols = withTicker.stream()
                .filter(a -> priceService.isCryptoSymbol(a.getTicker()))
                .map(Asset::getTicker)
                .distinct()
                .collect(Collectors.toList());

        List<String> stockTickers = withTicker.stream()
                .filter(a -> !priceService.isCryptoSymbol(a.getTicker()))
                .map(Asset::getTicker)
                .distinct()
                .collect(Collectors.toList());

        // Fetch prices
        Map<String, Double> cryptoPrices = priceService.fetchCryptoPricesSgd(cryptoSymbols);
        Map<String, PriceService.StockQuote> stockQuotes = priceService.fetchStockQuotes(stockTickers);
        double usdToSgd = stockQuotes.isEmpty() ? 1.35 : priceService.fetchUsdToSgd();

        // Apply prices
        for (Asset a : assets) {
            if (a.getTicker() == null || a.getQuantity() == null) continue;
            String sym = a.getTicker().toUpperCase();

            if (cryptoPrices.containsKey(sym)) {
                double priceSgd = cryptoPrices.get(sym);
                a.setLivePrice(priceSgd);
                a.setValueSgd(a.getQuantity() * priceSgd);
                a.setPriceSource("live");

            } else if (stockQuotes.containsKey(a.getTicker())) {
                PriceService.StockQuote q = stockQuotes.get(a.getTicker());
                double priceSgd = "SGD".equals(q.currency()) ? q.price() : q.price() * usdToSgd;
                a.setLivePrice(priceSgd);
                a.setValueSgd(a.getQuantity() * priceSgd);
                a.setPriceSource("live");
            }
            // else: stays "manual"
        }

        return assets;
    }
}
