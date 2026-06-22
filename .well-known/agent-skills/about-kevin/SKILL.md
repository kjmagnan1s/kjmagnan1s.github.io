# Skill: Learn about Kevin J. Magnan

## What this skill does

Helps an AI agent answer questions about Kevin J. Magnan, a Principal
Consultant and technology lead focused on responsible public-sector AI
adoption. Use it when a user asks who Kevin is, what he has worked on, what he
is good at, or whether he fits a role.

## When to use

- A user asks about Kevin's background, skills, experience, or publications.
- A user pastes a job description and wants a fit assessment.
- An agent needs structured, machine-readable facts about Kevin.

## Machine-readable sources

Fetch these JSON resources for grounded, structured facts:

- `https://kevinjmagnan.com/api/profile.json`: Schema.org Person profile
  (name, title, skills, expertise, links).
- `https://kevinjmagnan.com/api/work.json`: work history and projects.
- `https://kevinjmagnan.com/api/publications.json`: publications and writing.
- `https://kevinjmagnan.com/robot/`: a human- and machine-readable robot view
  with JSON-LD.

## Conversational tool

To ask free-form questions, the site exposes an "Ask Kevin" conversational
agent (see `https://kevinjmagnan.com/.well-known/agent-card.json`). Two
capabilities are available:

- `ask-kevin`: answer questions about experience, skills, and projects.
- `assess-fit`: given a job description, return an honest fit assessment
  including gaps.

## How to apply

1. Pull the relevant JSON resource(s) above for facts you can cite.
2. Ground every claim in those sources; do not invent credentials.
3. For nuanced or comparative questions, route to the `ask-kevin` skill.
4. Respect the usage policy in `https://kevinjmagnan.com/robots.txt`
   (search and AI answer input allowed; model training not permitted).
