from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
)


ROOT = Path("/Users/ps/Documents/RFP Finder")
OUT = ROOT / "output" / "pdf" / "lcls-technical-seo-performance-audit.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

PAGE_W, PAGE_H = LETTER

NAVY = colors.HexColor("#17231F")
GREEN = colors.HexColor("#1D684E")
LIME = colors.HexColor("#D8F45B")
MUTED = colors.HexColor("#68746E")
LIGHT = colors.HexColor("#F4F7F3")
BORDER = colors.HexColor("#DDE5DF")
WARN = colors.HexColor("#8A5A00")
RED = colors.HexColor("#A13B2A")


def p(text, style):
    return Paragraph(text, style)


def link(url, label=None):
    label = label or url
    return f'<link href="{url}" color="#1D684E">{label}</link>'


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="CoverTitle",
    parent=styles["Title"],
    fontName="Helvetica-Bold",
    fontSize=30,
    leading=34,
    textColor=NAVY,
    alignment=TA_LEFT,
    spaceAfter=14,
))
styles.add(ParagraphStyle(
    name="CoverSubtitle",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=12.5,
    leading=18,
    textColor=MUTED,
    alignment=TA_LEFT,
))
styles.add(ParagraphStyle(
    name="H1",
    parent=styles["Heading1"],
    fontName="Helvetica-Bold",
    fontSize=18,
    leading=23,
    textColor=NAVY,
    spaceBefore=8,
    spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="H2",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=13,
    leading=17,
    textColor=GREEN,
    spaceBefore=8,
    spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="Body",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=9.5,
    leading=14,
    textColor=colors.HexColor("#34423B"),
    spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="Small",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=8,
    leading=11,
    textColor=MUTED,
))
styles.add(ParagraphStyle(
    name="Metric",
    parent=styles["BodyText"],
    fontName="Helvetica-Bold",
    fontSize=20,
    leading=24,
    textColor=NAVY,
    alignment=TA_CENTER,
))
styles.add(ParagraphStyle(
    name="MetricLabel",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=7.8,
    leading=10,
    textColor=MUTED,
    alignment=TA_CENTER,
))
styles.add(ParagraphStyle(
    name="Cell",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=8.2,
    leading=10.8,
    textColor=colors.HexColor("#34423B"),
))
styles.add(ParagraphStyle(
    name="CellBold",
    parent=styles["BodyText"],
    fontName="Helvetica-Bold",
    fontSize=8.3,
    leading=10.8,
    textColor=NAVY,
))
styles.add(ParagraphStyle(
    name="HeaderCell",
    parent=styles["BodyText"],
    fontName="Helvetica-Bold",
    fontSize=8.3,
    leading=10.8,
    textColor=colors.white,
))


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, PAGE_H - 0.18 * inch, PAGE_W, 0.18 * inch, fill=1, stroke=0)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(0.72 * inch, 0.45 * inch, "LCLS Technical SEO and Performance Audit")
    canvas.drawRightString(PAGE_W - 0.72 * inch, 0.45 * inch, f"Page {doc.page}")
    canvas.restoreState()


def metric_card(value, label):
    t = Table([[p(value, styles["Metric"])], [p(label, styles["MetricLabel"])]], colWidths=[1.45 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.75, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def bullet(items):
    rows = []
    for item in items:
        rows.append([p("-", styles["CellBold"]), p(item, styles["Body"])])
    t = Table(rows, colWidths=[0.18 * inch, 6.65 * inch])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))
    return t


story = []

# Cover
story.append(Spacer(1, 0.35 * inch))
story.append(p("Technical SEO and Performance Audit", styles["CoverTitle"]))
story.append(p("Lackawanna County Library System - lclshome.org", styles["CoverSubtitle"]))
story.append(Spacer(1, 0.2 * inch))
story.append(p("Prepared for proposal discovery by Dimaso", styles["CoverSubtitle"]))
story.append(p("Audit date: June 23, 2026", styles["CoverSubtitle"]))
story.append(Spacer(1, 0.45 * inch))
story.append(Table([[metric_card("79", "Unique assets observed"),
                     metric_card("~3.3 MB", "Known asset payload"),
                     metric_card("6", "H1 elements"),
                     metric_card("0", "Meta description found")]],
                   colWidths=[1.55 * inch] * 4,
                   hAlign="LEFT"))
story.append(Spacer(1, 0.35 * inch))
story.append(p(
    "This quick audit reviews the public homepage and RFP page for LCLS from a technical SEO, performance, accessibility, and maintainability perspective. "
    "The goal is not to replace a full Core Web Vitals lab report, but to identify clear, proposal-ready opportunities for improving speed, findability, accessibility, and long-term WordPress operations.",
    styles["Body"],
))
story.append(Spacer(1, 0.2 * inch))
story.append(p("<b>Reviewed URLs</b>", styles["H2"]))
story.append(bullet([
    f"Homepage: {link('https://lclshome.org/')}",
    f"RFP page: {link('https://lclshome.org/website-and-public-relations-request-for-proposal')}",
]))
story.append(PageBreak())

# Executive summary
story.append(p("1. Executive Summary", styles["H1"]))
story.append(p(
    "LCLS has a valuable public-facing WordPress site with a broad set of user services: catalog access, member library information, events, news, account links, donation/join paths, and service pages. "
    "The site is functional, but the audit shows typical mature WordPress technical debt: heavy media, many plugin-generated assets, incomplete SEO metadata, weak caching signals, multiple H1 headings, and exposed technology headers.",
    styles["Body"],
))
story.append(p(
    "For a redesign proposal, the strongest position is to frame the work as a modernization of the library system's digital front door: faster for patrons, easier to navigate, more accessible, easier for staff to maintain, and better instrumented for measurement.",
    styles["Body"],
))

summary_data = [
    [p("Area", styles["HeaderCell"]), p("Finding", styles["HeaderCell"]), p("Business impact", styles["HeaderCell"]), p("Priority", styles["HeaderCell"])],
    [p("Performance", styles["CellBold"]), p("79 unique assets; at least ~3.3 MB of known asset payload; several large JPG/PNG images.", styles["Cell"]), p("Slower mobile load, poorer Core Web Vitals, more friction for patrons.", styles["Cell"]), p("High", styles["CellBold"])],
    [p("SEO", styles["CellBold"]), p("Homepage title appears empty; no meta description or canonical tag found.", styles["Cell"]), p("Weak search snippets and lower control over indexing signals.", styles["Cell"]), p("High", styles["CellBold"])],
    [p("Accessibility", styles["CellBold"]), p("Multiple H1s, empty image alt attributes, slider-heavy content.", styles["Cell"]), p("Potential WCAG risk for a public library audience.", styles["Cell"]), p("High", styles["CellBold"])],
    [p("Security", styles["CellBold"]), p("WordPress, PHP, and Plesk details are publicly exposed.", styles["Cell"]), p("Unnecessary fingerprinting of the technology stack.", styles["Cell"]), p("Medium", styles["CellBold"])],
    [p("Maintainability", styles["CellBold"]), p("Large plugin footprint: Smart Slider, Events Calendar, Tickets, Gravity Forms/reCAPTCHA, third-party widgets.", styles["Cell"]), p("More update risk, JS/CSS bloat, and admin complexity.", styles["Cell"]), p("Medium", styles["CellBold"])],
]
table = Table(summary_data, colWidths=[1.05 * inch, 2.25 * inch, 2.15 * inch, 0.8 * inch], repeatRows=1)
table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), NAVY),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("BACKGROUND", (0, 1), (-1, -1), colors.white),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAFCFA")]),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
]))
story.append(table)
story.append(PageBreak())

# Performance
story.append(p("2. Performance and Speed Findings", styles["H1"]))
story.append(p(
    "The homepage shows several performance risks before a full Lighthouse run is even required. The public HTML is close to 97 KB, and the page references dozens of scripts, stylesheets, images, fonts, and third-party widgets.",
    styles["Body"],
))
story.append(Table([[metric_card("~97 KB", "Homepage HTML"),
                     metric_card("29", "Script files"),
                     metric_card("23", "Stylesheets"),
                     metric_card("27", "Image references")]],
                   colWidths=[1.55 * inch] * 4,
                   hAlign="LEFT"))
story.append(Spacer(1, 0.18 * inch))
story.append(p("Largest observed assets", styles["H2"]))
asset_data = [
    [p("Asset", styles["HeaderCell"]), p("Type", styles["HeaderCell"]), p("Approx. size", styles["HeaderCell"]), p("Issue", styles["HeaderCell"])],
    [p("LCLS_Logo_Updated.jpg", styles["Cell"]), p("JPEG", styles["Cell"]), p("571 KB", styles["Cell"]), p("Logo asset is far too heavy for repeated brand usage.", styles["Cell"])],
    [p("Valley-web-pic.png", styles["Cell"]), p("PNG", styles["Cell"]), p("367 KB", styles["Cell"]), p("PNG photo likely should be resized and converted to WebP/AVIF.", styles["Cell"])],
    [p("BKM-web-pic-1.png", styles["Cell"]), p("PNG", styles["Cell"]), p("321 KB", styles["Cell"]), p("Large image payload for a homepage card.", styles["Cell"])],
    [p("hero_full.jpg", styles["Cell"]), p("JPEG", styles["Cell"]), p("156 KB", styles["Cell"]), p("Hero image can be optimized and served responsively.", styles["Cell"])],
    [p("smartslider-frontend.min.js", styles["Cell"]), p("JS", styles["Cell"]), p("116 KB", styles["Cell"]), p("Slider dependency contributes meaningful JavaScript weight.", styles["Cell"])],
]
t = Table(asset_data, colWidths=[2.2 * inch, 0.75 * inch, 0.85 * inch, 2.6 * inch], repeatRows=1)
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), GREEN),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
]))
story.append(t)
story.append(Spacer(1, 0.16 * inch))
story.append(p("Recommended performance improvements", styles["H2"]))
story.append(bullet([
    "Convert large JPG/PNG imagery to modern responsive WebP/AVIF formats and generate correct thumbnail sizes.",
    "Audit Smart Slider usage; replace slider-heavy content with lighter hero/feature modules where possible.",
    "Defer or conditionally load plugin scripts that are not needed on the homepage.",
    "Configure long-lived browser caching for static WordPress theme, plugin, image, CSS, and JS assets.",
    "Introduce page caching and a CDN strategy suitable for WordPress/Plesk hosting.",
]))
story.append(PageBreak())

# SEO
story.append(p("3. Technical SEO Findings", styles["H1"]))
story.append(p(
    "The site has basic crawl infrastructure in place, but key on-page SEO signals are weak on the homepage. This matters because the homepage is likely the highest-authority page for patrons searching for library services, events, locations, cards, and county library information.",
    styles["Body"],
))
seo_data = [
    [p("Check", styles["HeaderCell"]), p("Observed result", styles["HeaderCell"]), p("Recommendation", styles["HeaderCell"])],
    [p("Title tag", styles["CellBold"]), p("Appears empty on homepage.", styles["Cell"]), p("Add a clear, keyword-relevant title under 60 characters.", styles["Cell"])],
    [p("Meta description", styles["CellBold"]), p("Not found.", styles["Cell"]), p("Add a 140-160 character summary covering catalog, events, libraries, and services.", styles["Cell"])],
    [p("Canonical", styles["CellBold"]), p("Not found.", styles["Cell"]), p("Add canonical URL to reduce duplicate-indexing ambiguity.", styles["Cell"])],
    [p("H1 structure", styles["CellBold"]), p("6 H1 elements, including duplicate 'What are you looking for today?'.", styles["Cell"]), p("Use one H1 per page; convert content section headings to H2/H3.", styles["Cell"])],
    [p("Robots.txt", styles["CellBold"]), p("Present and references wp-sitemap.xml.", styles["Cell"]), p("Keep; verify disallow rules after redesign.", styles["Cell"])],
    [p("Sitemap", styles["CellBold"]), p("Present, but some lastmod dates appear very old.", styles["Cell"]), p("Regenerate sitemap from current content and include meaningful last modified dates.", styles["Cell"])],
]
t = Table(seo_data, colWidths=[1.35 * inch, 2.4 * inch, 2.7 * inch], repeatRows=1)
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), NAVY),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
]))
story.append(t)
story.append(Spacer(1, 0.2 * inch))
story.append(p("Suggested homepage metadata", styles["H2"]))
story.append(p("<b>Title:</b> Lackawanna County Library System | Libraries, Events, Catalog and Community Resources", styles["Body"]))
story.append(p("<b>Description:</b> Find books, events, library services, digital resources, and member libraries across the Lackawanna County Library System.", styles["Body"]))
story.append(PageBreak())

# Accessibility, security, maintainability
story.append(p("4. Accessibility, Security, and Maintainability", styles["H1"]))
story.append(p("Accessibility", styles["H2"]))
story.append(bullet([
    "The homepage uses multiple H1 headings, which can weaken assistive-technology page structure.",
    "At least one image lacks an alt attribute and five images have empty alt text. Some may be decorative, but navigation and content-card images should be reviewed manually.",
    "The Smart Slider component should be tested for keyboard access, reduced motion, focus order, screen reader labels, and pause/stop behavior.",
    "A public library redesign should target WCAG 2.2 AA, including color contrast, focus visibility, forms, events, and catalog pathways.",
]))
story.append(p("Security and operational hardening", styles["H2"]))
story.append(bullet([
    "The site exposes WordPress 6.8.5 via generator metadata.",
    "HTTP headers expose PHP/8.3.31 and PleskLin details.",
    "A redesign should include baseline WordPress hardening: remove version fingerprints, add security headers, review admin roles, confirm backups, and create a plugin update process.",
]))
story.append(p("Plugin and maintenance profile", styles["H2"]))
story.append(bullet([
    "Detected plugin footprint includes Smart Slider, The Events Calendar / Events Calendar Pro, Event Tickets, Gravity Forms reCAPTCHA, Google scripts, FontAwesome, and external widgets.",
    "This is normal for an older WordPress site, but it increases CSS/JS load, update risk, and QA complexity.",
    "A redesign should include a plugin audit and a 'load only where needed' strategy for events, forms, tickets, and widgets.",
]))
story.append(PageBreak())

# Roadmap and proposal angle
story.append(p("5. Recommended Roadmap for Proposal", styles["H1"]))
roadmap = [
    [p("Phase", styles["HeaderCell"]), p("Scope", styles["HeaderCell"]), p("Outcome", styles["HeaderCell"])],
    [p("1. Discovery and audit", styles["CellBold"]), p("Content inventory, stakeholder interviews, analytics review, accessibility baseline, technical plugin audit.", styles["Cell"]), p("Clear requirements and risk map before design begins.", styles["Cell"])],
    [p("2. UX and information architecture", styles["CellBold"]), p("Patron journeys, homepage hierarchy, navigation model, service landing pages, events and member library pathways.", styles["Cell"]), p("A site structure organized around user needs rather than legacy sections.", styles["Cell"])],
    [p("3. Visual redesign and component system", styles["CellBold"]), p("Accessible responsive templates, reusable WordPress blocks/components, improved calls to action.", styles["Cell"]), p("Modern public-facing design that remains maintainable for staff.", styles["Cell"])],
    [p("4. WordPress implementation", styles["CellBold"]), p("Theme rebuild or modernization, plugin rationalization, content migration, performance setup.", styles["Cell"]), p("Faster, more stable, easier-to-maintain WordPress platform.", styles["Cell"])],
    [p("5. QA, launch, and support", styles["CellBold"]), p("WCAG QA, browser/device testing, redirects, SEO metadata, analytics events, staff handoff, maintenance plan.", styles["Cell"]), p("Lower launch risk and measurable post-launch operations.", styles["Cell"])],
]
t = Table(roadmap, colWidths=[1.55 * inch, 3.0 * inch, 1.9 * inch], repeatRows=1)
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), GREEN),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
]))
story.append(t)
story.append(Spacer(1, 0.18 * inch))
story.append(p("Recommended proposal positioning", styles["H2"]))
story.append(p(
    "Dimaso should position the work as more than a visual refresh: a modernization of LCLS's digital front door. "
    "The strongest message is speed, accessibility, maintainability, and user-centered access to library services.",
    styles["Body"],
))
story.append(KeepTogether([
    p("Suggested language", styles["H2"]),
    p(
        "\"We will redesign and modernize the Lackawanna County Library System website into a faster, more accessible, easier-to-maintain digital front door for patrons, families, library staff, and community partners. "
        "Our approach combines UX redesign, WordPress modernization, WCAG-aligned accessibility, performance optimization, and measurable analytics.\"",
        styles["Body"],
    )
]))

story.append(Spacer(1, 0.28 * inch))
story.append(p("Audit sources", styles["H2"]))
story.append(bullet([
    f"Homepage: {link('https://lclshome.org/')}",
    f"RFP page: {link('https://lclshome.org/website-and-public-relations-request-for-proposal')}",
    f"Robots: {link('https://lclshome.org/robots.txt')}",
    f"Sitemap: {link('https://lclshome.org/wp-sitemap.xml')}",
]))
story.append(p(
    "Note: Google PageSpeed Insights API returned a rate-limit response during this quick audit, so this report uses direct HTTP and HTML inspection. "
    "A full engagement should include Lighthouse lab runs and field data review in Google Search Console / Chrome UX Report where available.",
    styles["Small"],
))


doc = SimpleDocTemplate(
    str(OUT),
    pagesize=LETTER,
    rightMargin=0.65 * inch,
    leftMargin=0.65 * inch,
    topMargin=0.65 * inch,
    bottomMargin=0.7 * inch,
    title="LCLS Technical SEO and Performance Audit",
    author="Dimaso",
)
doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(OUT)
