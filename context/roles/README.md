# Creating Customized Versions

This folder contains role-specific context files for customized conversation links.

## Workflow

### 1. Copy the template

```bash
cp _template.md company-role-2025.md
```

Name it something memorable and URL-friendly (this becomes the slug).

### 2. Fill in the details

- Company name and role
- Brand colors (find their primary color for subtle theming)
- Why you're excited about this role
- Key talking points to emphasize
- Your research notes about the company
- Questions you have

### 3. Commit and push

```bash
git add context/roles/company-role-2025.md
git commit -m "Add context for [Company] [Role]"
git push
```

Netlify will auto-deploy.

### 4. Share the link

```
kevinjmagnan.com/c/company-role-2025
```

Send this alongside your resume.

## Finding Brand Colors

- Check their website's CSS or inspect their logo
- Use a color picker tool on their homepage
- Look for their brand guidelines (often public for larger companies)
- When in doubt, use a neutral like `#333333`

## Tips

- Be genuine. Don't write what you think they want to hear.
- Do your research. The more context you provide, the better the AI can connect dots.
- Update after interviews. Add new information as you learn more.
- Keep old files. They're useful references for similar roles later.
