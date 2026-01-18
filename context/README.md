# Context Documents for AI Kevin

This folder contains all the context that powers the AI version of you on your website. The better you write these, the more authentic the AI will sound.

## Folder Structure

```
/context
├── /core           # Your identity and voice
│   ├── career-narrative.md
│   ├── values-and-motivations.md
│   └── speaking-style.md
├── /experience     # Deep dives into your work
│   ├── detailed-projects.md
│   └── impact-stories.md
├── /faq            # Pre-written answers to common questions
│   └── common-questions.md
└── /roles          # Role-specific context for customized versions
    ├── _template.md
    └── README.md
```

## How It Works

All markdown files in `/core`, `/experience`, and `/faq` are concatenated into Claude's system prompt. The AI reads this context before every conversation.

For customized versions, the role-specific file from `/roles` is added to the base context.

## Writing Tips

1. Write in first person as yourself
2. Be specific with numbers, dates, outcomes
3. Include stories, not just facts
4. Capture how you actually talk (phrases you use, things you emphasize)
5. Be honest about what you don't know or haven't done
