package com.wealthwellness.service;

import com.wealthwellness.model.Asset;
import com.wealthwellness.model.CustomScenario;
import com.wealthwellness.model.ScenarioImpactItem;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ScenarioService {

    public static final List<String> ASSET_CLASSES =
            List.of("All Assets", "Cash", "Equity", "Bonds", "Crypto", "Private");

    /**
     * Apply a custom scenario: shift a given asset class (or all) by changePercent.
     */
    public List<Asset> applyCustomScenario(List<Asset> assets, CustomScenario cs) {
        if (cs == null) return new ArrayList<>(assets);
        double multiplier = 1.0 + cs.getChangePercent() / 100.0;
        return assets.stream().map(a -> {
            boolean applies = "All Assets".equals(cs.getAssetClass())
                    || cs.getAssetClass().equals(a.getAssetClass());
            Asset copy = copyAsset(a);
            if (applies) copy.setValueSgd(a.getValueSgd() * multiplier);
            return copy;
        }).collect(Collectors.toList());
    }

    /**
     * Compute the portfolio drop % under the given custom scenario.
     */
    public double dropPct(List<Asset> base, CustomScenario cs) {
        double baseTotal = base.stream().mapToDouble(Asset::getValueSgd).sum();
        if (baseTotal == 0) return 0;
        List<Asset> after = applyCustomScenario(base, cs);
        double newTotal = after.stream().mapToDouble(Asset::getValueSgd).sum();
        return 100.0 * Math.max(0, (baseTotal - newTotal) / baseTotal);
    }

    /**
     * Worst-case drop across a set of stress shocks (for resilience score baseline).
     * Uses hardcoded reference shocks — independent of the user's custom scenario.
     */
    public double worstReferenceDropPct(List<Asset> base) {
        double baseTotal = base.stream().mapToDouble(Asset::getValueSgd).sum();
        if (baseTotal == 0) return 0;

        List<CustomScenario> referenceShocks = List.of(
                makeScenario("Equity",  -15),
                makeScenario("Crypto",  -30),
                makeScenario("Bonds",    -5),
                makeScenario("Private", -10)
        );

        double worst = 0;
        for (CustomScenario shock : referenceShocks) {
            double after = applyCustomScenario(base, shock)
                    .stream().mapToDouble(Asset::getValueSgd).sum();
            double drop = 100.0 * Math.max(0, (baseTotal - after) / baseTotal);
            worst = Math.max(worst, drop);
        }
        return worst;
    }

    public List<ScenarioImpactItem> computeImpact(List<Asset> base, List<Asset> after) {
        List<ScenarioImpactItem> impacts = new ArrayList<>();
        for (int i = 0; i < base.size(); i++) {
            Asset b = base.get(i);
            Asset a = after.get(i);
            double change = a.getValueSgd() - b.getValueSgd();
            if (Math.abs(change) >= 1) {
                impacts.add(new ScenarioImpactItem(
                        b.getAssetName(), b.getAssetClass(),
                        b.getValueSgd(), a.getValueSgd(), change));
            }
        }
        impacts.sort(Comparator.comparingDouble(ScenarioImpactItem::getChangeSgd));
        return impacts.stream().limit(5).collect(Collectors.toList());
    }

    // ---- helpers ----

    private Asset copyAsset(Asset a) {
        Asset copy = new Asset();
        copy.setAssetName(a.getAssetName());
        copy.setAssetClass(a.getAssetClass());
        copy.setValueSgd(a.getValueSgd());
        copy.setLiquidityDays(a.getLiquidityDays());
        copy.setRiskTag(a.getRiskTag());
        copy.setSource(a.getSource());
        copy.setTicker(a.getTicker());
        copy.setQuantity(a.getQuantity());
        copy.setPriceSource(a.getPriceSource());
        copy.setLivePrice(a.getLivePrice());
        return copy;
    }

    private CustomScenario makeScenario(String assetClass, double pct) {
        CustomScenario cs = new CustomScenario();
        cs.setAssetClass(assetClass);
        cs.setChangePercent(pct);
        return cs;
    }
}
