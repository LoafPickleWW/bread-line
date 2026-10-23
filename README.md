# Bread Line

**Laid off? Take a number.** Bread Line is a daily remote job radar. Every weekday morning it reads 150+ company job boards, throws out what doesn't fit, and has your coding agent (Claude Code or Codex) score the rest against your resume. You wake up to a short line of roles worth your time, each with a 0–100 fit score, the reason, and the gaps.

Free, open source, and it runs on your own computer. By [LoafPickle Worldwide](https://loafpickle.com) · [jobs.loafpickle.com](https://jobs.loafpickle.com)

## Get started

You need Node.js 20+, Claude Code or Codex, and your resume as a PDF, Word or text file.

```
npm create bread-line@latest
```

That makes a `bread-line` folder, installs the engine, and offers to open Claude Code or Codex there with **"set up Bread Line for me"** already entered. Say yes and answer the questions. To skip the offer, add `--no-launch`; to skip the question and pick an agent, add `--agent claude` or `--agent codex` (`npm create bread-line@latest -- --agent codex`).

**In Claude Code, from any folder.** Install the plugin once and the setup skill shows up in `/skills` everywhere:

```
claude plugin marketplace add LoafPickleWW/bread-line
claude plugin install bread-line@loafpickle
```

(Or in one step from inside a session: `/plugin install bread-line --marketplace LoafPickleWW/bread-line`.) Then run `/bread-line:bread-line-setup`. If you're not in a Bread Line folder, it makes one at `~/bread-line` for you.

**In Codex (beta).** Add the marketplace, then install Bread Line from the plugin browser (`/plugins`) and start a new session:

```
codex plugin marketplace add LoafPickleWW/bread-line
```

Or skip the plugin and ask Codex's skill installer to pull the skill from this repo (`.agents/skills/bread-line-setup`) into your user skills. Either way, run it from any folder: it makes `~/bread-line` if you aren't in a Bread Line folder, and Codex will ask you to approve writing there.

Prefer to start it yourself? `cd bread-line`, open `claude` or `codex`, and say "set up Bread Line for me" (or run `/bread-line-setup` in Claude Code, `$bread-line-setup` in Codex). The setup reads your resume, asks about ten questions, drafts your company watchlist, tests the filters on today's real postings, sets up your tracker page and schedules your weekday run. It takes about fifteen minutes.

| | Claude Code | Codex |
|---|---|---|
| Tracker | Private page on claude.ai | Page saved on your computer |
| Cover letters | One click on each job | Ask Codex in the folder |
| Schedule | Claude app scheduled task | Your system scheduler (`codex exec`) |
| LinkedIn alerts | Optional, through Gmail | Not yet |

## What it runs, reads and stores

Setup and the daily run do only this:

- **Runs:** `npm create bread-line@<version>` once to make your folder (it downloads this project's engine, `@loafpickleww/bread-line`, from npm), then `npm run` steps and `node` in that folder. With your approval it creates one scheduled task for the weekday run, and with Claude Code it publishes your private tracker page.
- **Reads:** public job postings over HTTPS from Greenhouse, Lever, Ashby, Remotive, Remote OK, CryptoJobsList and Hacker News. Those requests name a company or a board; they never carry your resume or profile. Optionally, with Claude Code, LinkedIn alert emails in a Gmail inbox you choose, read-only.
- **Stores:** your profile, watchlist, resume path and job history in your Bread Line folder, and (Claude Code) your jobs, notes and resume text in your own private claude.ai page.
- **Sends:** nothing to LoafPickle or anyone else. There is no telemetry, no account and no server. Your resume is read only by your own coding agent. See the [privacy page](https://jobs.loafpickle.com/privacy.html).

## How a run works

1. **Fetch.** Greenhouse, Lever and Ashby boards for every company on your watchlist, plus Remotive, Remote OK, CryptoJobsList, Hacker News "Who's Hiring" and (optionally) LinkedIn alert emails.
2. **Filter.** Drops the wrong titles, the wrong seniority, fake-remote roles, pay under your floor, and anything you put off-limits.
3. **Score.** Your agent reads each survivor against your resume and your rubric.
4. **Serve.** New jobs land in your tracker, best first. Anything you've already seen stays out.

A missed or repeated run never loses or duplicates jobs: they're marked seen only after they reach the tracker. To run it by hand, say "run the job radar" in your Bread Line folder.

## Your folder

`init` makes a folder that holds only your stuff. The engine lives in `node_modules/@loafpickleww/bread-line`, so `npm update @loafpickleww/bread-line` gets fixes without touching your profiles.

```
bread-line/
  profiles/
    active.txt                  the profile commands use by default
    _template/                  the blank profile new ones start from
    <name>/
      profile.json              tracker, resume, pay floor, which boards to pull
      filters.js                role types, off-limits topics, title and seniority rules
      scoring.md                the rubric your agent scores with
      companies.candidates.json your watchlist
      data/                     seen jobs, runs, scores
  .claude/skills/, .agents/skills/   the setup skill for Claude Code and Codex
  RUNBOOK.md                    the daily run, step by step
```

`.gitignore` keeps every profile except the template out of git. Bread Line has no account and no server: it only reads public job boards, and it never applies for jobs or messages anyone.

## Commands

Inside your folder, `npm run <step>` runs a step for the active profile; add `-- --profile <name>` for another one. The same steps are `npx bread-line <step>`.

| Step | What it does |
|---|---|
| `radar` / `radar:dry` | Fetch and filter; the dry run doesn't update the seen list |
| `show` | Print the new matches |
| `digest` | Condense the new matches for scoring |
| `save-scores -- <file>` | Save a scoring pass |
| `tracker:prep` | Build the documents for the tracker page |
| `tracker:local` | Rebuild the offline tracker page |
| `tracker:page` | Copy the tracker page into a profile for publishing |
| `radar:commit` | Mark the run's jobs as seen |
| `discover` | Find job boards for the companies in the watchlist |
| `profile:new -- <name>` / `profile:check` | Start a profile / list what's unfinished |

## Working on Bread Line itself

Clone the repo and run the same scripts from its root; it works as a Bread Line folder too. `src/` is the engine (sources, filters, config defaults), `scripts/` are the steps, `tracker/index.html` is the tracker page, and `bin/bread-line.js` is the command. `create-bread-line/` is the tiny package behind `npm create bread-line`: it runs the engine's `init`. Everything personal belongs in a profile, never in `src/` or `scripts/`. `npm run kit` checks a release and builds the kit the claude.ai landing page offers for download (`site/bread-line-kit.json`, generated and not committed). It refuses to run if the engine, the installer and both plugins aren't at one version, or if the setup skills don't pin their bootstrap command to it.

**Releasing.** Bump the version in `package.json`, `create-bread-line/package.json` (and its dependency on the engine) and `.claude-plugin/plugin.json`, and change the version in the skills' pinned `npm create bread-line@<version>` command. Run `npm run kit` (it regenerates the Codex plugin and checks all of it), publish the engine first and the installer second (`npm publish` in each folder), then push, so the pinned version exists on npm before plugin users can reach it. The plugin skill ships from this repo, so a push plus the version bump is what updates plugin users (`claude plugin update bread-line@loafpickle`). `.claude-plugin/` holds the Claude Code plugin and the one-plugin marketplace, and the plugin loads the setup skill from `.claude/skills/`. `.agents/plugins/marketplace.json` is the Codex marketplace; it lists `plugins/bread-line`, which is generated from `.agents/skills/bread-line-setup` by `npm run plugins:sync`, so edit the skill, not the copy.

## License

MIT © LoafPickle Worldwide LLC
