package com.wealthwellness.model;

public class Asset {
    private String assetName;
    private String assetClass;
    private double valueSgd;
    private double liquidityDays;
    private String riskTag;
    private String source;
    private String ticker;
    private Double quantity;
    private String priceSource;
    private Double livePrice;

    public String getAssetName() { return assetName; }
    public void setAssetName(String assetName) { this.assetName = assetName; }

    public String getAssetClass() { return assetClass; }
    public void setAssetClass(String assetClass) { this.assetClass = assetClass; }

    public double getValueSgd() { return valueSgd; }
    public void setValueSgd(double valueSgd) { this.valueSgd = valueSgd; }

    public double getLiquidityDays() { return liquidityDays; }
    public void setLiquidityDays(double liquidityDays) { this.liquidityDays = liquidityDays; }

    public String getRiskTag() { return riskTag; }
    public void setRiskTag(String riskTag) { this.riskTag = riskTag; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }

    public Double getQuantity() { return quantity; }
    public void setQuantity(Double quantity) { this.quantity = quantity; }

    public String getPriceSource() { return priceSource; }
    public void setPriceSource(String priceSource) { this.priceSource = priceSource; }

    public Double getLivePrice() { return livePrice; }
    public void setLivePrice(Double livePrice) { this.livePrice = livePrice; }
}
