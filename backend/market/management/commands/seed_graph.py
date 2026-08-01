"""
Loads market/seed_data/companies.json into Company and Relationship rows.
Safe to run multiple times -- uses get_or_create / update_or_create.

Usage: python manage.py seed_graph
"""
from django.core.management.base import BaseCommand
from market.services.graph import seed_graph


class Command(BaseCommand):
    help = "Load seed companies and relationships from market/seed_data/companies.json"

    def handle(self, *args, **options):
        summary = seed_graph()

        self.stdout.write(self.style.SUCCESS(
            f"Companies: {summary['companies_created']} created / {summary['companies_total']} total. "
            f"Relationships: {summary['relationships_created']} created / {summary['relationships_total']} total"
            + (f" ({summary['relationships_skipped']} skipped -- missing company)" if summary['relationships_skipped'] else "")
        ))
