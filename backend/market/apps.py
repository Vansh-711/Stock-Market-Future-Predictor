import os
from django.apps import AppConfig


class MarketConfig(AppConfig):
    name = 'market'

    def ready(self):
        # Only start the scheduler if explicitly opted in AND not in the reloader child
        if os.environ.get("ENABLE_LIVE_SCHEDULER") == "1":
            # Django's runserver runs ready() twice (reloader + main). Only start once.
            import sys
            if os.environ.get("RUN_MAIN") == "true" or "runserver" not in sys.argv:
                # Background scheduler is disabled by default to prevent API limit wasting.
                # from market.services.scheduler import start_scheduler
                # start_scheduler(interval_minutes=15)
                pass
