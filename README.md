# Service Delivery of the Future

> **By 2030, clients receive instant and personalized access to the public services they want and
> need. Life changes initiate engagement, and the system carries the burden of complexity.**

Today, a single life change — a layoff, a new baby, a move — forces a person to find and apply to each
agency separately. The vision flips that: one conversation enrolls someone in every benefit and service
they qualify for, with the government absorbing the complexity. Getting there takes a stack —
**rails → product on the rails → live proof in real states** — and a governance layer that lets agents act
on a constituent's behalf with trust.

This repository collects working **prototypes** that make that vision concrete enough to fund, refine,
and pilot. They are proof points, not production systems.

---

## Prototypes

| Prototype | What it demonstrates | Where | Link |
|---|---|---|---|
| **MD SNAP** | A SNAP eligibility + benefit-determination engine generated from Maryland's published FY2026 policy manual — every rule cites its source section, with a pre-certification QC layer. "Art of the possible" for instant, validate-after benefits delivery. | In this repo → [`snap-agent/`](./snap-agent) | **[bellagio-service-delivery.vercel.app](https://bellagio-service-delivery.vercel.app)** ([/md-snap](https://bellagio-service-delivery.vercel.app/md-snap)) |
| **Agentic Government Protocol** | An open standard for programmatic service-delivery flows between constituents, their agents, intermediaries, and government — the "rails." Modeled on the [Agentic Commerce Protocol](https://www.agenticcommerce.dev). | Separate repo → [`ehysen/agentic-government-protocol`](https://github.com/ehysen/agentic-government-protocol) | **[agentic-government-protocol.vercel.app](https://agentic-government-protocol.vercel.app)** |
| **Vision prototype** | A dynamic prototype and pitch that demonstrates the end-to-end vision — the artifact you fundraise and align states on. Walks through Maya's first trimester and the life-event-driven system that shows up for her. | In this repo → [`vision-prototype/`](./vision-prototype) | **[rainbow-sherbet-5d5509.netlify.app](https://rainbow-sherbet-5d5509.netlify.app)** |
| **MCP example** | A reference MCP server (Maryland SNAP) for the Agentic Government Protocol — showing how a state exposes a service to agents over MCP instead of hand-rolling integrations, including a snap-a-document verification feature. Backed by the same tested SNAP engine as MD SNAP. | In this repo → [`agp-mcp-demo/`](./agp-mcp-demo) | See [`agp-mcp-demo/README.md`](./agp-mcp-demo/README.md) |

---

## How the prototypes map to the initiatives

The convening identified three critical-path initiatives. The prototypes above are the builder's
proof points for each:

1. **Craft the vision** — storytelling, state commitments, funding, and coalitions that shift the
   Overton window. → *Vision prototype.*
2. **Craft the protocol + governance** — an open standard (spec + reference MCP servers + templatized
   protocols) paired with the legal/policy/governance layer (identity, consent, authorization,
   liability, privacy) and the ROI model. → *Agentic Government Protocol* and the *MCP example.*
3. **Multi-state MVP execution** — end-to-end delivery of 1–2 services per state across several red and
   blue states, instant and personalized, with the data plumbing mapped and a shared ROI scorecard.
   → *MD SNAP.*

A cross-cutting workstream — **identity, consent & authorization** — threads through all three and is the
highest-risk shared dependency (the same gap the Agentic Commerce Protocol had to spin off separately).

---

## Guardrails

These prototypes are decision-support and demonstration tools, **not** autopilot and **not** replacements
for a state's system of record. Determinations ship with citations; unverified inputs route to human
review rather than an automated denial; no final adverse action is automated. See
[`snap-agent/README.md`](./snap-agent/README.md) for the MD SNAP engine's full guardrails, deliverables,
and verified data sources.

---

_This work emerged from a Bellagio convening on the future of public service delivery._
