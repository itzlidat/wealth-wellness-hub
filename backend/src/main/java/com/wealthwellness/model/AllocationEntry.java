package com.wealthwellness.model;

public class AllocationEntry {
    private String assetClass;
    private double valueSgd;
    private double weight;

    public AllocationEntry(String assetClass, double valueSgd, double weight) {
        this.assetClass = assetClass;
        this.valueSgd = valueSgd;
        this.weight = weight;
    }

    public String getAssetClass() { return assetClass; }
    public void setAssetClass(String assetClass) { this.assetClass = assetClass; }

    public double getValueSgd() { return valueSgd; }
    public void setValueSgd(double valueSgd) { this.valueSgd = valueSgd; }

    public double getWeight() { return weight; }
    public void setWeight(double weight) { this.weight = weight; }
}
