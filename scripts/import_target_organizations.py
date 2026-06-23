import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path("/Users/ps/Documents/RFP Finder")
OUT = ROOT / "tmp" / "target_organizations.json"
OUT.parent.mkdir(parents=True, exist_ok=True)

ENDPOINT = "https://query.wikidata.org/sparql"

QUERIES = [
    ("Nonprofit", """
SELECT ?item ?itemLabel ?website ?countryLabel WHERE {
  ?item wdt:P856 ?website.
  ?item wdt:P31/wdt:P279* wd:Q163740.
  ?item wdt:P17 ?country.
  FILTER(?country IN (wd:Q30, wd:Q16, wd:Q145, wd:Q408, wd:Q55, wd:Q142, wd:Q183, wd:Q27, wd:Q28, wd:Q29, wd:Q38, wd:Q39, wd:Q34, wd:Q35, wd:Q36, wd:Q213, wd:Q218, wd:Q219, wd:Q221))
  OPTIONAL { ?item wdt:P17 ?country. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 500
"""),
    ("Foundation", """
SELECT ?item ?itemLabel ?website ?countryLabel WHERE {
  ?item wdt:P856 ?website.
  ?item wdt:P31/wdt:P279* wd:Q157031.
  ?item wdt:P17 ?country.
  FILTER(?country IN (wd:Q30, wd:Q16, wd:Q145, wd:Q408, wd:Q55, wd:Q142, wd:Q183, wd:Q27, wd:Q28, wd:Q29, wd:Q38, wd:Q39, wd:Q34, wd:Q35, wd:Q36, wd:Q213, wd:Q218, wd:Q219, wd:Q221))
  OPTIONAL { ?item wdt:P17 ?country. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 400
"""),
    ("Association", """
SELECT ?item ?itemLabel ?website ?countryLabel WHERE {
  ?item wdt:P856 ?website.
  ?item wdt:P31/wdt:P279* wd:Q48204.
  ?item wdt:P17 ?country.
  FILTER(?country IN (wd:Q30, wd:Q16, wd:Q145, wd:Q408, wd:Q55, wd:Q142, wd:Q183, wd:Q27, wd:Q28, wd:Q29, wd:Q38, wd:Q39, wd:Q34, wd:Q35, wd:Q36, wd:Q213, wd:Q218, wd:Q219, wd:Q221))
  OPTIONAL { ?item wdt:P17 ?country. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 400
"""),
    ("Museum", """
SELECT ?item ?itemLabel ?website ?countryLabel WHERE {
  ?item wdt:P856 ?website.
  ?item wdt:P31/wdt:P279* wd:Q33506.
  ?item wdt:P17 ?country.
  FILTER(?country IN (wd:Q30, wd:Q16, wd:Q145, wd:Q408, wd:Q55, wd:Q142, wd:Q183, wd:Q27, wd:Q28, wd:Q29, wd:Q38, wd:Q39, wd:Q34, wd:Q35, wd:Q36, wd:Q213, wd:Q218, wd:Q219, wd:Q221))
  OPTIONAL { ?item wdt:P17 ?country. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 300
"""),
]

BLOCKED_PARTS = [
    ".gov", "government", "municipal", "schooldistrict", "publicschools", "facebook.com",
    "twitter.com", "x.com", "instagram.com", "linkedin.com", "youtube.com", "wikimedia.org",
    "wikipedia.org", "parliament", "parlament", "senate", "bundestag", "congress", "police",
    "military", "army", "navy", "airforce", "ministry", "ministerio", "europa.eu", ".edu",
    "k12", "schools", "school-", "university", "college", "council", "county", "cityof",
    "city-of", "kommune", "gemeinde", "admin.ch",
]

PREFERRED_TLDS = (
    ".org", ".com", ".net", ".foundation", ".ngo", ".charity", ".museum", ".org.uk",
    ".org.au", ".org.nz", ".org.za", ".ca", ".co.uk", ".com.au", ".eu",
)


def fetch(category, sparql):
    params = urllib.parse.urlencode({"query": sparql, "format": "json"})
    req = urllib.request.Request(
        ENDPOINT + "?" + params,
        headers={
            "Accept": "application/sparql-results+json",
            "User-Agent": "DimasoRfpRadar/1.0 target organization research",
        },
    )
    with urllib.request.urlopen(req, timeout=45) as response:
        data = json.load(response)
    rows = []
    for binding in data["results"]["bindings"]:
        name = binding.get("itemLabel", {}).get("value", "").strip()
        website = binding.get("website", {}).get("value", "").strip()
        country = binding.get("countryLabel", {}).get("value", "").strip() or None
        if not name or name.startswith("Q") or not website.startswith("http"):
            continue
        lowered = website.lower().replace("www.", "")
        if any(part in lowered for part in BLOCKED_PARTS):
            continue
        hostname = urllib.parse.urlparse(website).hostname or ""
        if not hostname.endswith(PREFERRED_TLDS):
            continue
        rows.append({"name": name, "website": website.rstrip("/"), "category": category, "country": country})
    return rows


def main():
    all_rows = []
    seen = set()
    for category, query in QUERIES:
        try:
            rows = fetch(category, query)
            print(category, len(rows))
            for row in rows:
                key = row["website"].lower().replace("https://www.", "https://").replace("http://www.", "http://")
                if key in seen:
                    continue
                seen.add(key)
                all_rows.append(row)
            time.sleep(1)
        except Exception as error:
            print("ERROR", category, error)
    category_rank = {"Foundation": 0, "Association": 1, "Museum": 2, "Nonprofit": 3}
    country_rank = {"United States": 0, "Canada": 1, "United Kingdom": 2, "Australia": 3}
    low_priority_terms = ("church", "diocese", "eparchy", "abbey", "football", "sport", "soccer", "racing")
    all_rows.sort(key=lambda row: (
        category_rank.get(row["category"], 9),
        country_rank.get(row.get("country"), 5),
        any(term in row["name"].lower() for term in low_priority_terms),
        row["name"].lower(),
    ))
    OUT.write_text(json.dumps(all_rows[:500], indent=2), encoding="utf-8")
    print(OUT, len(all_rows[:500]))


if __name__ == "__main__":
    main()
