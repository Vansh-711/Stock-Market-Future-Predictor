"""
Thin wrapper around yfinance for historical daily prices, with an in-memory
+ on-disk cache so `run_backtest` doesn't re-download the same ticker
history on every run.
"""
import os
import pandas as pd

_CACHE_DIR = os.path.join(os.path.dirname(__file__), "_price_cache")
os.makedirs(_CACHE_DIR, exist_ok=True)
_memory_cache = {}


def _normalize_index(df):
    """Force a tz-naive DatetimeIndex (CSV cache often stores tz offsets as strings)."""
    if df is None or df.empty:
        return df
    out = df.copy()
    idx = pd.to_datetime(out.index, utc=True, errors="coerce")
    idx = idx.tz_convert(None)
    out.index = idx
    out = out.loc[~out.index.isna()].sort_index()
    return out


def _is_stale(df):
    """
    Returns True if the most recent data point is older than 2 calendar days
    (covers weekends: Friday data is still fresh on Sunday).
    """
    if df is None or df.empty:
        return True
    last_date = df.index[-1]
    age = (pd.Timestamp.now() - last_date).days
    return age > 2


def _load_history(symbol):
    if symbol in _memory_cache:
        df = _memory_cache[symbol]
        # Even if in memory, check staleness for live-path freshness
        if not _is_stale(df):
            return df
        # Stale in memory — fall through to re-fetch

    cache_path = os.path.join(_CACHE_DIR, f"{symbol}.csv")
    if os.path.exists(cache_path):
        df = pd.read_csv(cache_path, index_col=0, parse_dates=True)
        df = _normalize_index(df)
        if not _is_stale(df):
            _memory_cache[symbol] = df
            return df
        # Cache file exists but is stale — re-fetch below

    import yfinance as yf
    # Use 5y instead of 2y to ensure we cover historical dataset events
    df = yf.Ticker(symbol).history(period="5y")
    if df.empty:
        df = pd.DataFrame()
    else:
        df = _normalize_index(df)
        df.to_csv(cache_path)

    _memory_cache[symbol] = df
    return df


def get_price_change(symbol, from_date, window_days):
    """
    Returns % price change of `symbol` from the trading day of `from_date`
    to `window_days` trading days later. Returns None if data unavailable.
    """
    df = _load_history(symbol)
    if df.empty:
        return None

    target_date = pd.Timestamp(from_date)
    if target_date.tzinfo is not None:
        target_date = target_date.tz_convert("UTC").tz_localize(None)
    target_date = target_date.normalize()

    on_or_after = df.index[df.index >= target_date]
    if len(on_or_after) == 0:
        return None
        
    actual_start_date = on_or_after[0]
    # CRITICAL FIX: If the closest available trading day is more than 7 days after the event, 
    # it means we don't actually have data for this event date. Reject it.
    if (actual_start_date - target_date).days > 7:
        return None
        
    start_idx = df.index.get_loc(actual_start_date)
    if isinstance(start_idx, slice):
        start_idx = start_idx.start

    end_idx = start_idx + window_days
    if end_idx >= len(df):
        return None

    start_price = float(df.iloc[start_idx]["Close"])
    end_price = float(df.iloc[end_idx]["Close"])
    if start_price == 0:
        return None

    return ((end_price - start_price) / start_price) * 100
