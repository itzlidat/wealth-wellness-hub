package com.wealthwellness.model;

import java.util.List;

public class AnalysisRequest {
    private List<Asset> assets;
    private CustomScenario customScenario; // flexible user-defined scenario

    public List<Asset> getAssets()              { return assets; }
    public void setAssets(List<Asset> assets)   { this.assets = assets; }

    public CustomScenario getCustomScenario()                       { return customScenario; }
    public void setCustomScenario(CustomScenario customScenario)    { this.customScenario = customScenario; }
}
