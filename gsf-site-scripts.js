/* ==========================================================================
   Golden State Firefighter - site-wide behavior layer  (gsf-site-scripts.js)
   --------------------------------------------------------------------------
   The GSF equivalent of Ambitious Harvest's ah-site-scripts.js.

   HOSTING: live sitewide from the public gsf-assets repo. To deploy an edit:
     1. Copy this file into the gsf-assets clone at the GSF folder root.
     2. Commit that ONE file (public repo, never git add -A) and push.
     3. Purge once:
        curl -s "https://purge.jsdelivr.net/gh/goldenstatefirefighter/gsf-assets@main/gsf-site-scripts.js"
   Loader already in the Squarespace header:
        https://cdn.jsdelivr.net/gh/goldenstatefirefighter/gsf-assets@main/gsf-site-scripts.js

   Modules (article-only, idempotent):
     1. Keep Reading  - related-article cards from the embedded manifest
     2. FAQ polish    - consistent styling for the FAQ block
     3. Callouts      - keyword-routed product / affiliate callout, mid-article
     4. On this page  - compact TOC after the first paragraph (4+ h2 articles)
     5. External-link marker - superscript arrow + noopener on other-host links

   Smoke-test the DOM selectors on the live site once and adjust if needed.
   Voice rule: no em-dashes, no emojis, no hype in any injected copy.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = {
    blogBase: '/learn/',           // article URL prefix on the live site
    maxRelated: 3,
    brand: {
      navy:    '#101C33',
      char:    '#1E2128',
      brass:   '#C08A2D',
      ember:   '#B23A2E',
      bone:    '#F3EFE6',
      slate:   '#5B6472',
      rule:    '#D7D2C6'
    }
  };

  // --- Article manifest (slug, title, phase). Keep in sync as articles ship.
  // Verified public feed + original source categories, 2026-09-06.
  var ARTICLES = [
  {
    "s": "which-experience-helps-firefighter-application-california",
    "t": "Which Experience Actually Helps a California Firefighter Application?",
    "p": "Get Hired"
  },
  {
    "s": "become-a-firefighter-california-without-quitting-your-job",
    "t": "How to Become a California Firefighter Without Quitting Your Job",
    "p": "Get Hired"
  },
  {
    "s": "academy-or-paramedic-first-california",
    "t": "Academy or Paramedic First? A California Firefighter Path Decision Guide",
    "p": "Get Hired"
  },
  {
    "s": "retired-firefighter-tax-breaks",
    "t": "Retired Firefighter Tax Breaks: HELPS, IDR, Early Access",
    "p": "On the Job"
  },
  {
    "s": "no-tax-on-overtime-firefighters",
    "t": "No Tax on Overtime for Firefighters: What Qualifies",
    "p": "On the Job"
  },
  {
    "s": "firefighter-taxes-california",
    "t": "California Firefighter Taxes: How to Actually Pay Less",
    "p": "On the Job"
  },
  {
    "s": "firefighter-side-business-taxes",
    "t": "Firefighter Side Business Taxes: What You Can Deduct",
    "p": "On the Job"
  },
  {
    "s": "firefighter-overtime-tax-myth",
    "t": "Firefighter Overtime Tax: Why Your OT Check Looks Small",
    "p": "On the Job"
  },
  {
    "s": "firefighter-money-mistakes",
    "t": "Firefighter Money Mistakes: The First Five Years",
    "p": "On the Job"
  },
  {
    "s": "calpers-pension-taxes",
    "t": "Is a CalPERS Pension Taxable? Federal, California, Moving",
    "p": "On the Job"
  },
  {
    "s": "california-firefighter-tax-deductions",
    "t": "Firefighter Tax Deductions California Still Allows",
    "p": "On the Job"
  },
  {
    "s": "457b-fees-annuity-audit",
    "t": "457(b) Fees: How to Audit the Firehouse Annuity Pitch",
    "p": "On the Job"
  },
  {
    "s": "457b-california-firefighters",
    "t": "The 457(b): The Firefighter's Best Tax Break",
    "p": "On the Job"
  },
  {
    "s": "military-to-firefighter-california",
    "t": "From Military to Firefighter in California",
    "p": "Get Hired"
  },
  {
    "s": "how-to-promote-to-fire-engineer",
    "t": "How to Promote to Fire Engineer in California",
    "p": "Promote"
  },
  {
    "s": "how-to-promote-to-fire-captain",
    "t": "How to Promote to Fire Captain in California",
    "p": "Promote"
  },
  {
    "s": "how-to-promote-to-battalion-chief",
    "t": "How to Promote to Battalion Chief in California",
    "p": "Promote"
  },
  {
    "s": "how-to-promote-in-the-fire-service-california",
    "t": "How to Promote in the Fire Service (California)",
    "p": "Promote"
  },
  {
    "s": "how-to-become-a-fire-chief",
    "t": "How to Become a Fire Chief in California",
    "p": "Promote"
  },
  {
    "s": "firefighter-incentive-pay",
    "t": "Firefighter Incentive Pay in California, Explained",
    "p": "Promote"
  },
  {
    "s": "fire-service-leadership-for-officers",
    "t": "Fire Service Leadership for Aspiring Officers",
    "p": "Promote"
  },
  {
    "s": "fire-promotional-assessment-center",
    "t": "The Fire Promotional Assessment Center Explained",
    "p": "Promote"
  },
  {
    "s": "fire-officer-certification-california",
    "t": "Fire Officer Certification in California Explained",
    "p": "Promote"
  },
  {
    "s": "building-your-firefighter-promotional-file",
    "t": "Building Your Firefighter Promotional File",
    "p": "Promote"
  },
  {
    "s": "wildland-firefighter-career-california",
    "t": "Wildland Firefighter Career in California",
    "p": "On the Job"
  },
  {
    "s": "why-probationary-firefighters-fail",
    "t": "Why Probationary Firefighters Fail (and How Not To)",
    "p": "On the Job"
  },
  {
    "s": "what-firefighters-actually-do-all-day",
    "t": "What Firefighters Actually Do All Day",
    "p": "On the Job"
  },
  {
    "s": "surviving-firefighter-probation",
    "t": "Surviving Firefighter Probation: A Rookie's Playbook",
    "p": "On the Job"
  },
  {
    "s": "should-you-become-a-firefighter-paramedic",
    "t": "Should You Become a Firefighter Paramedic?",
    "p": "On the Job"
  },
  {
    "s": "how-to-get-on-a-specialty-team",
    "t": "How to Get on a Specialty Team (USAR & Hazmat)",
    "p": "On the Job"
  },
  {
    "s": "how-to-become-a-fire-investigator",
    "t": "How to Become a Fire Investigator in California",
    "p": "On the Job"
  },
  {
    "s": "how-to-be-a-good-firefighter",
    "t": "How to Be a Good Firefighter (Beyond Probation)",
    "p": "On the Job"
  },
  {
    "s": "hazmat-technician-firefighter",
    "t": "Hazmat Technician Firefighter: The California Path",
    "p": "On the Job"
  },
  {
    "s": "firefighter-task-book-explained",
    "t": "The Firefighter Task Book, Explained",
    "p": "On the Job"
  },
  {
    "s": "firefighter-mental-health",
    "t": "Firefighter Mental Health: The Toll and Where to Get Help",
    "p": "On the Job"
  },
  {
    "s": "fire-station-etiquette",
    "t": "Fire Station Etiquette: The Rookie's Unwritten Rules",
    "p": "On the Job"
  },
  {
    "s": "fire-service-specialties-explained",
    "t": "Fire Service Specialties Explained (California Guide)",
    "p": "On the Job"
  },
  {
    "s": "california-firefighter-pension-retirement",
    "t": "The California Firefighter Pension and Retirement, Explained",
    "p": "On the Job"
  },
  {
    "s": "what-fire-academy-is-like-california",
    "t": "What Fire Academy Is Really Like in California",
    "p": "Get Hired"
  },
  {
    "s": "personal-history-statement-explained",
    "t": "The Personal History Statement (PHS), Explained",
    "p": "Get Hired"
  },
  {
    "s": "how-to-stand-out-and-get-hired-as-a-firefighter",
    "t": "How to Stand Out and Get Hired as a Firefighter",
    "p": "Get Hired"
  },
  {
    "s": "how-long-to-become-a-firefighter-california",
    "t": "How Long Does It Take to Become a Firefighter? (CA)",
    "p": "Get Hired"
  },
  {
    "s": "firefighter-tattoos-grooming-standards-california",
    "t": "Firefighter Tattoos and Grooming Standards in California",
    "p": "Get Hired"
  },
  {
    "s": "firefighter-schedule-explained",
    "t": "The Firefighter Schedule Explained (48/96 and More)",
    "p": "Get Hired"
  },
  {
    "s": "fire-explorer-cadet-programs-california",
    "t": "Fire Explorer and Cadet Programs in California",
    "p": "Get Hired"
  },
  {
    "s": "fctc-statewide-eligibility-list-explained",
    "t": "The FCTC Statewide Eligibility List (SEL), Explained",
    "p": "Get Hired"
  },
  {
    "s": "engine-vs-truck-company",
    "t": "Engine vs Truck Company: What's the Difference?",
    "p": "Get Hired"
  },
  {
    "s": "cal-fire-vs-city-vs-county",
    "t": "CAL FIRE vs City vs County Fire: How to Choose",
    "p": "Get Hired"
  },
  {
    "s": "am-i-too-old-to-become-a-firefighter-california",
    "t": "Am I Too Old to Become a Firefighter in California?",
    "p": "Get Hired"
  },
  {
    "s": "firefighter-background-investigation",
    "t": "The Firefighter Background Investigation, Explained",
    "p": "Get Hired"
  },
  {
    "s": "firefighter-oral-board-questions",
    "t": "Firefighter Oral Board Questions and How to Answer Them",
    "p": "Get Hired"
  },
  {
    "s": "firefighter-hiring-process-california",
    "t": "The Firefighter Hiring Process in California, Step by Step",
    "p": "Get Hired"
  },
  {
    "s": "fctc-written-test-explained",
    "t": "The FCTC Written Test, Explained (California)",
    "p": "Get Hired"
  },
  {
    "s": "how-to-pass-the-cpat",
    "t": "How to Pass the CPAT: The 8 Events and How to Train",
    "p": "Get Hired"
  },
  {
    "s": "fire-academy-vs-fire-technology-california",
    "t": "Fire Academy vs. Fire Technology in California",
    "p": "Get Hired"
  },
  {
    "s": "do-you-need-emt-before-applying-firefighter-california",
    "t": "Do You Need an EMT to Be a Firefighter in California?",
    "p": "Get Hired"
  },
  {
    "s": "firefighter-salary-california",
    "t": "California Firefighter Salary: Base Pay, Overtime, Pension",
    "p": "Get Hired"
  },
  {
    "s": "is-being-a-firefighter-worth-it",
    "t": "Is Being a Firefighter Worth It? Rewards, Costs, and Fit",
    "p": "Get Hired"
  },
  {
    "s": "how-to-become-a-firefighter-in-california",
    "t": "How to Become a Firefighter in California",
    "p": "Get Hired"
  }
];


  /* Keyword-routed callouts (copy from Commercialization/Affiliate_Program_Plan.md).
     Each: { match:[substrings tested against slug+title], title, body, cta, href }.
     A callout stays DORMANT until its href is a real URL: any href still holding
     the REPLACE_WITH token is skipped, so this is safe to ship before any program
     is joined. To activate one: join the program, then paste the real affiliate
     URL over the token. First live match wins. */
  var CALLOUTS = [
    { match:['how-to-pass-the-cpat','cpat','physical ability'],
      title:'Train for the CPAT the way the test actually feels',
      body:'The CPAT is a timed grind in a 50-pound vest, and most candidates who struggle simply did not rehearse the load. A weighted vest and steady stair work in the weeks before your date close that gap.',
      cta:'See the weighted vest most candidates train in',
      href:'REPLACE_WITH_ROGUE_OR_AMAZON_URL' },
    { match:['do-you-need-emt-before-applying-firefighter-california','nremt','emt certification'],
      title:'Get the EMT card before it becomes the thing holding you back',
      body:'Most California fire jobs want a current EMT certification before you test, and the NREMT cognitive exam trips up people who did not drill practice questions. A focused prep course is a small cost against a six-figure job.',
      cta:'Practice for the NREMT exam',
      href:'REPLACE_WITH_EMT_NATIONAL_TRAINING_URL' },
    { match:['firefighter-oral-board-questions','oral board','panel interview'],
      title:'The oral board is won on preparation, not personality',
      body:'The candidates who score well have rehearsed their answers out loud until the nerves stop running the room. A well-worn interview prep book gives you the question bank and the structure to practice against.',
      cta:'See the firefighter interview prep book',
      href:'REPLACE_WITH_AMAZON_AFFILIATE_URL' },
    { match:['fctc-written-test-explained','written test','written exam','study guide'],
      title:'Walk into the written test having already seen the format',
      body:'The FCTC and department written tests reward familiarity with the question types more than raw knowledge. A practice-heavy study guide lets you rehearse the timing so nothing on test day is a surprise.',
      cta:'See a firefighter written-exam study guide',
      href:'REPLACE_WITH_AMAZON_AFFILIATE_URL' },
    { match:['fire-academy-vs-fire-technology-california','surviving-firefighter-probation','duty boots','turnout','station gear'],
      title:'Show up to the academy with boots that will not quit on you',
      body:'Recruits spend long days on their feet, and cheap boots fail fast. A solid pair of duty boots and basic station gear are worth buying once and buying right before day one.',
      cta:'See duty boots built for the academy',
      href:'REPLACE_WITH_LAPOLICEGEAR_URL' },
    { match:['firefighter fitness','conditioning','work capacity'],
      title:'The job rewards the people who keep training after they get hired',
      body:'Fitness is not a one-time test you clear and forget. A vest, a sandbag, and a simple weekly plan keep your work capacity where the job needs it, on and off probation.',
      cta:'See the strength gear firefighters actually use',
      href:'REPLACE_WITH_ROGUE_OR_AMAZON_URL' }
  ];

  // ---- helpers -----------------------------------------------------------
  function currentSlug() {
    // path-agnostic: last URL segment; run() confirms it is a known article, so
    // this works whether articles are served at /learn/, /library/, or elsewhere.
    var p = location.pathname.replace(/\/+$/, '');
    return p.substring(p.lastIndexOf('/') + 1) || null;
  }
  function currentBase() {
    var p = location.pathname.replace(/\/+$/, '');
    return p.substring(0, p.lastIndexOf('/') + 1);
  }
  function findArticle(slug){
    for (var k=0;k<ARTICLES.length;k++){ if(ARTICLES[k].s===slug) return ARTICLES[k]; }
    return null;
  }
  function byId(id){ return document.getElementById(id); }
  function el(tag, css, html){
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function contentEl(){
    var sel = ['.blog-item-content .sqs-layout', '.blog-item-content',
               'article .sqs-layout', 'main .sqs-layout', 'main article', 'main'];
    for (var i=0;i<sel.length;i++){ var n=document.querySelector(sel[i]); if(n) return n; }
    return null;
  }

  // --- Branded in-article graphics --------------------------------------
  // GRAPHICS: flat manifest. Each { slug, after, type, data }.
  //   after = heading-text substring to anchor after (graphic is SKIPPED if the
  //           heading is not found, so it never lands in the wrong place).
  //   type  = 'note' | 'stat' | 'table' | 'steps' | 'checklist'.
  // Populate from the article's own fact-checked text. Empty = module no-ops.
  var GFX = {
    accent:'#C08A2D', accent2:'#101C33', ink:'#1E2128', bg:'#F3EFE6',
    surface:'#ffffff', rule:'#D7D2C6', muted:'#5B6472',
    head:'"Saira Condensed","Public Sans",system-ui,sans-serif', body:'"Public Sans",system-ui,sans-serif'
  };
  var GRAPHICS = [
    {
      "slug": "firefighter-salary-california",
      "after": "Base pay by rough rank",
      "type": "stat",
      "data": {
        "kicker": "Entry-level base pay, 2025 to 2026 public reporting",
        "title": "Broad ranges to confirm, not promises",
        "items": [
          {
            "value": "$60k to $85k",
            "label": "Common entry-level base range statewide"
          },
          {
            "value": "High $70k to low $80k",
            "label": "Los Angeles entry pay"
          },
          {
            "value": "Into the $90k",
            "label": "San Francisco entry pay"
          }
        ]
      }
    },
    {
      "slug": "firefighter-salary-california",
      "after": "Overtime: the real story",
      "type": "note",
      "data": {
        "title": "Do not bank on overtime",
        "body": "Some overtime is effectively built into the roughly 56-hour schedule, and wildfire season can add more. But overtime is not guaranteed, it depends on staffing and department policy, and building your budget around the maximum is a mistake.",
        "variant": "warn"
      }
    },
    {
      "slug": "how-to-pass-the-cpat",
      "after": "What the CPAT Actually Is",
      "type": "note",
      "data": {
        "title": "Confirm your test first",
        "body": "Not every California department uses the CPAT. Some use the Biddle Physical Agility Test or their own physical test. Confirm which one your target department requires before you pay.",
        "variant": "warn"
      }
    },
    {
      "slug": "how-to-pass-the-cpat",
      "after": "The 8 CPAT Events",
      "type": "table",
      "data": {
        "title": "The eight CPAT events",
        "headers": [
          "#",
          "Event",
          "What it demands"
        ],
        "rows": [
          [
            "1",
            "Stair Climb",
            "Climb with an extra 25 lbs added (75 lbs total); taxes legs and lungs, no grabbing the rails."
          ],
          [
            "2",
            "Hose Drag",
            "Drag an uncharged hoseline, then pull it in hand over hand; legs, core, grip, and back."
          ],
          [
            "3",
            "Equipment Carry",
            "Remove saws from a cabinet, carry them, and return them; grip endurance and shoulder stability."
          ],
          [
            "4",
            "Ladder Raise and Extension",
            "Raise a ground ladder, then extend the fly with the halyard; grip, shoulders, and control."
          ],
          [
            "5",
            "Forcible Entry",
            "Strike a measuring device with a sledgehammer until the buzzer; full-body power and grip."
          ],
          [
            "6",
            "Search",
            "Crawl through a dark, enclosed tunnel with turns and obstacles; moving under load in tight space."
          ],
          [
            "7",
            "Rescue Drag",
            "Drag a weighted mannequin backward around an obstacle; a leg and grip event late in the course."
          ],
          [
            "8",
            "Ceiling Breach and Pull",
            "Push and pull a hinged panel overhead with a pike pole in cycles; shoulders and grip."
          ]
        ],
        "caption": "Worn in a 50-pound vest on one continuous course with a 10:20 time limit. Fail any event or run out of time and you fail the whole test. Source: FCTC."
      }
    },
    {
      "slug": "firefighter-hiring-process-california",
      "after": "The short version",
      "type": "steps",
      "data": {
        "title": "The California hiring gauntlet, in order",
        "items": [
          {
            "h": "Prerequisites",
            "d": "Earn your EMT, a CPAT card (or a department physical test), and the basics like a diploma or GED, driver license, and minimum age."
          },
          {
            "h": "FCTC written test",
            "d": "Pass the $50, 100-question test and land on the statewide list used by over 170 departments."
          },
          {
            "h": "The application",
            "d": "Apply when a department opens a recruitment, usually through a portal, attaching proof of your certifications."
          },
          {
            "h": "The oral board",
            "d": "Face a panel interview scored against a rubric; the single highest-leverage step you control."
          },
          {
            "h": "Background investigation",
            "d": "An investigator verifies your history through the Personal History Statement; omissions are what sink people."
          },
          {
            "h": "Polygraph, psych, and medical",
            "d": "Some or all apply depending on the department, all tied together by honesty and documentation."
          },
          {
            "h": "Conditional offer and academy",
            "d": "Clear the background to get a conditional offer, then complete the paid academy, commonly about 16 weeks."
          },
          {
            "h": "Probation",
            "d": "Graduate into a probationary period, commonly about 12 months, before you are a permanent firefighter."
          }
        ]
      }
    },
    {
      "slug": "firefighter-hiring-process-california",
      "after": "The background investigation",
      "type": "note",
      "data": {
        "title": "Omissions, not history",
        "body": "People fail the background not because of their past but because of what they leave off the Personal History Statement. Leaving something off that the investigator then finds looks like dishonesty, and that is disqualifying at almost every department.",
        "variant": "warn"
      }
    },
    {
      "slug": "cal-fire-vs-city-vs-county",
      "after": "Differences in the work",
      "type": "table",
      "data": {
        "title": "Three paths, different work",
        "headers": [
          "Path",
          "The work"
        ],
        "rows": [
          [
            "City (municipal)",
            "High call volume, mostly medical, plus structure fires and urban rescues concentrated in a defined city."
          ],
          [
            "County or district",
            "A similar emergency mix over a wider, more varied area that can include significant wildland-urban interface."
          ],
          [
            "CAL FIRE (state)",
            "A strong wildland focus with seasonal surges and the potential for deployment away from your home unit."
          ]
        ],
        "caption": "Hiring differs too: many city and district departments use the FCTC list, while LAFD, Oakland, Anaheim, and Ventura County run their own and CAL FIRE hires through CalCareers. Confirm with each department."
      }
    },
    {
      "slug": "firefighter-schedule-explained",
      "after": "Common schedule patterns",
      "type": "table",
      "data": {
        "title": "Common California shift patterns",
        "headers": [
          "Pattern",
          "How it works",
          "The tradeoff"
        ],
        "rows": [
          [
            "48/96",
            "Work 48 hours straight (two back-to-back 24s), then 96 hours (four days) off, and repeat.",
            "Two long on-duty days back to back in exchange for a clean four-day block off."
          ],
          [
            "24-hour swing",
            "Work a 24, take a day off, work another 24, across several shifts, then a longer break.",
            "Never on more than 24 hours at once, but the off days are more broken up."
          ],
          [
            "Kelly day",
            "An extra day off layered onto a rotation (often a 24/48) to stay within federal hour limits.",
            "Brings the weekly average down, commonly to around 53 hours instead of 56."
          ]
        ],
        "caption": "Most rotations average around 56 hours per week. Patterns vary by department, so confirm the actual schedule before you build your life around it."
      }
    },
    {
      "slug": "how-to-become-a-firefighter-in-california",
      "after": "The Short Version",
      "type": "steps",
      "data": {
        "title": "The path most California candidates follow",
        "items": [
          {
            "h": "Decide it is really what you want",
            "d": "Ride along, talk to working firefighters, and be honest about the shifts, sleep, and time away."
          },
          {
            "h": "Get your EMT certification",
            "d": "Nearly every department expects it; a California EMT certificate is valid for two years."
          },
          {
            "h": "Complete a Firefighter I academy",
            "d": "Most departments want a State Fire Marshal accredited Firefighter I certification or the academy training behind it."
          },
          {
            "h": "Pass the CPAT",
            "d": "Eight timed events in a 50-pound vest, finished in 10 minutes and 20 seconds; the card is generally valid 12 months."
          },
          {
            "h": "Take the FCTC written test",
            "d": "A $50, 100-question test that places you on the Statewide Eligibility List; the score is valid 12 months."
          },
          {
            "h": "Apply to departments",
            "d": "Apply widely; more than 170 departments use the FCTC list and openings are irregular."
          },
          {
            "h": "Pass the oral board",
            "d": "A panel asks structured questions; this is where many strong candidates fall short because they did not prepare."
          },
          {
            "h": "Background, medical, and psychological",
            "d": "A conditional offer usually triggers a detailed background check; be honest on every form from day one."
          },
          {
            "h": "The department academy",
            "d": "The paid department academy is demanding and many run roughly 16 to 24 weeks."
          },
          {
            "h": "Probation",
            "d": "A probationary period, commonly around 12 months, before you are a permanent firefighter."
          }
        ]
      }
    },
    {
      "slug": "how-to-become-a-firefighter-in-california",
      "after": "Realistic Timeline and Cost",
      "type": "stat",
      "data": {
        "kicker": "Ballpark figures, confirm with each provider",
        "items": [
          {
            "value": "3 to 5 years",
            "label": "Typical time from starting out to a permanent position"
          },
          {
            "value": "$50",
            "label": "FCTC written test"
          },
          {
            "value": "$160",
            "label": "CPAT (test plus two orientations)"
          },
          {
            "value": "$1,300 to $2,700",
            "label": "EMT course at a CA community college (ballpark)"
          }
        ]
      }
    },
    {
      "slug": "firefighter-oral-board-questions",
      "after": "How to prepare",
      "type": "checklist",
      "data": {
        "title": "Prepare so the panel can score you",
        "items": [
          "Build a story bank of six to ten real STAR stories from work, sports, military, volunteering, or school.",
          "Practice your answers out loud, ideally to another person, with a timer.",
          "Do a realistic mock board with someone who scores you honestly.",
          "Research the department: its stations, the community it serves, its mission, and recent news.",
          "Handle the basics: show up early, in a clean suit, with a firm handshake and eye contact."
        ]
      }
    },
    {
      "slug": "firefighter-oral-board-questions",
      "after": "The STAR method",
      "type": "steps",
      "data": {
        "kicker": "For any question about your experience",
        "title": "STAR",
        "items": [
          {
            "h": "Situation",
            "d": "Briefly set the scene: where you were and what was happening."
          },
          {
            "h": "Task",
            "d": "Explain your responsibility or the challenge you faced."
          },
          {
            "h": "Action",
            "d": "Say what you specifically did, using I, not we; this is the heart of the answer."
          },
          {
            "h": "Result",
            "d": "Share how it turned out and, ideally, what you learned."
          }
        ]
      }
    },
    {
      "slug": "personal-history-statement-explained",
      "after": "Why omissions sink people",
      "type": "note",
      "data": {
        "title": "Disclose everything",
        "body": "A single imperfection in your past is very often survivable. What is usually not survivable is lying or leaving something out. The mistake you disclose is a data point; the mistake you hide and they find is a character finding. When in doubt, disclose.",
        "variant": "warn"
      }
    },
    {
      "slug": "personal-history-statement-explained",
      "after": "What to gather before you start",
      "type": "checklist",
      "data": {
        "title": "Assemble your records file first",
        "items": [
          "Addresses: every place you have lived, with dates, often going back 7 to 10 years.",
          "Employment: every job with employer, supervisor, dates, and reason for leaving.",
          "Education: schools, dates, and any diploma, GED, degree, or certificate.",
          "Driving record: your DMV record, tickets, accidents, and any license suspensions.",
          "Financial history: debts, collections, bankruptcies, and judgments (pull your credit report).",
          "Legal history: every arrest, citation, charge, and conviction.",
          "References: personal and professional, with current contact information.",
          "Drug and alcohol history, and military records (DD-214) if applicable."
        ]
      }
    },
    {
      "slug": "engine-vs-truck-company",
      "after": "The simple version",
      "type": "table",
      "data": {
        "title": "Engine vs truck at a glance",
        "headers": [
          "Role",
          "Engine company",
          "Truck company"
        ],
        "rows": [
          [
            "Core job",
            "Puts water on the fire: stretches and advances hose lines.",
            "Everything else: forcible entry, search, ventilation, laddering, overhaul."
          ],
          [
            "Tools",
            "Pump, hose, and a water supply from a hydrant.",
            "Ladders, saws, forcible-entry tools, and rescue equipment."
          ],
          [
            "Medical calls",
            "Carries a heavy share of the medical volume.",
            "Responds too, but the engine typically carries more."
          ],
          [
            "Culture",
            "Prides itself on aggressive fire attack and the medical grind.",
            "Prides itself on craft, tools, and the trades work."
          ]
        ],
        "caption": "Both are essential and work together on a fire. Assignments and staffing vary by department."
      }
    },
    {
      "slug": "how-to-promote-to-fire-captain",
      "after": "How to prepare for the captain promotion",
      "type": "steps",
      "data": {
        "title": "How to prepare for the captain promotion",
        "items": [
          {
            "h": "Start the Fire Officer 2 (formerly Company Officer) coursework early",
            "d": "The OSFM certification takes real time, so begin the course series well before you are eligible."
          },
          {
            "h": "Read the reading list, then your SOPs",
            "d": "The written exam pulls from published texts and, heavily, from your own department's procedures."
          },
          {
            "h": "Drill the assessment-center exercises",
            "d": "Practice in-baskets, talk through tactical simulations out loud, and rehearse oral-interview questions."
          },
          {
            "h": "Act like a captain now",
            "d": "Run the company when your captain is out and take on the tactical, personnel, and training work."
          }
        ]
      }
    }
  ];

  function gfxShell(title, kicker){
    var w = el('figure','margin:2rem 0;padding:1.25rem 1.4rem;background:'+GFX.surface+';border:1px solid '+GFX.rule+';border-top:4px solid '+GFX.accent+';');
    if (kicker) w.appendChild(el('figcaption','font:700 .64rem/1 '+GFX.head+';letter-spacing:.14em;text-transform:uppercase;color:'+GFX.accent+';margin-bottom:.6rem;', kicker));
    if (title)  w.appendChild(el('div','font:600 1.12rem/1.3 '+GFX.head+';color:'+GFX.ink+';margin-bottom:.85rem;', title));
    return w;
  }
  function renderNote(g){
    var d=g.data||{}, warn=(d.variant==='warn');
    var box=el('aside','margin:2rem 0;padding:1.05rem 1.3rem;background:'+GFX.bg+';border:1px solid '+GFX.rule+';');
    if(d.title) box.appendChild(el('div','font:700 .66rem/1 '+GFX.head+';letter-spacing:.12em;text-transform:uppercase;color:'+(warn?GFX.accent:GFX.accent2)+';margin-bottom:.4rem;', d.title));
    if(d.body)  box.appendChild(el('div','font:400 .96rem/1.55 '+GFX.body+';color:'+GFX.ink+';', d.body));
    return box;
  }
  function renderStat(g){
    var d=g.data||{}, w=gfxShell(d.title, d.kicker||'By the numbers');
    var row=el('div','display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:1rem;');
    (d.items||[]).forEach(function(it){
      var c=el('div');
      c.appendChild(el('div','font:700 1.7rem/1 '+GFX.head+';color:'+GFX.accent+';', it.value));
      c.appendChild(el('div','font:500 .82rem/1.35 '+GFX.body+';color:'+GFX.muted+';margin-top:.3rem;', it.label));
      row.appendChild(c);
    });
    w.appendChild(row); return w;
  }
  function renderTable(g){
    var d=g.data||{}, w=gfxShell(d.title, d.kicker||'At a glance');
    var scroll=el('div','overflow-x:auto;');
    var t=el('table','width:100%;border-collapse:collapse;font:400 .9rem/1.4 '+GFX.body+';color:'+GFX.ink+';');
    if(d.headers){ var thead=el('thead'), tr=el('tr');
      d.headers.forEach(function(h){ tr.appendChild(el('th','text-align:left;padding:.55rem .7rem;background:'+GFX.accent2+';color:#fff;font:600 .82rem '+GFX.body+';', h)); });
      thead.appendChild(tr); t.appendChild(thead); }
    var tb=el('tbody');
    (d.rows||[]).forEach(function(r,ri){ var tr=el('tr', ri%2?'background:'+GFX.bg+';':'');
      r.forEach(function(cell){ tr.appendChild(el('td','padding:.5rem .7rem;border-bottom:1px solid '+GFX.rule+';', cell)); });
      tb.appendChild(tr); });
    t.appendChild(tb); scroll.appendChild(t); w.appendChild(scroll);
    if(d.caption) w.appendChild(el('div','font:400 .78rem/1.4 '+GFX.body+';color:'+GFX.muted+';margin-top:.6rem;', d.caption));
    return w;
  }
  function renderSteps(g){
    var d=g.data||{}, w=gfxShell(d.title, d.kicker||'Step by step');
    var ol=el('div');
    (d.items||[]).forEach(function(it,i){
      var row=el('div','display:flex;gap:.85rem;padding:.6rem 0;'+(i?'border-top:1px solid '+GFX.rule+';':''));
      row.appendChild(el('div','flex:0 0 auto;width:1.7rem;height:1.7rem;border-radius:50%;background:'+GFX.accent2+';color:#fff;font:700 .9rem/1.7rem '+GFX.head+';text-align:center;', String(i+1)));
      var body=el('div');
      body.appendChild(el('div','font:600 .98rem/1.35 '+GFX.body+';color:'+GFX.ink+';', it.h));
      if(it.d) body.appendChild(el('div','font:400 .9rem/1.5 '+GFX.body+';color:'+GFX.muted+';margin-top:.15rem;', it.d));
      row.appendChild(body); ol.appendChild(row);
    });
    w.appendChild(ol); return w;
  }
  function renderChecklist(g){
    var d=g.data||{}, w=gfxShell(d.title, d.kicker||'Checklist');
    var ul=el('div');
    (d.items||[]).forEach(function(it){
      var row=el('div','display:flex;gap:.6rem;align-items:flex-start;padding:.35rem 0;');
      row.appendChild(el('div','flex:0 0 auto;color:'+GFX.accent+';font:700 1rem/1.4 '+GFX.body+';','✓'));
      row.appendChild(el('div','font:400 .95rem/1.5 '+GFX.body+';color:'+GFX.ink+';', it));
      ul.appendChild(row);
    });
    w.appendChild(ul); return w;
  }
  function renderGraphic(g){
    switch(g.type){
      case 'note': return renderNote(g);
      case 'stat': return renderStat(g);
      case 'table': return renderTable(g);
      case 'steps': return renderSteps(g);
      case 'checklist': return renderChecklist(g);
    }
    return null;
  }
  function graphics(slug, host){
    var mine = GRAPHICS.filter(function(x){ return x.slug===slug; });
    if(!mine.length) return;
    var heads = host.querySelectorAll('h2, h3');
    mine.forEach(function(g, idx){
      var id='gsf-gfx-'+idx; if(byId(id)) return;
      var node; try{ node=renderGraphic(g); }catch(e){ node=null; }
      if(!node) return; node.id=id;
      var want=(g.after||'').toLowerCase(), anchor=null, i;
      if(want){ for(i=0;i<heads.length;i++){ if((heads[i].textContent||'').toLowerCase().indexOf(want)!==-1){ anchor=heads[i]; break; } } if(!anchor) return; }
      if(anchor){ anchor.parentNode.insertBefore(node, anchor.nextSibling); }
      else { host.appendChild(node); }
    });
  }

  // Temporary presentation recovery for confirmed empty native title fields.
  // Native data still needs repair. Never replace an existing non-empty H1.
  var EMPTY_NATIVE_TITLES = ["fire-officer-certification-california", "wildland-firefighter-career-california", "why-probationary-firefighters-fail", "what-firefighters-actually-do-all-day", "should-you-become-a-firefighter-paramedic", "how-to-be-a-good-firefighter", "firefighter-mental-health", "fire-service-specialties-explained", "california-firefighter-pension-retirement", "what-fire-academy-is-like-california", "how-to-stand-out-and-get-hired-as-a-firefighter", "firefighter-tattoos-grooming-standards-california", "firefighter-schedule-explained", "fire-explorer-cadet-programs-california", "engine-vs-truck-company", "am-i-too-old-to-become-a-firefighter-california", "firefighter-oral-board-questions", "firefighter-hiring-process-california", "do-you-need-emt-before-applying-firefighter-california", "firefighter-salary-california", "is-being-a-firefighter-worth-it"];
  function restoreEmptyTitle(slug) {
    if (EMPTY_NATIVE_TITLES.indexOf(slug) === -1) return;
    var h = document.querySelector('h1.entry-title[data-content-field="title"]');
    var a = findArticle(slug);
    if (h && a && !(h.textContent || '').trim()) {
      h.textContent = a.t;
      h.setAttribute('data-gsf-title-recovered', '2026-09-06');
    }
  }

  // Source-verified presentation corrections pending native-body repair.
  // Preflight all anchors; preserve any later native edit. Sources/receipts in sprint implementation.
  var AGE_COPY_FIXES = [
  {
    "selector": "p",
    "oldText": "No, you are almost certainly not too old. California fire departments do not set a maximum hiring age, and it is against the law for them to reject you simply because of how old you are. Plenty of people pin on a badge in their thirties and forties, often after a first career somewhere else. The real questions are not about the calendar. They are whether you can pass the physical test, whether you are honest about the years the process takes, and whether the pension math still works for you. Let us walk through all three.",
    "newHtml": "<p>Being in your thirties or forties does not by itself rule out a California firefighter career. LAFD, for example, publishes no upper age limit. Check the current requirements for the department and position you want, then plan around the physical test, hiring timeline, and retirement system.</p>"
  },
  {
    "selector": "p",
    "oldText": "There is no maximum age limit to become a firefighter in California. The City of Los Angeles Fire Department states this plainly in its qualifications (as of 2026, confirm the current bulletin): there is no maximum age to apply. That is the norm across the state, not the exception.",
    "newHtml": "<p>The <a href=\"https://www.joinlafd.org/qualifications-and-selection-process\">City of Los Angeles Fire Department</a> currently requires applicants to be at least 18 and publishes no upper age limit. Check the current recruitment bulletin for every department you are considering, because employer and position requirements differ.</p>"
  },
  {
    "selector": "p",
    "oldText": "The reason there is no ceiling is legal, not just cultural. The federal Age Discrimination in Employment Act protects workers 40 and older, and California's own Fair Employment and Housing Act protects applicants 40 and older as well. Local fire departments cannot post a \"must be under 35\" rule the way some federal jobs can. So when you see a 35 or 37 cutoff online, it is almost always talking about a federal firefighter track or another state, not a California city or county department.",
    "newHtml": "<p>Age-discrimination protections do not settle every firefighter hiring rule. The federal <a href=\"https://www.eeoc.gov/statutes/age-discrimination-employment-act-1967\">Age Discrimination in Employment Act</a> generally protects people 40 and older, but section 623(j) includes an exception for certain state and local firefighter hiring plans. Confirm the rule for the exact employer and role with its hiring office.</p>"
  },
  {
    "selector": "p",
    "oldText": "There is no maximum age limit at California fire departments. The minimum is usually 18, and some departments require 21 for a permanent position. Age-based rejection of applicants 40 and older is prohibited under federal and California employment law. Always confirm the exact minimum with the department.",
    "newHtml": "<p>LAFD currently requires applicants to be at least 18 and publishes no upper age limit. Other employers and positions can have different requirements. Read the current bulletin and confirm any age rule with the hiring office before you apply.</p>"
  },
  {
    "selector": "p",
    "oldText": "Legally, yes. There is no maximum age. The practical questions get sharper the later you start: passing the physical test, surviving a demanding academy, and whether enough working years remain to build the pension you want. At 45 it is very doable. At 50-plus, do a hard, honest cost-benefit check first, including a conversation with CalPERS.",
    "newHtml": "<p>Starting at 45 or 50 can be an option at a department without an upper hiring age, such as LAFD. Confirm the current requirements first. Then weigh the physical test, academy demands, hiring timeline, and the working years available to build retirement benefits with the relevant retirement system.</p>"
  },
  {
    "selector": "li",
    "oldText": "U.S. Age Discrimination in Employment Act (protects workers 40+) and California's Fair Employment and Housing Act (protects applicants 40+) - basis for the no-maximum-age norm.",
    "newHtml": "<li><a href=\"https://www.eeoc.gov/statutes/age-discrimination-employment-act-1967\">U.S. Age Discrimination in Employment Act</a>, sections 623(j) and 631(a), covers certain firefighter hiring exceptions and the general age-40 threshold for protection.</li>"
  },
  {
    "selector": "p",
    "oldText": "Not your birth year. Three real things:",
    "newHtml": "<p>After confirming the department's age requirements, consider three practical questions:</p>"
  },
  {
    "selector": "p",
    "oldText": "No. Forty is a common starting age for career-changers in the fire service. The barriers are physical readiness, the multi-year timeline, and your pension math, not the number itself. If you can pass the CPAT and commit to the process, 40 is workable.",
    "newHtml": "<p>Age 40 does not rule you out at an employer such as LAFD, which lists no upper age limit. Check the current qualifications, then assess the physical requirements, hiring timeline, and retirement implications.</p>"
  },
  {
    "selector": "p",
    "oldText": "Not because of age. Departments cannot score you down for being older, and many value the maturity and work history a second-career candidate brings. The only disadvantage is if you show up out of shape or unwilling to start at the bottom. Both are within your control.",
    "newHtml": "<p>A second-career applicant may bring relevant work experience and maturity. Eligibility and selection depend on the employer's current requirements and assessment process. Ask the hiring office about its rules; do not rely on a general promise that age can never affect eligibility.</p>"
  }
];
  function applyVerifiedCopyRepairs(slug, host) {
    if (slug === 'how-to-pass-the-cpat') {
      var hose = Array.prototype.slice.call(host.querySelectorAll('.d, td, p')).filter(function(n) {
        return (n.textContent || '').trim() === 'Pull a charged line, then kneel and pull hand over hand.';
      });
      if (hose.length === 1) hose[0].textContent = 'Drag an uncharged hose, then kneel and pull hand over hand.';
    }
    if (slug !== 'am-i-too-old-to-become-a-firefighter-california') return;
    function norm(x) { return (x || '').replace(/\s+/g, ' ').trim(); }
    var changes = [];
    for (var i = 0; i < AGE_COPY_FIXES.length; i++) {
      var f = AGE_COPY_FIXES[i], tmp = document.createElement('template');
      tmp.innerHTML = f.newHtml;
      var replacement = tmp.content.firstElementChild;
      var nodes = Array.prototype.slice.call(host.querySelectorAll(f.selector));
      var matches = nodes.filter(function(n) { return norm(n.textContent) === norm(f.oldText); });
      if (matches.length === 0 && nodes.some(function(n) { return norm(n.textContent) === norm(replacement.textContent); })) continue;
      if (matches.length !== 1) return;
      changes.push({old:matches[0], next:replacement});
    }
    changes.forEach(function(c) { c.old.parentNode.replaceChild(c.next, c.old); });
    host.setAttribute('data-gsf-copy-reviewed', '2026-09-06');
  }

  function relatedGroup(a) {
    return /tax|457b|pension|money|salary|incentive-pay|schedule/.test(a.s) ? 'Pay and benefits' : a.p;
  }
  var RELATED_PRIORITY = {
  "am-i-too-old-to-become-a-firefighter-california": [
    "how-long-to-become-a-firefighter-california",
    "become-a-firefighter-california-without-quitting-your-job",
    "how-to-become-a-firefighter-in-california"
  ],
  "firefighter-tattoos-grooming-standards-california": [
    "firefighter-background-investigation",
    "personal-history-statement-explained",
    "firefighter-hiring-process-california"
  ],
  "fire-officer-certification-california": [
    "how-to-promote-to-fire-captain",
    "how-to-promote-to-fire-engineer",
    "how-to-promote-in-the-fire-service-california"
  ],
  "calpers-pension-taxes": [
    "california-firefighter-pension-retirement",
    "retired-firefighter-tax-breaks",
    "457b-california-firefighters"
  ],
  "firefighter-salary-california": [
    "firefighter-schedule-explained",
    "firefighter-incentive-pay",
    "california-firefighter-pension-retirement"
  ],
  "how-long-to-become-a-firefighter-california": [
    "how-to-become-a-firefighter-in-california",
    "do-you-need-emt-before-applying-firefighter-california",
    "become-a-firefighter-california-without-quitting-your-job"
  ],
  "fctc-written-test-explained": [
    "fctc-statewide-eligibility-list-explained",
    "how-to-pass-the-cpat",
    "firefighter-hiring-process-california"
  ],
  "fctc-statewide-eligibility-list-explained": [
    "fctc-written-test-explained",
    "how-to-pass-the-cpat",
    "firefighter-hiring-process-california"
  ],
  "do-you-need-emt-before-applying-firefighter-california": [
    "academy-or-paramedic-first-california",
    "fire-academy-vs-fire-technology-california",
    "firefighter-hiring-process-california"
  ]
};

  // ---- 1. Keep Reading ---------------------------------------------------
  function keepReading(slug, host){
    if (byId('gsf-keep-reading')) return;
    var me = findArticle(slug), i;
    if (!me) return;
    var base = currentBase();
    var group = relatedGroup(me);
    var same = ARTICLES.filter(function(a){ return a.s!==slug && relatedGroup(a)===group; });
    var seed = slug.length;
    function rot(arr){ return arr.slice(seed % (arr.length||1)).concat(arr.slice(0, seed % (arr.length||1))); }
    var preferred = (RELATED_PRIORITY[slug] || []).map(findArticle).filter(Boolean);
    var seen = {};
    var picks = preferred.concat(rot(same)).filter(function(a) {
      if (a.s === slug || seen[a.s]) return false;
      seen[a.s] = true; return true;
    }).slice(0, CFG.maxRelated);
    if (!picks.length) return;

    var b = CFG.brand;
    var wrap = el('section', 'margin:3.5rem 0 1rem;padding-top:2rem;border-top:3px solid '+b.navy+';');
    wrap.id = 'gsf-keep-reading';
    wrap.setAttribute('data-gsf-related-group', group);
    wrap.appendChild(el('div',
      'font:700 .72rem/1 "Saira Condensed","Public Sans",system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:'+b.brass+';margin-bottom:1rem;',
      'Keep Reading'));
    var grid = el('div','display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:1rem;');
    picks.forEach(function(a){
      var card = el('a', 'display:block;padding:1rem 1.1rem;background:'+b.bone+';border:1px solid '+b.rule+';text-decoration:none;color:'+b.char+';transition:border-color .15s;');
      card.href = base + a.s;
      card.setAttribute('data-gsf-resource', a.s);
      card.onmouseover = function(){ card.style.borderColor = b.brass; };
      card.onmouseout  = function(){ card.style.borderColor = b.rule; };
      card.appendChild(el('div','font:600 1.02rem/1.3 "Public Sans",system-ui,sans-serif;color:'+b.navy+';', a.t));
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    host.appendChild(wrap);
  }

  // ---- 2. FAQ polish -----------------------------------------------------
  function faqPolish(host){
    var heads = host.querySelectorAll('h2, h3');
    var b = CFG.brand, inFaq = false;
    for (var i=0;i<heads.length;i++){
      var h = heads[i], txt = (h.textContent||'').trim().toLowerCase();
      if (h.tagName==='H2'){ inFaq = /frequently asked|faq|common questions/.test(txt); continue; }
      if (inFaq && h.tagName==='H3' && !h.getAttribute('data-gsf-faq')){
        h.setAttribute('data-gsf-faq','1');
        h.style.color = b.navy;
        h.style.marginTop = '1.6rem';
      }
    }
  }

  // ---- 3. Callouts -------------------------------------------------------
  function callout(slug, host){
    if (!CALLOUTS.length || byId('gsf-callout')) return;
    var me = findArticle(slug), i;
    var hay = (slug + ' ' + (me?me.t:'')).toLowerCase();
    var hit = null;
    for (i=0;i<CALLOUTS.length;i++){
      var c = CALLOUTS[i];
      if (!c.href || c.href.indexOf('REPLACE_WITH')!==-1) continue; // dormant until real URL
      var m = c.match || [];
      for (var j=0;j<m.length;j++){ if (hay.indexOf(String(m[j]).toLowerCase())!==-1){ hit=c; break; } }
      if (hit) break;
    }
    if (!hit) return;
    var b = CFG.brand;
    var box = el('aside','margin:2.25rem 0;padding:1.25rem 1.4rem;background:#fff;border:1px solid '+b.rule+';border-top:4px solid '+b.brass+';');
    box.id = 'gsf-callout';
    box.appendChild(el('div','font:700 .66rem/1 "Saira Condensed","Public Sans",system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:'+b.brass+';margin-bottom:.5rem;','Recommended'));
    if (hit.title) box.appendChild(el('div','font:600 1.1rem/1.3 "Public Sans",system-ui,sans-serif;color:'+b.navy+';margin-bottom:.4rem;', hit.title));
    if (hit.body)  box.appendChild(el('div','font:400 .95rem/1.5 "Public Sans",system-ui,sans-serif;color:'+b.slate+';margin-bottom:.8rem;', hit.body));
    if (hit.cta && hit.href){
      var a = el('a','display:inline-block;padding:.55rem 1.1rem;background:'+b.navy+';color:#fff;text-decoration:none;font:600 .9rem "Public Sans",system-ui,sans-serif;', hit.cta);
      a.href = hit.href; a.rel = 'sponsored noopener'; a.target = '_blank';
      box.appendChild(a);
    }
    var h2s = host.querySelectorAll('h2');
    if (h2s.length >= 2){ h2s[1].parentNode.insertBefore(box, h2s[1].nextSibling); }
    else { host.appendChild(box); }
  }

  // ---- 4. On this page (TOC) ---------------------------------------------
  function headingId(h, idx){
    if (h.id) return h.id;
    var base = (h.textContent||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').substring(0,60) || 'section-'+(idx+1);
    var id = base, n = 2;
    while (byId(id)) { id = base + '-' + n; n++; }
    h.id = id;
    return id;
  }
  function toc(host){
    if (byId('gsf-toc')) return;
    var all = host.querySelectorAll('h2'), h2s = [], i;
    for (i=0;i<all.length;i++){
      var h = all[i];
      if (h.closest && h.closest('#gsf-keep-reading, #gsf-callout')) continue; // skip injected UI
      if ((h.textContent||'').trim()) h2s.push(h);
    }
    if (h2s.length < 4) return;
    var firstP = host.querySelector('p');
    if (!firstP || !firstP.parentNode) return;

    var b = CFG.brand;
    var box = el('nav','margin:1.75rem 0;padding:1rem 1.2rem;background:'+b.bone+';border:1px solid '+b.rule+';');
    box.id = 'gsf-toc';
    box.setAttribute('aria-label','On this page');

    var head = el('div','display:flex;align-items:center;justify-content:space-between;gap:.75rem;');
    head.appendChild(el('div','font:600 .68rem/1 "IBM Plex Mono",ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:'+b.brass+';','On this page'));
    var toggle = el('button','background:none;border:1px solid '+b.rule+';color:'+b.navy+';font:600 .64rem/1 "IBM Plex Mono",ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;padding:.35rem .6rem;cursor:pointer;display:none;');
    toggle.type = 'button';
    head.appendChild(toggle);
    box.appendChild(head);

    var list = el('div','margin-top:.7rem;');
    h2s.forEach(function(h, idx){
      var id = headingId(h, idx);
      var a = el('a','display:block;padding:.28rem 0;font:400 .92rem/1.4 "Public Sans",system-ui,sans-serif;color:'+b.navy+';text-decoration:underline;text-underline-offset:2px;');
      a.href = '#' + id;
      a.textContent = (h.textContent||'').trim();
      a.onclick = function(ev){
        var target = byId(id), smoothOK = false;
        try { smoothOK = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: no-preference)').matches); } catch(e){}
        if (!smoothOK || !target || !target.scrollIntoView) return; // default instant jump
        ev.preventDefault();
        target.scrollIntoView({ behavior:'smooth', block:'start' });
        try { if (history.replaceState) history.replaceState(null, '', '#'+id); } catch(e){}
      };
      list.appendChild(a);
    });
    box.appendChild(list);

    var open = true;
    function setOpen(v){
      open = v;
      list.style.display = v ? '' : 'none';
      toggle.textContent = v ? 'Hide' : 'Show';
      toggle.setAttribute('aria-expanded', v ? 'true' : 'false');
    }
    toggle.onclick = function(){ setOpen(!open); };
    function applyMode(narrow){
      toggle.style.display = narrow ? '' : 'none';
      setOpen(!narrow);
    }
    var mq = null;
    try { mq = window.matchMedia && window.matchMedia('(max-width: 699.98px)'); } catch(e){}
    applyMode(!!(mq && mq.matches));
    if (mq){
      var onMq = function(e){ applyMode(e.matches); };
      if (mq.addEventListener) mq.addEventListener('change', onMq);
      else if (mq.addListener) mq.addListener(onMq);
    }

    firstP.parentNode.insertBefore(box, firstP.nextSibling);
  }

  // ---- 5. External-link marker -------------------------------------------
  function externalLinks(host){
    var links = host.querySelectorAll('a[href]'), i;
    for (i=0;i<links.length;i++){
      var a = links[i];
      if (a.getAttribute('data-gsf-ext')) continue;
      if (a.closest && a.closest('#gsf-toc, #gsf-keep-reading, #gsf-callout')) continue; // injected UI handles itself
      var href = a.getAttribute('href') || '';
      if (!/^https?:\/\//i.test(href)) continue;
      var ext = false;
      try { ext = new URL(href, location.href).host !== location.host; } catch(e){}
      if (!ext) continue;
      a.setAttribute('data-gsf-ext','1');
      if (a.target === '_blank'){
        if (!a.title) a.title = 'opens in a new tab';
        var rel = a.getAttribute('rel') || '';
        if (!/\bnoopener\b/i.test(rel)) a.setAttribute('rel', (rel ? rel + ' ' : '') + 'noopener');
      }
      if (a.querySelector('img')) continue; // no marker on image links
      var mark = el('span','font:600 .72em/1 "Public Sans",system-ui,sans-serif;vertical-align:super;margin-left:.18em;color:'+CFG.brand.slate+';');
      mark.textContent = '↗︎'; // text-presentation north-east arrow, not an emoji
      mark.setAttribute('aria-hidden','true');
      a.appendChild(mark);
    }
  }

  // ---- boot --------------------------------------------------------------
  function run(){
    var slug = currentSlug();
    if (!slug || !findArticle(slug)) return;   // only on verified article pages
    restoreEmptyTitle(slug);
    var host = contentEl();
    if (!host) return;
    applyVerifiedCopyRepairs(slug, host);
    try { graphics(slug, host); } catch(e){}
    try { toc(host); } catch(e){}
    try { callout(slug, host); } catch(e){}
    try { faqPolish(host); } catch(e){}
    try { keepReading(slug, host); } catch(e){}
    try { externalLinks(host); } catch(e){}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

/* ==========================================================================
   GSF ANALYTICS EVENT LAYER  (added 2026-08-19)
   --------------------------------------------------------------------------
   Fires the GSF core conversion events as GA4 gtag events. This module is a
   deliberate NO-OP until a GA4 tag is present on the page: every send goes
   through send(), which returns immediately unless window.gtag is a function.
   Installing the measurement ID in Squarespace (Settings > Developer Tools >
   External API Keys, the "Google Analytics account number" field) is what
   switches it on. Never install the tag through Code Injection via API.

   Event contract is documented in Admin & Brand/analytics-event-dictionary.md.
   Keep the two in sync. This IIFE is separate from the article layer above
   because that one returns early on non-article pages; this one runs sitewide.
   ========================================================================== */
(function () {
  'use strict';

  var TOOLS = {
    gsfcalc: 'cost_calculator',
    gsfdrill: 'oral_board_drill',
    gsfq: 'where_am_i',
    gsfd: 'department_directory',
    gsf457: '457b_maximizer',
    gsffee: 'fee_drag',
    gsfpens: 'pension_estimator',
    gsfqot: 'qualified_ot_estimator',
    gsfs: 'competitiveness_scorecard',
    gsftd: 'testing_decoder'
  };

  var fired = {};

  function send(name, params) {
    if (typeof window.gtag !== 'function') return false;   // dormant until GA4 ships
    try { window.gtag('event', name, params || {}); } catch (e) { return false; }
    return true;
  }

  function once(key, name, params) {
    if (fired[key]) return;
    fired[key] = true;
    send(name, params);
  }

  function path() { return (location.pathname || '').replace(/\/+$/, '') || '/'; }

  function isRoadmapPage() { return /^\/free-roadmap$/i.test(path()); }
  function isJobsPage() { return /^\/jobs$/i.test(path()); }
  function isDirectoryPage() { return /^\/department-directory$/i.test(path()); }

  function toolRootOf(node) {
    if (!node || !node.closest) return null;
    for (var id in TOOLS) {
      if (Object.prototype.hasOwnProperty.call(TOOLS, id) && node.closest('#' + id)) {
        return { id: id, name: TOOLS[id] };
      }
    }
    return null;
  }

  function isVisible(el) {
    if (!el) return false;
    if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
    return (el.textContent || '').trim().length > 0;
  }

  // ---- 1. roadmap_view ----------------------------------------------------
  function roadmapView() {
    if (!isRoadmapPage()) return;
    once('roadmap_view', 'roadmap_view', { page_path: path() });
  }

  // ---- 2 and 3. known MailerLite attempts and provider acceptance ---------
  // An accepted request is not proof of an active subscriber or inbox delivery.
  // Match the provider form, never infer subscription intent from the page URL.
  var MAILERLITE_FORMS = {
    hzJv5U: { context: 'roadmap', accepted: 'roadmap_request_accepted' }
  };
  var formStates = typeof WeakMap === 'function' ? new WeakMap() : null;

  function formSubmits() {
    document.addEventListener('submit', function (e) {
      var form = e.target;
      if (!form || form.nodeName !== 'FORM' || !form.closest) return;
      var wrap = form.closest('.ml-embedded[data-form]');
      var formId = wrap && wrap.getAttribute('data-form');
      var config = formId && MAILERLITE_FORMS[formId];
      if (!config || !Object.prototype.hasOwnProperty.call(MAILERLITE_FORMS, formId)) return;
      // MailerLite marks required fields with classes, not the HTML required attribute.
      var email = form.querySelector('input[type="email"]');
      if (!email || !(email.value || '').trim() || !email.checkValidity()) return;
      if (typeof form.checkValidity !== 'function' || !form.checkValidity()) return;
      if (!form.getClientRects().length) return;
      var params = { form_id: formId, page_path: path(), list_context: config.context,
        submission_state: 'attempt' };
      var attemptName = isRoadmapPage() ? 'roadmap_submit' : 'newsletter_signup';
      once(attemptName + '_' + formId, attemptName, params);
      if (!formStates || typeof MutationObserver !== 'function') return;
      var state = formStates.get(wrap);
      if (state) return;
      state = { accepted: false, observer: null };
      formStates.set(wrap, state);
      function providerAccepted() {
        if (state.accepted) return;
        var success = wrap.querySelector('.ml-form-successBody');
        if (!success || !success.getClientRects().length) return;
        var style = getComputedStyle(success);
        if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return;
        state.accepted = true;
        once('provider_accepted_' + formId, config.accepted, {
          form_id: formId, page_path: path(), list_context: config.context,
          submission_state: 'provider_accepted', confirmation_state: 'not_verified'
        });
        if (state.observer) state.observer.disconnect();
      }
      state.observer = new MutationObserver(providerAccepted);
      state.observer.observe(wrap, { subtree: true, childList: true, attributes: true,
        attributeFilter: ['style', 'class', 'hidden'] });
      // Check only after this valid submit; an initially visible panel is not a signup.
      setTimeout(providerAccepted, 0);
    }, true);
  }

  // ---- 4. tool_start ------------------------------------------------------
  function toolStart() {
    function handler(e) {
      var t = toolRootOf(e.target);
      if (!t) return;
      once('tool_start_' + t.id, 'tool_start', {
        tool_id: t.id, tool_name: t.name, page_path: path()
      });
    }
    document.addEventListener('click', handler, true);
    document.addEventListener('change', handler, true);
    document.addEventListener('input', handler, true);
  }

  // ---- 5. tool_complete ---------------------------------------------------
  // Two signals: the calculator tools all use an id ending in "-go" for the
  // action button and "-res" for the result panel. The quiz-style tools have
  // neither, so a MutationObserver on the tool root catches a result panel
  // that becomes visible and non-empty.
  // Result panels on the quiz-style tools carry classes like "res-tag" and
  // "res-step" rather than an id containing "res", so an id-only selector never
  // matched them. The selector below matches those, and deliberately does NOT
  // match a reset control (id "gsfd-reset" contains "res" but does not end
  // "-res", and the class "reset" does not contain "res-").
  var RESULT_SEL = '[id$="-res"], [id$="-result"], [id$="-results"], ' +
                   '[class*="res-"], [class*="result-"], [class$="-result"], [class$="-results"]';

  // Tools with neither an action button nor a result panel need their completion
  // named explicitly. The oral board drill is the case: reading the model answer
  // or the tips IS the payoff, and nothing on the page ends in "-go" or "res-".
  var COMPLETE_CLICK = {
    gsfdrill: '#gsfdrill-reveal, #gsfdrill-exbtn'
  };

  function toolComplete() {
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      var el = e.target.closest('[id$="-go"]');
      var t = el ? toolRootOf(el) : null;
      if (!t) {
        for (var id in COMPLETE_CLICK) {
          if (!Object.prototype.hasOwnProperty.call(COMPLETE_CLICK, id)) continue;
          if (e.target.closest(COMPLETE_CLICK[id])) { t = { id: id, name: TOOLS[id] }; break; }
        }
      }
      if (!t) return;
      once('tool_complete_' + t.id, 'tool_complete', {
        tool_id: t.id, tool_name: t.name, page_path: path(), signal: 'action_button'
      });
    }, true);

    if (typeof MutationObserver !== 'function') return;
    Object.keys(TOOLS).forEach(function (id) {
      var root = document.getElementById(id);
      if (!root) return;
      // Anything already matching at boot is not a completion signal.
      var initial = root.querySelectorAll(RESULT_SEL);
      for (var k = 0; k < initial.length; k++) { initial[k].__gsfInitial = true; }
      var obs = new MutationObserver(function () {
        var panels = root.querySelectorAll(RESULT_SEL);
        for (var i = 0; i < panels.length; i++) {
          if (panels[i].__gsfInitial) continue;   // present before any interaction
          if (isVisible(panels[i])) {
            once('tool_complete_' + id, 'tool_complete', {
              tool_id: id, tool_name: TOOLS[id], page_path: path(), signal: 'result_panel'
            });
            obs.disconnect();
            return;
          }
        }
      });
      obs.observe(root, { childList: true, subtree: true, attributes: true, characterData: true });
    });
  }

  // ---- 6, 7, 8. job_outbound, directory_outbound, download ----------------
  function outboundAndDownload() {
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (!href || href.charAt(0) === '#') return;

      var url;
      try { url = new URL(href, location.href); } catch (err) { return; }

      // download: any PDF, on our host or elsewhere
      if (/\.pdf(\?|$)/i.test(url.pathname + url.search)) {
        send('download', {
          file_name: url.pathname.split('/').pop(),
          file_url: url.href,
          page_path: path()
        });
        return;
      }

      // tel: and mailto: are not site exits and carry no host, so counting them
      // as outbound clicks inflates the department-exit number with phone taps.
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
      if (url.host === location.host) return;               // internal, not an exit

      var inDirectory = !!a.closest('#gsfd') || isDirectoryPage();
      var inJobs = isJobsPage() || !!a.closest('#gsfj, [data-gsf-jobs], #gsf-jobs');

      if (inJobs && !a.closest('#gsfd')) {
        send('job_outbound', {
          link_url: url.href, link_domain: url.host,
          link_text: (a.textContent || '').trim().slice(0, 100), page_path: path()
        });
      } else if (inDirectory) {
        send('directory_outbound', {
          link_url: url.href, link_domain: url.host,
          link_text: (a.textContent || '').trim().slice(0, 100), page_path: path()
        });
      }
    }, true);
  }

  // NOTE: purchase is intentionally NOT implemented here. GSF sells nothing
  // yet, and when it does, Squarespace Commerce emits purchase through the
  // native GA4 integration. Hand-firing it here would double-count. The
  // required parameter shape is recorded in the event dictionary.

  function relatedResourceClicks() {
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest && e.target.closest('#gsf-keep-reading a[data-gsf-resource]');
      if (!a) return;
      var u; try { u = new URL(a.href, location.href); } catch (err) { return; }
      if (u.host !== location.host) return;
      send('related_resource_click', {
        page_path: path(), destination_path: u.pathname,
        resource_group: a.closest('#gsf-keep-reading').getAttribute('data-gsf-related-group') || 'unknown'
      });
    }, true);
  }

  function boot() {
    try { relatedResourceClicks(); } catch (e) {}
    try { roadmapView(); } catch (e) {}
    try { formSubmits(); } catch (e) {}
    try { toolStart(); } catch (e) {}
    try { toolComplete(); } catch (e) {}
    try { outboundAndDownload(); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
