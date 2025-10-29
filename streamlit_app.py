import streamlit as st

st.set_page_config(
    page_title="AI Transactions Control Hub",
    page_icon="??",
    layout="wide",
)

st.title("AI Transactions Control Hub")
st.markdown(
    """
Welcome to the agentic transactions control surface.  

* Use the Control Center to toggle the loop, sandbox, and synthetic agents.
* The Payments tab lets you exercise the Coinbase X402 rail or Visa Agent Toolkit.
* Activity, Analytics, and Ops tabs mirror the dashboard experience.

Use the web UI or call the Express API at `/api/...` for programmatic control.
"""
)
