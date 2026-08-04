from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from market.services.live_ingest import run_live_ingest

class Command(BaseCommand):
    help = 'Fetches live news from Finnhub for all companies belonging to a user'

    def add_arguments(self, parser):
        parser.add_argument('--user_id', type=int, help='The ID of the user to run live ingest for')

    def handle(self, *args, **options):
        user_id = options.get('user_id')
        if user_id:
            users = User.objects.filter(id=user_id)
        else:
            users = User.objects.all()

        for user in users:
            self.stdout.write(f"Running live ingest for user {user.username}...")
            created = run_live_ingest(user)
            self.stdout.write(self.style.SUCCESS(f"Successfully created {created} new NewsEvent records for {user.username}."))
