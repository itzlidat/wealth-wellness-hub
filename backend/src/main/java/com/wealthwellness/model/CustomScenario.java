package com.wealthwellness.model;

public class CustomScenario {
    private String assetClass;   // "Equity", "Crypto", "Bonds", "Private", "Cash", "All"
    private double changePercent; // e.g. -30 means -30%, +10 means +10%

    public String getAssetClass()    { return assetClass; }
    public void setAssetClass(String assetClass) { this.assetClass = assetClass; }

    public double getChangePercent() { return changePercent; }
    public void setChangePercent(double changePercent) { this.changePercent = changePercent; }
}
