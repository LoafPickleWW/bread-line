# Fit scoring rules

Claude scores each new job against {{NAME}}'s resume during the daily run. Results go to `data/scores.json`, keyed by job id:

```json
{ "<job id>": { "score": 82, "reason": "one line", "gaps": "short list or null", "headline": "{{FIRST_HEADLINE}}", "summary": "one line" } }
```

The scoring pass file is a JSON array with one `[score, reason, gaps, headline, summary]` per job, in digest order.

## The candidate in one paragraph

{{CANDIDATE_PARAGRAPH: current role and tenure, earlier career, 4–8 proven results with real numbers, side projects or skills that matter, and years with the target title versus years of total experience.}}

## Score (0–100)

Start from how well the role's core job matches what they have actually done, then adjust.

| Band | Meaning |
|---|---|
| 85–100 | Bullseye. Apply today: the domain and the core job both match proven results. |
| 70–84 | Strong. Credible application, with a gap or two to address. |
| 50–69 | Stretch. Adjacent role or domain, or a big seniority or technical gap. |
| 0–49 | Poor fit. Different job, deep specialist requirements, or not really in their location. |

Domain counts much less than the job itself.

Raise the score for:
{{RAISE: 4–8 bullets, strongest signal first: the kinds of work, domains, team sizes and stages they want.}}

{{HARD_NO: if they named off-limits topics, one paragraph: "Hard no (score 0, gaps "<label>"): ...". Otherwise delete this line.}}

Lower the score for:
- Hard minimums they clearly miss: years with the title, or degrees and certifications they don't have.
{{LOWER: 2–5 more bullets: domains, specialist requirements and work styles that don't fit.}}
- Remote that is really hybrid, or limited to a region they can't work in.
- HN posts listing many roles with no clear match (cap these around 40).

## Reason, gaps, headline

- **reason**: one line naming the specific resume evidence that maps to the job.
- **gaps**: the real blockers in a few words, or null.
- **summary**: what the job actually is, in one line of about 12–20 words, written for scanning the list. Describe the work itself, not the company boilerplate.
- **headline**: which side of their background to lead with:
{{HEADLINES: 2–4 bullets, each "`<Headline>` for <kinds of role>". The tracker's cover letters use the chosen headline.}}
