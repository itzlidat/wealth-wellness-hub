import pandas as pd

SCENARIOS = {
    "Equities -15%": {"Equity": 0.85},
    "Crypto -30%": {"Crypto": 0.70},
    "Rates +1% (Bonds -5%)": {"Bonds": 0.95},
    "Property -10%": {"Private": 0.90},
}

def apply_scenario(df: pd.DataFrame, scenario_name: str) -> pd.DataFrame:
    if scenario_name not in SCENARIOS:
        return df.copy()

    multipliers = SCENARIOS[scenario_name]
    out = df.copy()
    out["scenario_multiplier"] = out["asset_class"].map(multipliers).fillna(1.0)
    out["value_sgd"] = out["value_sgd"] * out["scenario_multiplier"]
    return out