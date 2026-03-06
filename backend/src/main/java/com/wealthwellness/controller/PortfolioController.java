package com.wealthwellness.controller;

import com.wealthwellness.model.*;
import com.wealthwellness.service.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class PortfolioController {

    @Autowired private PriceService priceService;
    @Autowired private PortfolioService portfolioService;
    @Autowired private ScoringService scoringService;
    @Autowired private ScenarioService scenarioService;
    @Autowired private RecommendationService recommendationService;

    @PostMapping("/portfolio/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) {
        try {
            List<Asset> assets = portfolioService.parseCSV(file.getInputStream());
            return ResponseEntity.ok(assets);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/portfolio/sample/{name}")
    public ResponseEntity<?> sample(@PathVariable String name) {
        try {
            List<Asset> assets = portfolioService.loadSample(name);
            return ResponseEntity.ok(assets);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/scenarios/asset-classes")
    public ResponseEntity<List<String>> assetClasses() {
        return ResponseEntity.ok(ScenarioService.ASSET_CLASSES);
    }

    @GetMapping("/prices/history/{ticker}")
    public ResponseEntity<?> priceHistory(
            @PathVariable String ticker,
            @RequestParam(defaultValue = "3mo") String range) {
        try {
            OhlcResponse ohlc = priceService.fetchOhlcData(ticker, range);
            return ResponseEntity.ok(ohlc);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/prices/refresh")
    public ResponseEntity<?> refreshPrices(@RequestBody List<Asset> assets) {
        try {
            List<Asset> enriched = portfolioService.enrichWithLivePrices(assets);
            return ResponseEntity.ok(Map.of(
                    "assets", enriched,
                    "updatedAt", Instant.now().toString()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/analyze")
    public ResponseEntity<?> analyze(@RequestBody AnalysisRequest request) {
        try {
            List<Asset> base = request.getAssets();
            CustomScenario cs = request.getCustomScenario();
            boolean hasScenario = cs != null && cs.getAssetClass() != null;

            List<Asset> assets = hasScenario
                    ? scenarioService.applyCustomScenario(base, cs)
                    : new ArrayList<>(base);

            double baseNetWorth = base.stream().mapToDouble(Asset::getValueSgd).sum();
            double netWorth     = assets.stream().mapToDouble(Asset::getValueSgd).sum();
            double worstDrop    = scenarioService.worstReferenceDropPct(base);

            AnalysisResult result = new AnalysisResult();
            result.setNetWorth(netWorth);
            result.setBaseNetWorth(baseNetWorth);
            result.setDelta(netWorth - baseNetWorth);
            result.setAssets(assets);
            result.setAllocation(scoringService.computeAllocation(assets));
            result.setDiversificationScore(scoringService.diversificationScore(assets));
            result.setLiquidityScore(scoringService.liquidityScore(assets));
            result.setWorstDropPct(worstDrop);
            result.setResilienceScore(scoringService.resilienceScore(worstDrop));

            List<String> issues = new ArrayList<>();
            if (result.getDiversificationScore() < 40) issues.add("high concentration risk");
            if (result.getLiquidityScore() < 20)       issues.add("low short-term liquidity buffer");
            if (result.getResilienceScore() < 50)      issues.add("fragile under stress scenarios");
            result.setHealthIssues(issues);

            result.setAlerts(recommendationService.generateAlerts(assets));
            result.setRecommendations(recommendationService.generateRecommendations(assets));
            result.setScenarioImpact(hasScenario
                    ? scenarioService.computeImpact(base, assets)
                    : List.of());

            result.setPricesUpdatedAt(Instant.now().toString());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
