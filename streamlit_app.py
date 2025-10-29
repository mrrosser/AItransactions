import os
from typing import Any, Dict, Optional

import requests
import streamlit as st


def _safe_secret(key: str) -> Optional[str]:
    try:
        secrets_obj = st.secrets  # type: ignore[attr-defined]
    except Exception:
        return None
    try:
        if hasattr(secrets_obj, "get"):
            return secrets_obj.get(key)  # type: ignore[attr-defined]
        return secrets_obj[key]  # type: ignore[index]
    except Exception:
        return None


DEFAULT_BASE_URL = "http://localhost:8787"
CONTROL_CENTER_URL = (
    os.environ.get("CONTROL_CENTER_URL")
    or _safe_secret("CONTROL_CENTER_URL")
    or DEFAULT_BASE_URL
).rstrip("/")
API_BASE_URL = (
    os.environ.get("API_BASE_URL")
    or _safe_secret("API_BASE_URL")
    or CONTROL_CENTER_URL
).rstrip("/")

st.set_page_config(
    page_title="AI Transactions Control Hub",
    page_icon="?",
    layout="wide",
)

SESSION = requests.Session()


@st.cache_data(ttl=5)
def fetch_json(path: str) -> Optional[Dict[str, Any]]:
    try:
        response = SESSION.get(f"{API_BASE_URL}{path}", timeout=5)
        response.raise_for_status()
        return response.json()
    except Exception as exc:  # noqa: BLE001
        st.warning(f"Unable to reach API ({path}): {exc}")
        return None


def post_json(path: str, payload: Dict[str, Any]) -> bool:
    try:
        response = SESSION.post(
            f"{API_BASE_URL}{path}", json=payload, timeout=8
        )
        response.raise_for_status()
        return True
    except Exception as exc:  # noqa: BLE001
        st.error(f"API error: {exc}")
        return False


def put_json(path: str, payload: Dict[str, Any]) -> bool:
    try:
        response = SESSION.put(
            f"{API_BASE_URL}{path}", json=payload, timeout=8
        )
        response.raise_for_status()
        return True
    except Exception as exc:  # noqa: BLE001
        st.error(f"API error: {exc}")
        return False


st.title("AI Transactions Control Hub")
st.link_button(
    "Launch Full Dashboard",
    CONTROL_CENTER_URL,
    type="primary",
    use_container_width=True,
)

(
    tab_welcome,
    tab_control,
    tab_payments,
    tab_activity,
    tab_mandates,
    tab_ops,
    tab_analytics,
    tab_inbound,
) = st.tabs(
    [
        "Welcome",
        "Control Center",
        "Payments",
        "Activity",
        "Mandates",
        "Operations",
        "Analytics",
        "Inbound",
    ]
)

health = fetch_json("/api/health")
api_online = bool(health)
if api_online:
    st.caption(f"Connected to Express API at {API_BASE_URL}.")
else:
    st.caption(
        "Set CONTROL_CENTER_URL / API_BASE_URL in secrets or env vars to point "
        "at your running Express API (default expects localhost:8787)."
    )

with tab_welcome:
    st.subheader("Welcome")
    st.markdown(
        """
Streamlit gives you a quick way to poke the agentic stack without opening the full UI.

* **Control Center** toggles the loop, sandbox mode, synthetic agents, and dry-run flag.
* **Payments** executes Coinbase X402 or Visa Agent Toolkit demo flows.
* **Activity / Mandates / Analytics / Inbound** mirror the data you see in the Express dashboard.
        """
    )
    if not api_online:
        st.error(
            "Express API not reachable. Set API_BASE_URL / CONTROL_CENTER_URL "
            "in Streamlit secrets or environment variables."
        )

with tab_control:
    st.subheader("Control Center")
    toggles = fetch_json("/api/admin/toggles") or {}
    with st.form("control_center"):
        col1, col2, col3 = st.columns(3)
        with col1:
            loop_enabled = st.checkbox(
                "Agent Loop",
                value=toggles.get("LOOP_ENABLED", False),
                help="Keeps diagnostics, synthetic agents, and UI smoke runs alive.",
                disabled=not api_online,
            )
            sandbox_mode = st.checkbox(
                "Sandbox Mode",
                value=toggles.get("SANDBOX_MODE", True),
                help="When on, card and crypto flows stay in simulation.",
                disabled=not api_online,
            )
        with col2:
            synthetic_agents = st.checkbox(
                "Synthetic Agents",
                value=toggles.get("SYNTHETIC_AGENTS", False),
                help="Generate deterministic load for analytics and alerts.",
                disabled=not api_online,
            )
            dry_run = st.checkbox(
                "Payments Dry Run",
                value=toggles.get("PAYMENTS_DRY_RUN", True),
                help="Leave on unless you are ready to hit real rails.",
                disabled=not api_online,
            )
        with col3:
            synthetic_rate = st.number_input(
                "Synthetic Rate (tx/min)",
                value=int(toggles.get("SYNTHETIC_RATE", "10")),
                min_value=1,
                max_value=10_000,
                disabled=not api_online,
            )

        submitted = st.form_submit_button(
            "Save toggles", use_container_width=True, disabled=not api_online
        )

    if submitted:
        payload = {
            "LOOP_ENABLED": loop_enabled,
            "SANDBOX_MODE": sandbox_mode,
            "SYNTHETIC_AGENTS": synthetic_agents,
            "SYNTHETIC_RATE": str(synthetic_rate),
        }
        if put_json("/api/admin/toggles", payload):
            st.success("Control center updated.")
            st.cache_data.clear()

    st.divider()
    st.subheader("Diagnostics")
    if st.button(
        "Run diagnostics (full E2E payment)",
        use_container_width=True,
        disabled=not api_online,
    ):
        if post_json("/api/admin/diagnostics", {}):
            st.success("Diagnostics triggered. Check Activity tab for new receipt.")

with tab_payments:
    st.subheader("Payments Sandbox")
    if not api_online:
        st.warning("API offline. Forms are disabled.")
    with st.form("payments_form"):
        col1, col2 = st.columns(2)
        with col1:
            amount_major = st.number_input(
                "Amount (USD)",
                min_value=0.01,
                value=50.00,
                step=0.50,
                disabled=not api_online,
            )
            destination = st.text_input(
                "Destination Handle",
                value="cb:demo",
                help="Coinbase handle, card token, or DID.",
                disabled=not api_online,
            )
        with col2:
            asset = st.selectbox(
                "Asset",
                options=["USDC", "USDT"],
                disabled=not api_online,
            )
            rail = st.selectbox(
                "Rail",
                options=["X402", "CARD"],
                format_func=lambda v: "Coinbase X402" if v == "X402" else "Visa Agent Toolkit",
                disabled=not api_online,
            )
            memo = st.text_input(
                "Memo (optional)",
                value="streamlit demo",
                disabled=not api_online,
            )

        send_payment = st.form_submit_button(
            "Send payment", use_container_width=True, disabled=not api_online
        )

    if send_payment:
        mandate = {
            "issuerDID": "did:example:streamlit",
            "subjectDID": "did:example:recipient",
            "scope": "TIP",
            "maxAmountMinor": 10_000_000,
            "currency": asset,
            "expiresAt": int(st.time_seconds()) + 3_600_000,
        }
        intent = {
            "amountMinor": int(amount_major * 100),
            "currency": asset,
            "memo": memo or None,
            "counterparty": destination,
            "rail": rail,
        }

        if post_json("/api/execute", {"mandate": mandate, "intent": intent}):
            st.success("Payment submitted. Check Activity tab for the result.")
            st.cache_data.clear()

with tab_activity:
    st.subheader("Ledger Activity")
    receipts = fetch_json("/api/receipts") or []
    if receipts:
        rows = []
        for receipt in receipts:
            rows.append(
                {
                    "ID": receipt.get("id"),
                    "Rail": receipt.get("rail"),
                    "Status": receipt.get("status"),
                    "Created": receipt.get("createdAt"),
                    "Memo": (receipt.get("payload") or {}).get("memo"),
                }
            )
        st.dataframe(rows, use_container_width=True, hide_index=True)
    else:
        st.info("No receipts yet.")

with tab_mandates:
    st.subheader("Mandate Templates")
    mandates = fetch_json("/api/mandates") or []

    with st.form("issue_mandate"):
        col1, col2 = st.columns(2)
        issuer = col1.text_input(
            "Issuer DID",
            value="did:example:issuer",
            disabled=not api_online,
        )
        subject = col2.text_input(
            "Subject DID",
            value="did:example:subject",
            disabled=not api_online,
        )
        scope = st.selectbox(
            "Scope",
            ["TIP", "PURCHASE", "SUBSCRIPTION"],
            disabled=not api_online,
        )
        max_amount_minor = st.number_input(
            "Max Amount (minor units)",
            value=1_000_000,
            min_value=1,
            disabled=not api_online,
        )
        currency = st.text_input(
            "Currency",
            value="USDC",
            disabled=not api_online,
        )
        create_mandate = st.form_submit_button(
            "Issue mandate", disabled=not api_online
        )

    if create_mandate:
        payload = {
            "issuerDID": issuer,
            "subjectDID": subject,
            "scope": scope,
            "maxAmountMinor": int(max_amount_minor),
            "currency": currency,
            "expiresAt": int(st.time_seconds()) + 86_400_000,
        }
        if post_json("/api/mandates", payload):
            st.success("Mandate issued.")
            st.cache_data.clear()

    st.divider()
    st.caption("Existing mandates")
    if mandates:
        for mandate in mandates:
            cols = st.columns([3, 2, 1])
            cols[0].write(
                f"**{mandate.get('scope')}** {mandate.get('issuer_did')} -> {mandate.get('subject_did')}"
            )
            cols[1].write(
                f"{mandate.get('currency')} max {mandate.get('max_amount_minor')} Â· Expires {mandate.get('expires_at')}"
            )
            if cols[2].button(
                "Revoke",
                key=f"revoke-{mandate.get('id')}",
                disabled=not api_online,
            ):
                if post_json(f"/api/mandates/{mandate.get('id')}", {}):
                    st.success("Mandate revoked")
                    st.cache_data.clear()
    else:
        st.info("No mandates issued yet.")

with tab_ops:
    st.subheader("Operations Overview")
    st.markdown(
        """
* **Sandbox** routes all rails into simulated flows while you iterate.
* **Synthetic agents** generate deterministic load for analytics and alerting.
* **Diagnostics** run a full mandate -> attestation -> rail flow; results appear in Activity.
"""
    )

with tab_analytics:
    st.subheader("Analytics Snapshot")
    window = st.number_input(
        "Window (minutes)", min_value=5, max_value=1440, value=60, step=5
    )
    if st.button("Refresh analytics", disabled=not api_online):
        analytics = fetch_json(f"/api/analytics?window={window}") or {}
        st.json(analytics)

with tab_inbound:
    st.subheader("Inbound Events")
    if st.button("Refresh inbound events", disabled=not api_online):
        st.cache_data.clear()
    inbound = fetch_json("/api/webhooks/inbound") or {}
    events = inbound.get("events", [])
    if events:
        st.json(events)
    else:
        st.info("No inbound events recorded.")

