Quick check before Layer 6:

Watermark mechanism: What will the frontend use to track "already seen" live chains between polls — a stored last_seen_id (highest chain ID processed so far) or a last_seen_timestamp? Either works, but there needs to be an explicit one, so the new-live-chains poll queries something like GeneratedChain.objects.filter(source='live', id__gt=last_seen_id) rather than re-fetching and re-toasting the same rows every cycle.
Where does the watermark live? In-memory React state (resets on page refresh — meaning a refresh could re-trigger toasts for chains already seen) or does it persist anywhere (e.g., a query param, localStorage-equivalent)? A reset-on-refresh behavior is probably fine for a POC — just confirm that's the intended behavior and not an oversight.
Independence from the existing poll: Will this new 30-60s "check for live chains" poll run as a completely separate setInterval/hook from the existing 1.2s pipeline-status poll, so a manual batch run and background live-checking can happen concurrently without interfering with each other?

Once confirmed, go ahead and proceed to Layer 6.