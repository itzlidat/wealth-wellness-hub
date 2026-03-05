import streamlit as st
import pandas as pd

from src.scoring import diversification_score, liquidity_score, resilience_score_from_worst_drop
from src.scenarios import SCENARIOS, apply_scenario
from src.recommend import generate_alerts, generate_recommendations

st.set_page_config(page_title="Wealth Wellness Hub", layout="wide")
st.title("Wealth Wellness Hub")
st.caption("Demo/Education only — not financial advice.")

# ---------- Sidebar: Import ----------
st.sidebar.header("Import Portfolio")
uploaded = st.sidebar.file_uploader("Upload CSV", type=["csv"])
sample = st.sidebar.selectbox("Or load a sample", ["(none)", "crypto_heavy", "balanced", "property_heavy"])

df_base = None
if uploaded:
    df_base = pd.read_csv(uploaded)
elif sample != "(none)":
    df_base = pd.read_csv(f"data/samples/{sample}.csv")

if df_base is None:
    st.info("Upload a CSV or load a sample to begin.")
    st.stop()

# ---------- Sidebar: Scenarios ----------
st.sidebar.header("Scenario Lab")
scenario_name = st.sidebar.selectbox("Apply a scenario", ["(none)"] + list(SCENARIOS.keys()))
reset = st.sidebar.button("Reset scenario")

if reset:
    scenario_name = "(none)"

df = df_base.copy()
if scenario_name != "(none)":
    df = apply_scenario(df, scenario_name)

# ---------- Core Metrics ----------
base_total = float(df_base["value_sgd"].sum())
total = float(df["value_sgd"].sum())
delta = total - base_total

st.metric("Net Worth (SGD)", f"{total:,.0f}", delta=f"{delta:+,.0f}" if scenario_name != "(none)" else None)

# Allocation + preview
c1, c2 = st.columns([1.2, 1.0])

with c1:
    st.subheader("Allocation (by asset class)")
    alloc = df.groupby("asset_class")["value_sgd"].sum().sort_values(ascending=False)
    st.bar_chart(alloc)

with c2:
    st.subheader("Preview")
    st.dataframe(df, use_container_width=True, height=260)

# ---------- Scenario impact: Top drivers ----------
if scenario_name != "(none)":
    df_after = apply_scenario(df_base, scenario_name)

    impact = df_base[["asset_name", "asset_class", "value_sgd"]].copy()
    impact = impact.rename(columns={"value_sgd": "before_sgd"})
    impact["after_sgd"] = df_after["value_sgd"].values
    impact["change_sgd"] = impact["after_sgd"] - impact["before_sgd"]  # negative = loss

    top_losses = impact.sort_values("change_sgd").head(3)

    st.subheader("Scenario Impact (Top Drivers)")
    st.caption(f"Applied: {scenario_name}")

    for _, r in top_losses.iterrows():
        loss = -r["change_sgd"]
        st.write(f"- **{r['asset_name']}** ({r['asset_class']}): **-{loss:,.0f} SGD**")

# ---------- Scores ----------
div = diversification_score(df)
liq = liquidity_score(df)

# Resilience: compute worst-case drop across all scenario options (using base df)
base_total = float(df_base["value_sgd"].sum())
worst_drop = 0.0
for s in SCENARIOS.keys():
    tmp = apply_scenario(df_base, s)
    new_total = float(tmp["value_sgd"].sum())
    drop_pct = 100.0 * max(0.0, (base_total - new_total) / base_total) if base_total > 0 else 0.0
    worst_drop = max(worst_drop, drop_pct)
res = resilience_score_from_worst_drop(worst_drop)

s1, s2, s3 = st.columns(3)
s1.metric("Diversification Score", f"{div:.0f}/100")
s2.metric("Liquidity Score", f"{liq:.0f}/100")
s3.metric("Resilience Score", f"{res:.0f}/100", help=f"Worst scenario drop: {worst_drop:.1f}%")

# ---------- Alerts + Recommendations ----------
a1, a2 = st.columns([1.0, 1.2])

with a1:
    st.subheader("Alerts")
    alerts = generate_alerts(df)
    if alerts:
        for x in alerts:
            st.warning(x)
    else:
        st.success("No major red flags detected.")

with a2:
    st.subheader("Recommendations")
    recs = generate_recommendations(df)
    for r in recs:
        st.markdown(f"**Action:** {r['action']}\n\n- Why: {r['why']}\n")