import pandas as pd

REQUIRED_COLS = [
    "asset_name",
    "asset_class",
    "value_sgd",
    "liquidity_days",
    "risk_tag",
    "source",
]

def load_portfolio(source) -> pd.DataFrame:
    df = pd.read_csv(source)
    df.columns = [c.strip() for c in df.columns]

    missing = [c for c in REQUIRED_COLS if c not in df.columns]
    if missing:
        raise ValueError(
            "CSV missing columns: " + ", ".join(missing) +
            ". Required: " + ", ".join(REQUIRED_COLS)
        )

    df["value_sgd"] = pd.to_numeric(df["value_sgd"], errors="coerce")
    df["liquidity_days"] = pd.to_numeric(df["liquidity_days"], errors="coerce")

    if df["value_sgd"].isna().any() or df["liquidity_days"].isna().any():
        raise ValueError("value_sgd and liquidity_days must be numeric (no blanks).")

    return df