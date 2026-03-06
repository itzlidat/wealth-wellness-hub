package com.wealthwellness.service;

import com.wealthwellness.model.Asset;
import com.wealthwellness.model.Recommendation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RecommendationService {

    @Autowired
    private ScoringService scoring;

    public List<String> generateAlerts(List<Asset> assets) {
        List<String> alerts = new ArrayList<>();
        double total = assets.stream().mapToDouble(Asset::getValueSgd).sum();

        String topClass = scoring.topConcentrationClass(assets);
        double topW = scoring.topConcentrationWeight(assets);
        if (topW >= 0.60) {
            alerts.add(String.format("High concentration: %s is %.0f%% of your portfolio.", topClass, topW * 100));
        }

        double liquid7 = assets.stream()
                .filter(a -> a.getLiquidityDays() <= 7)
                .mapToDouble(Asset::getValueSgd).sum();
        double liquidPct = total > 0 ? liquid7 / total : 0.0;
        if (liquidPct <= 0.15) {
            alerts.add(String.format("Low short-term liquidity: only %.0f%% liquid within 7 days.", liquidPct * 100));
        }

        double highRisk = assets.stream()
                .filter(a -> "High".equals(a.getRiskTag()))
                .mapToDouble(Asset::getValueSgd).sum();
        double highRiskPct = total > 0 ? highRisk / total : 0.0;
        if (highRiskPct >= 0.50) {
            alerts.add(String.format("High-risk exposure: %.0f%% is tagged High risk.", highRiskPct * 100));
        }

        return alerts.stream().limit(3).collect(Collectors.toList());
    }

    public List<Recommendation> generateRecommendations(List<Asset> assets) {
        List<Recommendation> recs = new ArrayList<>();
        double div = scoring.diversificationScore(assets);
        double liq = scoring.liquidityScore(assets);
        double total = assets.stream().mapToDouble(Asset::getValueSgd).sum();

        String topClass = scoring.topConcentrationClass(assets);
        double topW = scoring.topConcentrationWeight(assets);
        if (topW >= 0.60) {
            recs.add(new Recommendation(
                    "Reduce over-concentration in " + topClass,
                    String.format("%s is %.0f%% of your portfolio, which lowers diversification (score %.0f/100).",
                            topClass, topW * 100, div)
            ));
        }

        double liquid7 = assets.stream()
                .filter(a -> a.getLiquidityDays() <= 7)
                .mapToDouble(Asset::getValueSgd).sum();
        double liquidPct = total > 0 ? liquid7 / total : 0.0;
        if (liquidPct <= 0.20) {
            recs.add(new Recommendation(
                    "Build a stronger cash buffer",
                    String.format("Only %.0f%% is liquid within 7 days (liquidity score %.0f/100).", liquidPct * 100, liq)
            ));
        }

        if (recs.size() < 3) {
            recs.add(new Recommendation(
                    "Stress-test monthly with common shocks",
                    "Scenario testing helps you understand which assets drive drawdowns and prepare ahead of time."
            ));
        }
        if (recs.size() < 3) {
            recs.add(new Recommendation(
                    "Rebalance toward a target allocation",
                    "A simple target split (e.g., cash/equity/bonds) keeps risk aligned with your goals."
            ));
        }

        return recs.stream().limit(3).collect(Collectors.toList());
    }
}
