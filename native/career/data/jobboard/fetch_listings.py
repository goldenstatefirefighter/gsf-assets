#!/usr/bin/env python
"""
Golden State Firefighter -- Live Job Board aggregator.

WHAT THIS DOES
  Pulls OPEN California firefighter recruitments from the NEOGOV / GovernmentJobs
  RSS job feed (the single most practical machine-readable source; see
  Commercialization/New Features 2026-07/JobBoard_Redesign.md for the full research).

  Each NEOGOV-hosted agency exposes a public RSS 2.0 feed at:
      https://www.governmentjobs.com/SearchEngine/JobsFeed?agency=<slug>
  The feed lists ALL of that agency's open postings, with a NEOGOV namespace that
  carries structured OPEN and CLOSE dates. We fetch each configured agency feed,
  keep only firefighter-relevant items, and write them to listings.json for the
  /jobs-v2 widget to render in the "Open now" zone.

  VERIFIED 2026-07-09: feed is live and returns RSS 2.0. Confirmed fields per <item>:
    title, link, pubDate,
    joblisting:advertiseFromDate      -> open date   e.g. "Thu, 09 Jul 2026 00:00:00:0"
    joblisting:advertiseToDateTime    -> close date  e.g. "Thu, 23 Jul 2026 23:59:00:0"
    joblisting:department, joblisting:categories, joblisting:jobId, salary fields
  Note the non-standard trailing ":0" (milliseconds) on the date strings -- parsed below.

WHAT THIS IS NOT
  Not every CA fire department posts to GovernmentJobs. Known gaps and how they are
  handled (see the research doc for the full table):
    - CalOpps.org agencies (some Bay Area / Sacramento depts) -- no public RSS found.
      Fall back to the static directory for these.
    - National Testing Network (Oakland, Santa Clara County) -- portal, no open feed.
    - CAL FIRE / CalCareers (state + contract counties) -- separate state system.
    - Departments on their own sites (LAFD joinlafd.org, etc.).
  For those, the /jobs-v2 page still shows the static "Regular cadence" directory
  from ca-fire-departments.json, so nothing is lost versus the old link-out tool.

USAGE
    python fetch_listings.py            # fetch all agencies, write listings.json
    python fetch_listings.py --sample   # write the bundled sample only (no network)
    python fetch_listings.py --dry-run  # fetch + print, do not overwrite listings.json

REFRESH CADENCE
  Run once daily via Task Scheduler (mirrors the portfolio "daily scrape -> JSON ->
  widget" pattern). NEOGOV sets ttl=360 (6h) on the feed, so daily is polite and fresh
  enough for recruitments that stay open days-to-weeks.

POLITENESS / TOS
  One GET per agency per run, 2s apart, honest User-Agent. This reads the same public
  RSS the site offers for syndication. Do not lower the delay or add many agencies to a
  tight loop. Always keep the "verify against the department" note on the live page --
  postings change and feeds can lag.
"""
import argparse
import datetime as dt
import html as html_lib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(HERE, "listings.json")
HEALTH_PATH = os.path.join(HERE, "jobboard_health.json")
NS = {"joblisting": "http://www.neogov.com/namespaces/JobListing"}

# ---------------------------------------------------------------------------
# Agency map: display name/region -> NEOGOV/GovernmentJobs "agency" slug.
# The slug is the last path part of governmentjobs.com/careers/<slug>.
# Seeded from ca-fire-departments.json careers_url notes; confirm each slug once
# (open governmentjobs.com/careers/<slug> in a browser) and add more over time.
# Only agencies that actually post to GovernmentJobs belong here.
# ---------------------------------------------------------------------------
#
# ALL slugs below were confirmed 2026-07-09 to return a real agency channel from
# JobsFeed?agency=<slug> (correct California agency name in <channel><title>). A
# wrong slug returns HTTP 200 with NO <channel>, so a bad slug simply yields zero
# listings rather than bad data; still, keep only confirmed slugs here.
#
# Gotchas found while confirming (do NOT re-add these guesses):
#   - "stocktonca", "riversideca", "venturacounty" return NO channel. Stockton and
#     Riverside City were not resolvable on GovernmentJobs; Ventura COUNTY's slug is
#     "ventura" (not "venturacounty"). Several cities are served by a county/JPA
#     fire agency and do NOT hire their own firefighters (e.g. Santa Ana -> OCFA,
#     Buena Park -> OCFA, Dublin -> Alameda County Fire, Norwalk/Compton -> LA County
#     Fire), so they are intentionally excluded even though their city feed resolves.
#   - Some short slugs collide with same-named cities in other states (auburn -> WA,
#     claremont -> MN, roseville -> MN, fremont -> IA). Confirm the channel says CA.
#
AGENCIES = [
    # (department display name, region, governmentjobs slug)

    # --- Bay Area ---
    ("Oakland Fire Department", "Bay Area", "oaklandca"),
    ("San Jose Fire Department", "Bay Area", "sanjoseca"),
    ("Berkeley Fire Department", "Bay Area", "berkeley"),
    ("Richmond Fire Department", "Bay Area", "richmondca"),
    ("Fairfield Fire Department", "Bay Area", "fairfield"),
    ("Vallejo Fire Department", "Bay Area", "vallejo"),
    ("Milpitas Fire Department", "Bay Area", "milpitas"),
    ("Mountain View Fire Department", "Bay Area", "mountainview"),
    ("Petaluma Fire Department", "Bay Area", "petaluma"),
    ("Santa Rosa Fire Department", "Bay Area", "srcity"),
    ("Marin County Fire Department", "Bay Area", "marincounty"),

    # --- Sacramento / Central Valley ---
    ("Sacramento City Fire Department", "Sacramento/Central Valley", "saccity"),
    ("Clovis Fire Department", "Sacramento/Central Valley", "clovisca"),
    ("Fresno Fire Department", "Sacramento/Central Valley", "cityoffresno"),
    ("Modesto Fire Department", "Sacramento/Central Valley", "modesto"),
    ("Tracy Fire Department", "Sacramento/Central Valley", "tracyca"),
    ("Turlock Fire Department", "Sacramento/Central Valley", "turlock"),
    ("Visalia Fire Department", "Sacramento/Central Valley", "visalia"),
    ("Madera Fire Department", "Sacramento/Central Valley", "madera"),
    ("Lodi Fire Department", "Sacramento/Central Valley", "lodi"),
    ("Folsom Fire Department", "Sacramento/Central Valley", "folsom"),
    ("West Sacramento Fire Department", "Sacramento/Central Valley", "westsacramento"),
    ("Hanford Fire Department", "Sacramento/Central Valley", "hanfordca"),
    ("Yuba City Fire Department", "Sacramento/Central Valley", "yubacity"),
    ("Bakersfield Fire Department", "Sacramento/Central Valley", "bakersfield"),
    ("Davis Fire Department", "Sacramento/Central Valley", "davis"),

    # --- Los Angeles / SoCal ---
    ("Los Angeles Fire Department (lafd)", "Los Angeles/SoCal", "lacity"),
    ("Los Angeles County Fire Department", "Los Angeles/SoCal", "lacounty"),
    ("Anaheim Fire & Rescue", "Los Angeles/SoCal", "anaheim"),
    ("Long Beach Fire Department", "Los Angeles/SoCal", "longbeach"),
    ("Glendale Fire Department", "Los Angeles/SoCal", "glendaleca"),
    ("Burbank Fire Department", "Los Angeles/SoCal", "burbankca"),
    ("Beverly Hills Fire Department", "Los Angeles/SoCal", "beverlyhills"),
    ("Santa Monica Fire Department", "Los Angeles/SoCal", "santamonica"),
    ("Torrance Fire Department", "Los Angeles/SoCal", "torranceca"),
    ("Pomona Fire Department", "Los Angeles/SoCal", "pomona"),
    ("West Covina Fire Department", "Los Angeles/SoCal", "westcovina"),
    ("Whittier Fire Department", "Los Angeles/SoCal", "whittier"),
    ("Monrovia Fire Department", "Los Angeles/SoCal", "monrovia"),
    ("Montebello Fire Department", "Los Angeles/SoCal", "montebello"),
    ("Monterey Park Fire Department", "Los Angeles/SoCal", "montereypark"),
    ("Costa Mesa Fire & Rescue", "Los Angeles/SoCal", "costamesa"),
    ("Fullerton Fire Department", "Los Angeles/SoCal", "fullerton"),
    ("Brea Fire Department", "Los Angeles/SoCal", "brea"),
    ("Placentia Fire & Life Safety", "Los Angeles/SoCal", "placentia"),
    ("Huntington Beach Fire Department", "Los Angeles/SoCal", "huntingtonbeach"),
    ("El Segundo Fire Department", "Los Angeles/SoCal", "elsegundo"),

    # --- Central Coast ---
    ("Santa Barbara City Fire Department", "Central Coast", "santabarbara"),
    ("Ventura County Fire Department", "Central Coast", "ventura"),
    ("Salinas Fire Department", "Central Coast", "salinas"),
    ("Santa Maria Fire Department", "Central Coast", "santamaria"),
    ("Watsonville Fire Department", "Central Coast", "watsonville"),
    ("Atascadero Fire Department", "Central Coast", "atascadero"),

    # --- San Diego ---
    ("Chula Vista Fire Department", "San Diego", "chulavista"),
    ("Escondido Fire Department", "San Diego", "escondido"),
    ("Poway Fire Department", "San Diego", "poway"),
    ("Coronado Fire Department", "San Diego", "coronado"),
    ("Oceanside Fire Department", "San Diego", "oceansideca"),
    ("San Marcos Fire Department", "San Diego", "sanmarcos"),
    ("Santee Fire Department", "San Diego", "santee"),

    # --- Inland Empire / Imperial ---
    ("Ontario Fire Department", "Inland Empire", "ontario"),
    ("San Bernardino County Fire", "Inland Empire", "sanbernardino"),
    ("Rialto Fire Department", "Inland Empire", "rialto"),
    ("Redlands Fire Department", "Inland Empire", "redlands"),
    ("Palm Springs Fire Department", "Inland Empire", "palmsprings"),
    ("Murrieta Fire & Rescue", "Inland Empire", "murrieta"),
    ("El Centro Fire Department", "Imperial Valley", "elcentro"),
    # --- added 2026-08-13: slugs taken from each department's OWN careers page during the
    # directory build, then validated against the live feed (159/162 returned a real CA
    # channel; 3 were dropped). NOT guessed from city names - that method was 15/16 wrong.
    ("Alameda Fire Department", "Bay Area", "alamedaca"),
    ("American Canyon Fire Protection District", "Bay Area", "amcanfire"),
    ("Benicia Fire Department", "Bay Area", "benicia"),
    ("Central Marin Fire Authority", "Bay Area", "centralmarinpolice"),
    ("City of Albany Fire Department", "Bay Area", "albanyca"),
    ("City of Napa Fire Department", "Bay Area", "napacity"),
    ("Contra Costa County Fire Protection District", "Bay Area", "contracosta"),
    ("East Bay Regional Park District", "Bay Area", "ebparks"),
    ("El Cerrito Fire Department", "Bay Area", "elcerrito"),
    ("Fremont Fire Department", "Bay Area", "fremontca"),
    ("Gilroy Fire Department", "Bay Area", "cityofgilroy"),
    ("Gold Ridge Fire Protection District", "Bay Area", "goldridgefire"),
    ("Hayward Fire Department", "Bay Area", "haywardca"),
    ("Healdsburg Fire Department", "Bay Area", "healdsburgca"),
    ("Livermore- Pleasanton Fire Department", "Bay Area", "pleasanton"),
    ("Menlo Park Fire Protection District", "Bay Area", "menlofire"),
    ("Moraga Orinda Fire Protection District", "Bay Area", "mofd"),
    ("Novato Fire Protection District", "Bay Area", "novatofire"),
    ("Palo Alto Fire Department", "Bay Area", "paloaltoca"),
    ("Rohnert Park Dps", "Bay Area", "rohnertpark"),
    ("Ross Valley Fire Department", "Bay Area", "townofsananselmo"),
    ("San Ramon Valley Fire Protection District", "Bay Area", "srvfire"),
    ("Santa Clara County Fire Department", "Bay Area", "sccfd"),
    ("Santa Clara Fire Department", "Bay Area", "cityofsantaclaraca"),
    # NOTE: sccfd and cityofsantaclaraca are two DIFFERENT agencies (county fire vs city
    # fire) -- not a case-duplicate, do not remove either. See JD-12 in the 2026-09-16 audit.
    ("Suisun City Fire Department", "Bay Area", "suisun"),
    ("Sunnyvale Dps Fire Department", "Bay Area", "sunnyvale"),
    ("Vacaville Fire Department", "Bay Area", "vacaville"),
    ("Five Cities Fire Authority", "Central Coast", "arroyogrande"),
    ("Hollister Fire Department", "Central Coast", "hollisterca"),
    ("Lompoc Fire Department", "Central Coast", "lompocca"),
    ("Marina Fire Department", "Central Coast", "cityofmarina"),
    ("Montecito Fire Protection District", "Central Coast", "montecitofire"),
    ("Monterey Fire Department", "Central Coast", "montereyca"),
    ("Oxnard Fire Department", "Central Coast", "cityofoxnard"),
    ("Paso Robles Des", "Central Coast", "prcity"),
    ("San Luis Obispo City Fire Department", "Central Coast", "slobispo"),
    ("Santa Barbara County Fire Department", "Central Coast", "sbcounty"),
    ("Santa Cruz Fire Department", "Central Coast", "santacruz"),
    # "Watsonville"/"watsonville" case-duplicate (added 2026-08-13) removed 2026-09-16 --
    # see the original entry under Central Coast above and JD-05/JD-13 in the audit.
    ("Apple Valley Fire Protection District", "Inland Empire", "avfpd"),
    ("Banning Fire Department", "Inland Empire", "banningca"),
    ("Barstow Fire Protection District", "Inland Empire", "barstowca"),
    ("Cathedral City Fire Department", "Inland Empire", "cathedralcityca"),
    ("Chino Valley Fire Department", "Inland Empire", "chinovalleyfire"),
    ("Colton Fire Department", "Inland Empire", "coltonca"),
    ("Corona Fire Department", "Inland Empire", "coronaca"),
    ("Hemet Fire Department", "Inland Empire", "cityofhemet"),
    ("Loma Linda Fire Department", "Inland Empire", "lomalinda"),
    ("Montclair Fire Department", "Inland Empire", "cityofmontclair"),
    ("Rancho Cucamonga Fire Department", "Inland Empire", "cityofrc"),
    ("Riverside Fire Department", "Inland Empire", "cityofriversideca"),
    ("Victorville Fire Department", "Inland Empire", "victorvilleca"),
    ("Alhambra Fire Department", "Los Angeles/SoCal", "cityofalhambra"),
    ("Arcadia Fire Department", "Los Angeles/SoCal", "arcadiaca"),
    ("City of Manhattan Fire Department", "Los Angeles/SoCal", "citymb"),
    ("Compton Fire Department", "Los Angeles/SoCal", "compton"),
    ("Culver City Fire Department", "Los Angeles/SoCal", "culvercity"),
    ("Fountain Valley Fire Department", "Los Angeles/SoCal", "fountainvalley"),
    ("La Verne Fire Department", "Los Angeles/SoCal", "cityoflaverne"),
    ("Laguna Beach Fire Department", "Los Angeles/SoCal", "lagunabeach"),
    ("Newport Beach Fire Department", "Los Angeles/SoCal", "newportbeach"),
    ("Orange City Fire Department", "Los Angeles/SoCal", "orange"),
    ("Orange County Fire Authority", "Los Angeles/SoCal", "ocfa"),
    # "Placentia"/"placentia" case-duplicate (added 2026-08-13, mangled name "Placentia Fls")
    # removed 2026-09-16 -- see the original correctly-named entry above and JD-05/JD-13.
    ("Redondo Beach Fire Department", "Los Angeles/SoCal", "redondobch"),
    ("San Gabriel Fire Department", "Los Angeles/SoCal", "sangabrielcity"),
    ("San Marino Fire Department", "Los Angeles/SoCal", "sanmarinoca"),
    ("Santa Fe Springs Fire Department", "Los Angeles/SoCal", "santafesprings"),
    ("Sierra Madre Fire Department", "Los Angeles/SoCal", "sierramadre"),
    ("South Pasadena Fire Department", "Los Angeles/SoCal", "spasadenaca"),
    ("City of Chico Fire Department", "Northern California", "chico"),
    ("Oroville Fire Department", "Northern California", "orovilleca"),
    ("Redding Fire Department", "Northern California", "reddingca"),
    ("Ukiah Valley Fire Authority", "Northern California", "cityofukiah"),
    ("Alpine Meadows Fire Protection District / North Tahoe Fire Protection", "Sacramento/Central Valley", "ntfire"),
    ("Atwater Fire Department", "Sacramento/Central Valley", "atwater"),
    ("City of Merced Fire Department", "Sacramento/Central Valley", "mercedca"),
    ("Coalinga Fire Department", "Sacramento/Central Valley", "coalinga"),
    ("Cosumnes CSD Fire Department", "Sacramento/Central Valley", "cosumnescsd"),
    ("Dinuba Fire Department", "Sacramento/Central Valley", "dinuba"),
    ("El Dorado Hills Fire Department", "Sacramento/Central Valley", "edhfire"),
    ("Kings County Fire Department", "Sacramento/Central Valley", "kingscounty"),
    ("Lindsay Fire Department", "Sacramento/Central Valley", "lindsayca"),
    ("Los Banos Fire Department", "Sacramento/Central Valley", "losbanos"),
    ("Manteca Fire Department", "Sacramento/Central Valley", "manteca"),
    ("Porterville Fire Department", "Sacramento/Central Valley", "porterville"),
    ("Reedley Fire Department", "Sacramento/Central Valley", "reedley"),
    ("Rocklin Fire Department", "Sacramento/Central Valley", "rocklinca"),
    ("Roseville Fire Department", "Sacramento/Central Valley", "rosevilleca"),
    ("S Lake Tahoe Fire Rescue", "Sacramento/Central Valley", "slaketahoe"),
    ("Sacramento Metropolitan Fire Department", "Sacramento/Central Valley", "smfd"),
    ("Sanger Fire Department", "Sacramento/Central Valley", "sanger"),
    ("South Placer Fire Protection District", "Sacramento/Central Valley", "southplacerfire"),
    ("Stockton Fire Department", "Sacramento/Central Valley", "stockton"),
    ("Sutter County Fire Department", "Sacramento/Central Valley", "suttercounty"),
    ("Tulare Fire Department", "Sacramento/Central Valley", "tulareca"),
    ("Brawley Fire Department", "San Diego", "brawleyca"),
    ("Carlsbad Fire Department", "San Diego", "carlsbad"),
    ("Del Mar Fire Department", "San Diego", "delmarca"),
    ("El Cajon Fire Department", "San Diego", "elcajon"),
    ("Encinitas Fire Protection District", "San Diego", "encinitasca"),
    ("Imperial Beach Fire Department", "San Diego", "imperialbeachca"),
    ("Imperial County Fire Department", "San Diego", "imperialcounty"),
    ("La Mesa Fire Department", "San Diego", "lamesa"),
    ("National City Fire Department", "San Diego", "nationalca"),

]


def _assert_no_duplicate_slugs(agencies):
    """Startup assertion (JD-13, 2026-09-16 audit): a slug that only differs by letter
    case from another entry resolves to the SAME NEOGOV channel and silently publishes
    the same listing twice (this happened for Watsonville and Placentia). Fail loudly
    here instead of letting that reintroduce itself silently in a future edit."""
    seen = {}
    dupes = []
    for dept_name, region, slug in agencies:
        key = slug.strip().lower()
        if key in seen:
            dupes.append((seen[key], (dept_name, region, slug)))
        else:
            seen[key] = (dept_name, region, slug)
    if dupes:
        detail = "; ".join(
            "%r (slug %r) collides with %r (slug %r)" % (b[0], b[2], a[0], a[2])
            for a, b in dupes
        )
        raise AssertionError(
            "Duplicate AGENCIES slug(s) (case-insensitive) -- this would publish the same "
            "listing twice: %s" % detail
        )


_assert_no_duplicate_slugs(AGENCIES)

# A posting counts as firefighter-relevant if its title or categories match this.
# Anchored on a "fire" role token so bare "Paramedic (Non-Safety)" or "Ambulance
# Operator" postings do not leak into the firefighter board. Suppression/recruit
# roles ("Firefighter/Paramedic", "Fire Recruit", "Fire Apparatus Engineer") all
# carry "fire" and pass; non-fire medical roles do not.
KEYWORD_RE = re.compile(
    r"fire\s?fighter|fire recruit|fire trainee|fire apparatus|"
    r"fire captain|fire engineer|fire academy|fire cadet|fire\b.*paramedic",
    re.I,
)
NEGATIVE_RE = re.compile(
    r"fire alarm|fire sprinkler|fire inspector|fire prevention|fire marshal|"
    r"dispatcher|records|clerk|analyst|plan check|volunteer coordinator|"
    r"non-safety|ambulance operator|mechanic|educator",
    re.I,
)

# Classification uses explicit title, job-type, exam-type, and restriction language.
# Do not infer internal access from generic qualifications such as "experience required."
PROMOTIONAL_TITLE_RE = re.compile(r"\bpromotional(?:\s+only)?\b", re.I)
INTERNAL_RESTRICTION_RE = re.compile(
    r"\binternal\s+(?:recruitment|only)\b|"
    r"\bonly\s+applications?\s+from\s+current\b|"
    r"\bcurrent\s+[^.]{0,90}\s+employees?\s+only\b|"
    r"\bonly\s+open\s+to\s+current\s+[^.]{0,90}\s+employees?\b",
    re.I,
)
ROLE_PATTERNS = (
    ("Cadet", re.compile(r"\bcadet\b", re.I)),
    ("Volunteer", re.compile(r"\bvolunteer\b", re.I)),
    ("Lateral", re.compile(r"\blateral\b", re.I)),
    ("Seasonal", re.compile(r"\bseasonal\b", re.I)),
    ("Recruit/trainee", re.compile(r"\brecruit\b|\btrainee\b", re.I)),
)

FEED_URL = "https://www.governmentjobs.com/SearchEngine/JobsFeed?agency={slug}"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; GoldenStateFirefighter-JobBoard/1.0; "
    "+https://goldenstatefirefighter.com/jobs)"
}
REQUEST_DELAY_S = 2.0


def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")


def parse_neogov_date(s):
    """NEOGOV dates look like 'Thu, 09 Jul 2026 23:59:00:0' -- RFC-822-ish with a
    trailing ':<millis>'. Return an ISO date 'YYYY-MM-DD' or None."""
    if not s:
        return None
    s = s.strip()
    # Drop the trailing ':0' / ':000' millisecond field NEOGOV appends.
    s = re.sub(r":(\d{1,3})$", "", s)
    for fmt in ("%a, %d %b %Y %H:%M:%S", "%a, %d %b %Y"):
        try:
            return dt.datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def text(el, path):
    node = el.find(path, NS) if path.startswith("joblisting:") else el.find(path)
    return node.text.strip() if node is not None and node.text else None


def plain_text(value):
    """Turn the short HTML bulletin fields in the RSS feed into searchable text."""
    value = html_lib.unescape(value or "")
    value = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def restriction_excerpt(description):
    """Return only the sentence that supports a restriction label."""
    for sentence in re.split(r"(?<=[.!?])\s+", description or ""):
        if INTERNAL_RESTRICTION_RE.search(sentence):
            return sentence[:320]
    return None


def classify_access(title, description, exam_type):
    """Return (status, note). Unknown stays unknown unless the feed is explicit."""
    title = title or ""
    description = description or ""
    if PROMOTIONAL_TITLE_RE.search(title) and not re.search(r"\bopen\s*(?:&|and|/)\s*promotional\b", title, re.I):
        return "promotional", restriction_excerpt(description) or (description[:320] if description else None)
    if INTERNAL_RESTRICTION_RE.search(description) or re.search(r"\binternal\s+only\b", title, re.I):
        return "internal", restriction_excerpt(description)
    normalized_exam = re.sub(r"\s+", " ", exam_type or "").strip().lower()
    if normalized_exam in {"promotional", "promotional only"}:
        return "promotional", restriction_excerpt(description)
    if normalized_exam in {"open", "open competitive", "open & promotional", "open and promotional"}:
        return "public", None
    return "unknown", None


def classify_roles(title, job_type):
    labels = [label for label, pattern in ROLE_PATTERNS if pattern.search(title or "")]
    normalized_type = re.sub(r"\s+", " ", job_type or "").strip()
    if normalized_type and normalized_type.lower() not in {"full-time", "full time"}:
        labels.append(normalized_type.title())
    return list(dict.fromkeys(labels))


def salary_fields(item):
    low = text(item, "joblisting:minimumSalary")
    high = text(item, "joblisting:maximumSalary")
    interval = text(item, "joblisting:salaryInterval")
    if (low or "").lower() == "not displayed":
        low = None
    if (high or "").lower() == "not displayed":
        high = None
    return low, high, interval


def parse_feed(xml_text, dept_name, region):
    """Return a list of firefighter-relevant listing dicts from one agency feed."""
    out = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as e:
        print("  parse error for %s: %s" % (dept_name, e))
        return out
    channel = root.find("channel")
    if channel is None:
        return out
    for item in channel.findall("item"):
        title = text(item, "title") or ""
        cats = " ".join(c.text or "" for c in item.findall("joblisting:categories", NS))
        haystack = title + " " + cats
        if not KEYWORD_RE.search(haystack):
            continue
        if NEGATIVE_RE.search(title):
            continue
        clean_title = re.sub(r"^[\W_]+", "", re.sub(r"\s+", " ", title)).strip()
        description = plain_text(text(item, "description"))
        exam_type = text(item, "joblisting:examtype")
        job_type = text(item, "joblisting:jobType")
        access_status, access_note = classify_access(clean_title, description, exam_type)
        salary_low, salary_high, salary_interval = salary_fields(item)
        out.append(
            {
                "department": dept_name,
                "title": clean_title,
                "region": region,
                "open_date": parse_neogov_date(text(item, "joblisting:advertiseFromDate")),
                "close_date": parse_neogov_date(text(item, "joblisting:advertiseToDateTime")),
                "source_url": text(item, "link"),
                "source": "governmentjobs",
                "observed_at": dt.date.today().isoformat(),
                "employment_type": job_type,
                "role_labels": classify_roles(clean_title, job_type),
                "access_status": access_status,
                "access_note": access_note,
                "salary_min": salary_low,
                "salary_max": salary_high,
                "salary_interval": salary_interval,
            }
        )
    return out


def scrape():
    """Fetch every configured agency feed. Returns (listings, summary) where summary is
    a per-run health record (JD-12, 2026-09-16 audit): agencies attempted, agencies that
    returned zero firefighter postings, agencies that errored (with the error), and the
    total listing count. Per-agency errors were previously visible only in the log file
    scrollback; this makes them visible in a small, always-written JSON record too."""
    listings = []
    checked = errors = 0
    zero_agencies = []
    error_agencies = []
    for dept_name, region, slug in AGENCIES:
        url = FEED_URL.format(slug=slug)
        try:
            xml_text = fetch(url)
            checked += 1
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            errors += 1
            print("  ERROR  %-32s %s" % (dept_name, e))
            error_agencies.append({"department": dept_name, "slug": slug, "error": str(e)})
            continue
        found = parse_feed(xml_text, dept_name, region)
        print("  ok  %-32s %d firefighter posting(s)" % (dept_name, len(found)))
        if not found:
            zero_agencies.append(dept_name)
        listings.extend(found)
        time.sleep(REQUEST_DELAY_S)
    print("\n%d agencies checked, %d errors, %d open firefighter listing(s)"
          % (checked, errors, len(listings)))
    summary = {
        "agencies_attempted": len(AGENCIES),
        "agencies_ok": checked,
        "agencies_errored": errors,
        "agencies_zero_result": len(zero_agencies),
        "zero_result_agencies": zero_agencies,
        "error_agencies": error_agencies,
        "total_listings": len(listings),
    }
    return listings, summary


def write_health(summary, path=HEALTH_PATH):
    """Write the per-run health summary (JD-12) so an operator, or a future automated
    check, can see agency-level scrape health without parsing refresh_jobboard.log."""
    payload = dict(summary)
    payload["generated"] = dt.datetime.now().isoformat(timespec="seconds")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print("wrote %s" % os.path.normpath(path))


# ---------------------------------------------------------------------------
# Bundled sample -- the exact shape the widget consumes. Written ONLY by the explicit
# `--sample` developer/offline-testing flag; the scheduled refresh never passes it.
#
# JD-01 (2026-09-16 audit): this used to ALSO be substituted automatically whenever a
# live run scraped zero listings, which defeated refresh_jobboard.ps1's own zero-count
# publish guard (the guard checks meta.count, and the fallback guaranteed meta.count==3,
# so the guard could never fire). A total scrape failure would then publish three stale
# July-2026 postings as current openings and report success. That automatic fallback is
# REMOVED. On a total scrape failure, main() now exits non-zero and writes NOTHING to
# listings.json, so the PowerShell guard/exit-code check fires and the previous good
# listings.json stays published. Do not re-add an automatic fallback on this path --
# see the widget's own comment in gsf-site-scripts.js: "On a job board an empty honest
# state beats a confidently wrong one."
# ---------------------------------------------------------------------------
SAMPLE = [
    {
        "department": "Sacramento City Fire Department",
        "title": "Fire Recruit (Paramedic)",
        "region": "Sacramento/Central Valley",
        "open_date": "2026-07-06",
        "close_date": "2026-07-20",
        "source_url": "https://www.governmentjobs.com/careers/saccity/jobs/5361865",
        "source": "governmentjobs",
        "observed_at": "2026-07-06",
        "employment_type": "Regular Full-Time",
        "role_labels": ["Recruit/trainee", "Regular Full-Time"],
        "access_status": "unknown",
        "access_note": None,
        "salary_min": None,
        "salary_max": None,
        "salary_interval": None,
    },
    {
        "department": "Anaheim Fire & Rescue",
        "title": "Firefighter Trainee",
        "region": "Los Angeles/SoCal",
        "open_date": "2026-06-16",
        "close_date": "2026-07-22",
        "source_url": "https://www.governmentjobs.com/careers/anaheim/jobs/5379220",
        "source": "governmentjobs",
        "observed_at": "2026-06-16",
        "employment_type": "Regular Full-Time",
        "role_labels": ["Recruit/trainee", "Regular Full-Time"],
        "access_status": "unknown",
        "access_note": None,
        "salary_min": None,
        "salary_max": None,
        "salary_interval": None,
    },
    {
        "department": "Oceanside Fire Department",
        "title": "Firefighter Paramedic Recruit",
        "region": "San Diego",
        "open_date": "2026-05-01",
        "close_date": None,
        "source_url": "https://www.governmentjobs.com/careers/oceansideca/jobs/5329377",
        "source": "governmentjobs",
        "observed_at": "2026-05-01",
        "employment_type": "Regular Full-Time",
        "role_labels": ["Recruit/trainee", "Regular Full-Time"],
        "access_status": "unknown",
        "access_note": None,
        "salary_min": None,
        "salary_max": None,
        "salary_interval": None,
    },
]


def write(listings, path=OUT_PATH):
    payload = {
        "meta": {
            "generated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            "count": len(listings),
            "schema_version": 2,
            "source_scope": "Configured NEOGOV/GovernmentJobs agency RSS feeds only",
            "source_note": "This is a GovernmentJobs sample, not every open California fire role. "
            "Access, job type, salary, and restriction labels come from the public bulletin feed "
            "when present. Unknown stays unknown. Verify every listing against the official bulletin.",
        },
        "listings": listings,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print("wrote %s (%d listings)" % (os.path.normpath(path), len(listings)))


def main():
    ap = argparse.ArgumentParser(description="Fetch open CA firefighter listings.")
    ap.add_argument(
        "--sample",
        action="store_true",
        help="write bundled sample, no network (developer/offline testing ONLY -- "
        "the scheduled refresh task must never pass this flag)",
    )
    ap.add_argument("--dry-run", action="store_true", help="fetch + print, do not write")
    args = ap.parse_args()

    if args.sample:
        write(SAMPLE)
        return

    listings, summary = scrape()
    write_health(summary)

    if not listings:
        # JD-01: total scrape failure. Exit non-zero and write NOTHING to listings.json --
        # do not substitute stale sample data. refresh_jobboard.ps1 checks $LASTEXITCODE
        # immediately after invoking this script and throws before it ever reads or
        # republishes listings.json, so the previous good file stays live and published.
        print(
            "TOTAL SCRAPE FAILURE: 0 listings from %d agencies (%d ok, %d errored). "
            "Refusing to write listings.json; previous published feed is left in place."
            % (summary["agencies_attempted"], summary["agencies_ok"], summary["agencies_errored"])
        )
        sys.exit(1)

    if args.dry_run:
        print(json.dumps(listings, indent=2))
        return
    write(listings)


if __name__ == "__main__":
    main()
