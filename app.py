import streamlit as st
import pandas as pd

st.set_page_config(page_title="Wealth Wellness Hub", layout="wide")
st.title("Wealth Wellness Hub")
st.caption("Demo/Education only — not financial advice.")

st.sidebar.header("Import Portfolio")
uploaded = st.sidebar.file_uploader("Upload CSV", type=["csv"])

sample = st.sidebar.selectbox("Or load a sample", ["(none)", "crypto_heavy", "balanced", "property_heavy"])

df = None
if uploaded:
    df = pd.read_csv(uploaded)
elif sample != "(none)":
    df = pd.read_csv(f"data/samples/{sample}.csv")

if df is None:
    st.info("Upload a CSV or load a sample to begin.")
    st.stop()

st.subheader("Preview")
st.dataframe(df, use_container_width=True)

total = df["value_sgd"].sum()
st.metric("Net Worth (SGD)", f"{total:,.0f}")

st.subheader("Allocation (by asset class)")
alloc = df.groupby("asset_class")["value_sgd"].sum().reset_index()
st.bar_chart(alloc.set_index("asset_class"))