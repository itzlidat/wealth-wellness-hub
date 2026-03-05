import numpy as np
import pandas as pd

ASSET_CLASSES = ["Cash", "Equity", "Bonds", "Crypto", "Private"]

def _clamp(x, lo=0.0, hi=100.0):
    return float(max(lo, min(hi, x)))

def compute_allocation(df: pd.DataFrame) -> pd.DataFrame:
    alloc = df.groupby("asset_class", as_index=False)["value_sgd"].sum()
    total = alloc["value_sgd"].sum()
    alloc["weight"] = alloc["value_sgd"] / total if total > 0 else 0.0
    return alloc

def diversification_score(df: pd.DataFrame) -> float:
    alloc = compute_allocation(df)
    # concentration = sum(w^2)
    concentration = float((alloc["weight"] ** 2).sum())
    score = 100.0 * (1.0 - concentration)
    return _clamp(score)

def liquidity_score(df: pd.DataFrame, days_threshold: int = 7) -> float:
    total = df["value_sgd"].sum()
    liquid = df.loc[df["liquidity_days"] <= days_threshold, "value_sgd"].sum()
    score = 100.0 * (liquid / total) if total > 0 else 0.0
    return _clamp(score)

def resilience_score_from_worst_drop(worst_drop_pct: float) -> float:
    # worst_drop_pct is 0-100 (e.g. 28 for -28%)
    score = 100.0 - 2.0 * worst_drop_pct
    return _clamp(score)

def top_concentration(df: pd.DataFrame):
    alloc = compute_allocation(df).sort_values("weight", ascending=False)
    if alloc.empty:
        return None, 0.0
    return str(alloc.iloc[0]["asset_class"]), float(alloc.iloc[0]["weight"])