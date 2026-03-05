import pandas as pd
from .scoring import diversification_score, liquidity_score, top_concentration

def generate_alerts(df: pd.DataFrame) -> list[str]:
    alerts = []

    # Concentration
    top_class, top_w = top_concentration(df)
    if top_w >= 0.60:
        alerts.append(f"High concentration: {top_class} is {top_w*100:.0f}% of your portfolio.")

    # Liquidity
    total = df["value_sgd"].sum()
    liquid_7 = df.loc[df["liquidity_days"] <= 7, "value_sgd"].sum()
    liquid_pct = (liquid_7 / total) if total > 0 else 0
    if liquid_pct <= 0.15:
        alerts.append(f"Low short-term liquidity: only {liquid_pct*100:.0f}% liquid within 7 days.")

    # Risk tags
    high_risk_pct = (df.loc[df["risk_tag"] == "High", "value_sgd"].sum() / total) if total > 0 else 0
    if high_risk_pct >= 0.50:
        alerts.append(f"High-risk exposure: {high_risk_pct*100:.0f}% is tagged High risk.")

    return alerts[:3]

def generate_recommendations(df: pd.DataFrame) -> list[dict]:
    recs = []
    div = diversification_score(df)
    liq = liquidity_score(df)

    top_class, top_w = top_concentration(df)
    if top_w >= 0.60:
        recs.append({
            "action": f"Reduce over-concentration in {top_class}",
            "why": f"{top_class} is {top_w*100:.0f}% of your portfolio, which lowers diversification (score {div:.0f}/100)."
        })

    total = df["value_sgd"].sum()
    liquid_7 = df.loc[df["liquidity_days"] <= 7, "value_sgd"].sum()
    liquid_pct = (liquid_7 / total) if total > 0 else 0
    if liquid_pct <= 0.20:
        recs.append({
            "action": "Build a stronger cash buffer",
            "why": f"Only {liquid_pct*100:.0f}% is liquid within 7 days (liquidity score {liq:.0f}/100)."
        })

    # If we still need recommendations, add sensible defaults
    if len(recs) < 3:
        recs.append({
            "action": "Stress-test monthly with common shocks",
            "why": "Scenario testing helps you understand which assets drive drawdowns and prepare ahead of time."
        })
    if len(recs) < 3:
        recs.append({
            "action": "Rebalance toward a target allocation",
            "why": "A simple target split (e.g., cash/equity/bonds) keeps risk aligned with your goals."
        })

    return recs[:3]