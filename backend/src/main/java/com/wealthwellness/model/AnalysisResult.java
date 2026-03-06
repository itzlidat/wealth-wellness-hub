package com.wealthwellness.model;

import java.util.List;

public class AnalysisResult {
    private double netWorth;
    private double baseNetWorth;
    private double delta;
    private String appliedScenario;
    private List<Asset> assets;
    private List<AllocationEntry> allocation;
    private double diversificationScore;
    private double liquidityScore;
    private double resilienceScore;
    private double worstDropPct;
    private List<String> healthIssues;
    private List<String> alerts;
    private List<Recommendation> recommendations;
    private List<ScenarioImpactItem> scenarioImpact;
    private String pricesUpdatedAt;

    public double getNetWorth() { return netWorth; }
    public void setNetWorth(double netWorth) { this.netWorth = netWorth; }

    public double getBaseNetWorth() { return baseNetWorth; }
    public void setBaseNetWorth(double baseNetWorth) { this.baseNetWorth = baseNetWorth; }

    public double getDelta() { return delta; }
    public void setDelta(double delta) { this.delta = delta; }

    public String getAppliedScenario() { return appliedScenario; }
    public void setAppliedScenario(String appliedScenario) { this.appliedScenario = appliedScenario; }

    public List<Asset> getAssets() { return assets; }
    public void setAssets(List<Asset> assets) { this.assets = assets; }

    public List<AllocationEntry> getAllocation() { return allocation; }
    public void setAllocation(List<AllocationEntry> allocation) { this.allocation = allocation; }

    public double getDiversificationScore() { return diversificationScore; }
    public void setDiversificationScore(double diversificationScore) { this.diversificationScore = diversificationScore; }

    public double getLiquidityScore() { return liquidityScore; }
    public void setLiquidityScore(double liquidityScore) { this.liquidityScore = liquidityScore; }

    public double getResilienceScore() { return resilienceScore; }
    public void setResilienceScore(double resilienceScore) { this.resilienceScore = resilienceScore; }

    public double getWorstDropPct() { return worstDropPct; }
    public void setWorstDropPct(double worstDropPct) { this.worstDropPct = worstDropPct; }

    public List<String> getHealthIssues() { return healthIssues; }
    public void setHealthIssues(List<String> healthIssues) { this.healthIssues = healthIssues; }

    public List<String> getAlerts() { return alerts; }
    public void setAlerts(List<String> alerts) { this.alerts = alerts; }

    public List<Recommendation> getRecommendations() { return recommendations; }
    public void setRecommendations(List<Recommendation> recommendations) { this.recommendations = recommendations; }

    public List<ScenarioImpactItem> getScenarioImpact() { return scenarioImpact; }
    public void setScenarioImpact(List<ScenarioImpactItem> scenarioImpact) { this.scenarioImpact = scenarioImpact; }

    public String getPricesUpdatedAt() { return pricesUpdatedAt; }
    public void setPricesUpdatedAt(String pricesUpdatedAt) { this.pricesUpdatedAt = pricesUpdatedAt; }
}
