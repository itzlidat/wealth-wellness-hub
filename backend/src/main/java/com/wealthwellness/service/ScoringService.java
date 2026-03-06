package com.wealthwellness.service;

import com.wealthwellness.model.AllocationEntry;
import com.wealthwellness.model.Asset;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ScoringService {

    public List<AllocationEntry> computeAllocation(List<Asset> assets) {
        double total = assets.stream().mapToDouble(Asset::getValueSgd).sum();
        Map<String, Double> grouped = new LinkedHashMap<>();
        for (Asset a : assets) {
            grouped.merge(a.getAssetClass(), a.getValueSgd(), Double::sum);
        }
        List<AllocationEntry> result = new ArrayList<>();
        for (Map.Entry<String, Double> e : grouped.entrySet()) {
            double weight = total > 0 ? e.getValue() / total : 0.0;
            result.add(new AllocationEntry(e.getKey(), e.getValue(), weight));
        }
        result.sort((a, b) -> Double.compare(b.getValueSgd(), a.getValueSgd()));
        return result;
    }

    public double diversificationScore(List<Asset> assets) {
        List<AllocationEntry> alloc = computeAllocation(assets);
        double concentration = alloc.stream().mapToDouble(e -> e.getWeight() * e.getWeight()).sum();
        return clamp(100.0 * (1.0 - concentration));
    }

    public double liquidityScore(List<Asset> assets) {
        double total = assets.stream().mapToDouble(Asset::getValueSgd).sum();
        double liquid = assets.stream()
                .filter(a -> a.getLiquidityDays() <= 7)
                .mapToDouble(Asset::getValueSgd).sum();
        return clamp(total > 0 ? 100.0 * liquid / total : 0.0);
    }

    public double resilienceScore(double worstDropPct) {
        return clamp(100.0 - 2.0 * worstDropPct);
    }

    public String topConcentrationClass(List<Asset> assets) {
        return computeAllocation(assets).stream()
                .max(Comparator.comparingDouble(AllocationEntry::getWeight))
                .map(AllocationEntry::getAssetClass)
                .orElse("");
    }

    public double topConcentrationWeight(List<Asset> assets) {
        return computeAllocation(assets).stream()
                .mapToDouble(AllocationEntry::getWeight)
                .max().orElse(0.0);
    }

    private double clamp(double x) {
        return Math.max(0.0, Math.min(100.0, x));
    }
}
