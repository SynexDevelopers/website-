# Projects, links and search setup

Updated 24 November 2026 in SynexDevelopers/website-. The separate newer Next.js site was not modified.

The homepage and shared navigation link Projects, Relay Cloud and Relay Offline. Each product page links the other edition and the contact form, preserving the project in its subject. Public links use the established https://synexdevelopers.vercel.app origin. No local server address or temporary tunnel is advertised as a public product endpoint. Confirm this origin before deploying to another domain and update canonicals, sitemap and llms.txt together.

Public pages have distinct titles/descriptions, canonical URLs, Open Graph metadata and factual Organization/WebPage structured data. Product pages additionally describe SoftwareApplication facts, without invented customer ratings, prices or outcomes. robots.txt and sitemap.xml list only the seven public pages. llms.txt provides a concise product summary; it is an optional discovery file and does not guarantee ranking or AI citations.

The Express server now serves public/ only. Repository and server source files are no longer exposed as public static assets. Unknown routes return 404 instead of a homepage soft 404. Existing contact/order endpoints remain intact. SMTP must be configured privately for real submissions; local validation used console mode and sent no email. This repository includes a backend: a static-only deployment cannot execute the form API.

Run npm ci, python scripts/check-site.py, and npm start with BUSINESS_EMAIL and production SMTP settings supplied by the hosting environment. Dependency updates remain within existing package ranges; npm audit reported zero vulnerabilities at verification. No credentials belong in Git.

After deployment, verify the production URL, submit sitemap.xml in Search Console using your own account, and inspect indexing and real traffic. Repository updates alone do not prove a live deployment updated.
