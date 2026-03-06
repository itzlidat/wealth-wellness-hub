package com.wealthwellness.model;

public class ScenarioImpactItem {
    private String assetName;
    private String assetClass;
    private double beforeSgd;
    private double afterSgd;
    private double changeSgd;

    public ScenarioImpactItem(String assetName, String assetClass, double beforeSgd, double afterSgd, double changeSgd) {
        this.assetName = assetName;
        this.assetClass = assetClass;
        this.beforeSgd = beforeSgd;
        this.afterSgd = afterSgd;
        this.changeSgd = changeSgd;
    }

    public String getAssetName() { return assetName; }
    public void setAssetName(String assetName) { this.assetName = assetName; }

    public String getAssetClass() { return assetClass; }
    public void setAssetClass(String assetClass) { this.assetClass = assetClass; }

    public double getBeforeSgd() { return beforeSgd; }
    public void setBeforeSgd(double beforeSgd) { this.beforeSgd = beforeSgd; }

    public double getAfterSgd() { return afterSgd; }
    public void setAfterSgd(double afterSgd) { this.afterSgd = afterSgd; }

    public double getChangeSgd() { return changeSgd; }
    public void setChangeSgd(double changeSgd) { this.changeSgd = changeSgd; }
}
