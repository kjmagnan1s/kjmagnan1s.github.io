# Anthropic PM Application Documents

Drop application-related documents here. These will be loaded into context when the AI responds on the customized page.

## Document Types to Include

- **Job posting** - Full text of the job description
- **Cover letter drafts** - Working versions of your cover letter
- **Why Anthropic response** - Draft of the 200-400 word response they request
- **Research notes** - Notes from researching Anthropic, the team, recent news
- **Interview prep** - Questions you're preparing for, talking points
- **Company info** - Any public documents about Anthropic's approach, values, etc.

## File Naming Convention

Use descriptive names:
- `job-posting.md`
- `why-anthropic-draft.md`
- `cover-letter-v1.md`
- `research-notes.md`
- `interview-questions.md`

## How It Works

The backend will concatenate all `.md` files in this folder into the system prompt, giving the AI full context about your application materials when responding to recruiter questions.
