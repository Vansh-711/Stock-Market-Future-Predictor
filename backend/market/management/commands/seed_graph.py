"""
Loads market/seed_data/companies.json into Company and Relationship rows.
Safe to run multiple times -- uses get_or_create / update_or_create.

Usage: python manage.py seed_graph
"""
import json
import os
from django.core.management.base import BaseCommand
from market.models import Company, Relationship

SEED_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "seed_data", "companies.json")


class Command(BaseCommand):
    help = "Load seed companies and relationships from market/seed_data/companies.json"

    def handle(self, *args, **options):
        with open(SEED_PATH) as f:
            data = json.load(f)

        created_companies = 0
        for c in data["companies"]:
            _, created = Company.objects.update_or_create(
                symbol=c["symbol"],
                defaults={
                    "name": c["name"],
                    "sector": c["sector"],
                    "description": c.get("description", ""),
                },
            )
            if created:
                created_companies += 1

        created_relationships = 0
        skipped = 0
        for r in data["relationships"]:
            try:
                company = Company.objects.get(symbol=r["company"])
                related = Company.objects.get(symbol=r["related_company"])
            except Company.DoesNotExist:
                skipped += 1
                continue
            _, created = Relationship.objects.update_or_create(
                company=company,
                related_company=related,
                relationship_type=r["relationship_type"],
                defaults={"notes": r.get("notes", "")},
            )
            if created:
                created_relationships += 1

        self.stdout.write(self.style.SUCCESS(
            f"Companies: {created_companies} created / {len(data['companies'])} total. "
            f"Relationships: {created_relationships} created / {len(data['relationships'])} total"
            + (f" ({skipped} skipped -- missing company)" if skipped else "")
        ))
