# 🎨 Portfolio Redesign - Quick Start Guide

## What You Now Have

Your portfolio has been completely redesigned with a modern, professional layout. Here's a quick overview of what's on your homepage:

```
┌─────────────────────────────────────────────────┐
│  Navigation Bar (Fixed Sidebar)                 │
│  Home | Blog | Portfolio | About | Contact     │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│         HERO SECTION (100vh)                    │
│   • Animated particles background               │
│   • Kevin J. Magnan (Title)                     │
│   • I'm [Typed text animating]                  │
│   • Social media links                          │
│   • Subtitle                                    │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│      BLOG SECTION                               │
│   Latest Articles (3 posts displayed)           │
│   [View All Articles button]                    │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│      PORTFOLIO SECTION                          │
│   [All] [AI/ML] [Analytics] [Architecture]     │
│                                                 │
│   [Project] [Project] [Project]                │
│   [Project] [Project] [Project]                │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│      ABOUT SECTION                              │
│   Bio paragraph                                 │
│   Core Competencies (6 skills)                 │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│      CONTACT SECTION                            │
│   Contact form (name, email, subject, message) │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│      FOOTER                                     │
│   Name, bio, social links, copyright           │
└─────────────────────────────────────────────────┘
```

## What's Animated

✨ **Particles Background**
- Floating blue particles with connecting lines
- Animated in real-time
- Customizable color and speed

✨ **Typed Text**
- Your job titles animate in sequence
- Types out, pauses, deletes, repeats

✨ **Scroll Animations**
- Elements fade in as you scroll down
- 1 second duration
- Smooth easing

✨ **Hover Effects**
- Navigation items expand on hover
- Portfolio cards overlay on hover
- Buttons change color on hover

✨ **Smooth Scrolling**
- Clicking nav items smoothly scrolls to section
- Back-to-top button appears on scroll

## Key Customizations You'll Want to Make

### 1. Update Your Name & Bio (5 min)
**File**: `index.html`

```html
<!-- Line 79 -->
<h1>Kevin J. Magnan</h1>

<!-- Line 80 - Your dynamic titles -->
<span class="typed" data-typed-items="a Principal Consultant, an AI Architect, a Technology Lead"></span>

<!-- Line 81 - Your subtitle -->
<p class="hero-subtitle">Designing AI-powered solutions for justice and public safety...</p>
```

### 2. Update Social Links (2 min)
**File**: `index.html` (lines 83-86 and 213-216)

```html
<a href="https://twitter.com/YOUR_HANDLE" target="_blank" class="twitter">
<a href="https://github.com/YOUR_HANDLE" target="_blank" class="github">
<a href="https://linkedin.com/in/YOUR_HANDLE" target="_blank" class="linkedin">
```

### 3. Replace Portfolio Projects (10 min)
**File**: `index.html` (lines 125-203)

Replace the placeholder projects with your real work:
- Change image URLs
- Update project names
- Update descriptions
- Keep filter classes (`.filter-ai`, `.filter-analytics`, etc.)

```html
<div class="col-lg-4 col-md-6 portfolio-item filter-ai">
    <div class="portfolio-wrap">
        <img src="YOUR_IMAGE_URL" alt="Project Name">
        <div class="portfolio-info">
            <h4>Your Project Title</h4>
            <p>Project description</p>
            <a href="https://yourproject.com">View Project</a>
        </div>
    </div>
</div>
```

### 4. Update About Section (5 min)
**File**: `index.html` (lines 137-154)

```html
<p>As a Principal Consultant at Slalom, I lead initiatives...</p>

<!-- Update skills -->
<li><i class="icofont-check"></i> Your Skill Here</li>
```

### 5. Change Brand Colors (Optional, 5 min)
**File**: `assets/css/redesign.css` (lines 12-20)

```css
--primary-blue: #2563eb;      /* Change to your color */
--dark-blue: #1e40af;         /* Darker version */
```

## Features You Already Have

### Navigation
- ✅ Desktop sidebar (100px, expands on hover)
- ✅ Mobile hamburger menu
- ✅ Smooth scroll to sections
- ✅ Active state highlighting

### Hero
- ✅ Full-height animated section
- ✅ Particles background
- ✅ Typed text animation
- ✅ Social media links

### Blog
- ✅ Auto-loads from your Jekyll blog
- ✅ Shows latest 3 posts
- ✅ Responsive card layout
- ✅ "View All" button

### Portfolio
- ✅ 6 sample projects
- ✅ Category filtering (AI/ML, Analytics, Architecture)
- ✅ Smooth hover overlays
- ✅ Responsive grid

### About
- ✅ Professional bio section
- ✅ Skills showcase
- ✅ Clean layout

### Contact
- ✅ Working contact form
- ✅ Form validation
- ✅ Ready for Email.js

### Other
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Back-to-top button
- ✅ Smooth scroll animations
- ✅ Professional footer

## One-Minute Changes

### Change hero subtitle
`index.html` line 81 - just edit the text in the `<p>` tag

### Change typed text
`index.html` line 80 - edit the `data-typed-items` attribute (separate with commas)

### Change nav menu order
`index.html` lines 66-71 - reorder the `<li>` elements

### Change footer text
`index.html` lines 213-216 - edit footer content

## Useful Links

- **Live Site**: https://kevinjmagnan.com
- **Full Guide**: `REDESIGN_GUIDE.md` (336 lines, comprehensive)
- **Summary**: `REDESIGN_SUMMARY.md` (detailed features)
- **Git History**: Run `git log` to see all changes

## Color Reference

```
Primary Blue:    #2563eb ← Main color for buttons, links, accents
Dark Blue:       #1e40af ← Hover and active states
Text Primary:    #1f2937 ← Main text color
Text Secondary:  #6b7280 ← Secondary text
Background:      #ffffff ← White background
Light Background: #f3f4f6ency ← Light gray sections
Border:          #e5e7eb ← Subtle borders
```

## Mobile Testing

The design is fully responsive. Test on mobile:
1. Open in browser
2. Press `F12` or right-click → "Inspect"
3. Click device icon (top left of DevTools)
4. Try different screen sizes

You should see:
- Hamburger menu instead of sidebar
- Single column layout
- Buttons/text adjusting to fit

## Deployment

Your site automatically deploys to Netlify when you push to main:

```bash
git push origin main
```

Takes ~30-60 seconds to deploy.

## Need Help?

### For detailed customization instructions
→ Read `REDESIGN_GUIDE.md`

### For complete feature overview
→ Read `REDESIGN_SUMMARY.md`

### For file structure
→ See "Files Created/Modified" section in summary

### For specific features
Look for comments in the code:
- `index.html` - HTML structure
- `assets/css/redesign.css` - Styling with comments
- `assets/js/redesign.js` - JavaScript with comments

---

## Template Changes Summary

| Before | After |
|--------|-------|
| Simple Jekyll layout | Modern sidebar navigation |
| Chat interface | Animated particles background |
| Limited portfolio | Interactive portfolio grid with filtering |
| Static content | Scroll animations, typed text |
| Basic styling | Professional design with smooth animations |

---

**Your portfolio is ready to go! Just make those quick customization changes above and you're all set.** 🚀

For detailed instructions on anything, check `REDESIGN_GUIDE.md`.
