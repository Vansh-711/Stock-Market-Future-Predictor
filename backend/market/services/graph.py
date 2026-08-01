import json
from pathlib import Path

from market.models import Company, Relationship


SEED_PATH = Path(__file__).resolve().parent.parent / "seed_data" / "companies.json"


def seed_graph():
    """Idempotently load the relationship graph and return a useful summary."""
    with SEED_PATH.open() as seed_file:
        data = json.load(seed_file)

    created_companies = 0
    for company_data in data["companies"]:
        _, created = Company.objects.update_or_create(
            symbol=company_data["symbol"],
            defaults={
                "name": company_data["name"],
                "sector": company_data["sector"],
                "description": company_data.get("description", ""),
            },
        )
        created_companies += int(created)

    created_relationships = 0
    skipped_relationships = 0
    for relationship_data in data["relationships"]:
        try:
            company = Company.objects.get(symbol=relationship_data["company"])
            related_company = Company.objects.get(symbol=relationship_data["related_company"])
        except Company.DoesNotExist:
            skipped_relationships += 1
            continue
        _, created = Relationship.objects.update_or_create(
            company=company,
            related_company=related_company,
            relationship_type=relationship_data["relationship_type"],
            defaults={"notes": relationship_data.get("notes", "")},
        )
        created_relationships += int(created)

    return {
        "companies_total": len(data["companies"]),
        "relationships_total": len(data["relationships"]),
        "companies_created": created_companies,
        "relationships_created": created_relationships,
        "relationships_skipped": skipped_relationships,
    }
