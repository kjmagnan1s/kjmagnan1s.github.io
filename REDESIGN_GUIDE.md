# Kevin J. Magnan - Portfolio Redesign Guide

## Overview

Your portfolio has been completely redesigned with a modern, professional layout inspired by **jhedmendoza.is-a.dev**. This guide explains the design, features, and how to customize everything to match your personal brand.

## Key Features Implemented

### 1. **Animated Particles Background**
- **File**: `assets/js/particles-config.js`
- **Library**: Particles.js (2.0.0)
- **What it does**: Creates animated blue particles that float around the hero section
- **Current config**:
  - 40 particles
  - Blue color (#2563eb)
  - Lines connecting particles at 150px distance
  - Movement speed: 4 pixels/frame

**Customize**:
```javascript
// In assets/js/particles-config.js
"number": {
    "value": 40,  // Change particle count (30-100 for good effect)
},
"color": {
    "value": "#2563eb"  // Change to your brand color
},
"speed": 4,  // Lower = slower (2-8 recommended)
```

### 2. **Text Reveal Animation (Typed.js)**
- **File**: `index.html` line 80
- **Library**: Typed.js (2.0.12)
- **What it does**: Types out dynamic text strings in your hero section

**Current strings**:
```html
<span class="typed" data-typed-items="a Principal Consultant, an AI Architect, a Technology Lead, a Problem Solver, a Builder"></span>
```

**Customize** by editing the `data-typed-items` attribute. Add your own roles/descriptions separated by commas.

**Animation speed** (in `assets/js/redesign.js`):
```javascript
new Typed('.typed', {
    strings: typedItems,
    loop: true,
    typeSpeed: 100,      // Speed of typing (higher = slower)
    backSpeed: 50,       // Speed of deleting
    backDelay: 2000      // Pause time before deleting (ms)
});
```

### 3. **Fixed Sidebar Navigation**
- **File**: `index.html` (lines 63-74)
- **Styling**: `assets/css/redesign.css` (lines 45-142)
- **What it does**: Professional fixed sidebar with icon + text navigation

**Features**:
- Desktop: Fixed 100px width sidebar, expands to full width on hover
- Mobile: Slides in as a drawer menu
- Active state highlighting (blue background)
- Smooth transitions and animations

**Customize navigation items**:
```html
<!-- In index.html -->
<nav class="nav-menu">
    <ul>
        <li class="active"><a href="#hero"><i class="bx bx-home"></i> <span>Home</span></a></li>
        <li><a href="#blog"><i class="bx bx-news"></i> <span>Blog</span></a></li>
        <!-- Add more items here -->
    </ul>
</nav>
```

Icons are from **Boxicons** (https://boxicons.com/) - use any `bx bx-*` icon class.

### 4. **Hero Section**
- **File**: `index.html` (lines 77-88)
- **Styling**: `assets/css/redesign.css` (lines 180-250)

Features:
- Full-height section (100vh)
- Gradient background (light gray to slightly lighter gray)
- Particles animation overlay
- Typed.js text reveal
- Social media links with hover effects

**Customize**:
```html
<!-- In index.html, line 79 -->
<h1>Kevin J. Magnan</h1>  <!-- Your name -->

<!-- Line 81 -->
<p class="hero-subtitle">Designing AI-powered solutions for justice and public safety modernization.</p>

<!-- Lines 83-86: Social links -->
<a href="https://twitter.com/yourhandle" target="_blank" class="twitter">
```

### 5. **Blog Section**
- **File**: `index.html` (lines 92-103)
- **Styling**: `assets/css/redesign.css` (lines 300-330)

Features:
- Displays latest 3 blog posts
- Card-based layout (3 columns on desktop, responsive)
- Hover effects with subtle lift animation
- "View All Articles" link to full blog

**Automatic**: Blog posts are loaded from your Jekyll blog.html page automatically via JavaScript.

### 6. **Portfolio Section with Filtering**
- **File**: `index.html` (lines 106-205)
- **Styling**: `assets/css/redesign.css` (lines 358-430)
- **Library**: Isotope.js for filtering

Features:
- 6 sample projects organized by category
- Filter buttons (All, AI/ML, Analytics, Architecture)
- Click category to show/hide projects
- Smooth hover overlay with project title
- Responsive grid layout

**Add/Edit Portfolio Items**:
```html
<div class="col-lg-4 col-md-6 portfolio-item filter-ai">
    <div class="portfolio-wrap">
        <img src="YOUR_IMAGE_URL" alt="Project Name" class="img-fluid">
        <div class="portfolio-info">
            <h4>Project Title</h4>
            <p>Category/Description</p>
            <div class="portfolio-links">
                <a href="YOUR_LINK" title="View Project"><i class="bx bx-link"></i></a>
            </div>
        </div>
    </div>
</div>
```

**Available filter classes**:
- `.filter-ai` - AI/ML projects
- `.filter-analytics` - Data Analytics
- `.filter-architecture` - Cloud/Architecture
- Create new categories by:
  1. Adding filter button: `<li data-filter=".filter-yourname">Your Category</li>`
  2. Adding class to portfolio item: `class="portfolio-item filter-yourname"`

### 7. **About Section**
- **File**: `index.html` (lines 208-235)
- **Styling**: `assets/css/redesign.css` (lines 460-490)

Features:
- Bio/description paragraph
- Core Competencies section
- 2-column skills list with checkmark icons

**Customize**:
```html
<p>As a Principal Consultant at Slalom, I lead initiatives...</p>
<ul class="skills-list">
    <li><i class="icofont-check"></i> Your Skill Here</li>
</ul>
```

### 8. **Contact Section**
- **File**: `index.html` (lines 238-258)
- **Styling**: `assets/css/redesign.css` (lines 498-515)

Features:
- Contact form with name, email, subject, message
- Form validation
- Submit button
- Currently logs to browser console (ready for Email.js integration)

**To enable Email.js**:
1. Sign up at https://emailjs.com/
2. Get your service ID, template ID, public key
3. In `assets/js/redesign.js`, replace the console.log with:
```javascript
emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
    from_name: name,
    from_email: email,
    subject: subject,
    message: message
}, "YOUR_PUBLIC_KEY").then(() => {
    alert('Email sent successfully!');
    contactForm.reset();
});
```

### 9. **Color Scheme**
- **File**: `assets/css/redesign.css` (lines 12-20)

**Current colors**:
```css
:root {
    --primary-blue: #2563eb;     /* Main action color */
    --dark-blue: #1e40af;        /* Hover/active state */
    --cyan-accent: #06b6d4;      /* Alternative accent */
    --text-primary: #1f2937;     /* Main text */
    --text-secondary: #6b7280;   /* Secondary text */
    --text-light: #9ca3af;       /* Light text */
    --bg-white: #ffffff;         /* White background */
    --bg-light: #f3f4f6;         /* Light gray background */
    --border-light: #e5e7eb;     /* Borders */
}
```

**To change theme**:
1. Update colors in CSS variables
2. Update particles color in `assets/js/particles-config.js`
3. Update any hardcoded colors in inline styles

### 10. **Animations**
- **AOS (Animate On Scroll)**: Elements fade in as you scroll
- **Typed.js**: Hero text typing animation
- **Particles.js**: Background particle movement
- **CSS transitions**: Smooth hover effects, button animations

**Configure AOS**:
In `assets/js/redesign.js`:
```javascript
AOS.init({
    duration: 1000,    // Animation duration (ms)
    once: true,        // Animation runs once
    easing: 'ease-in-out'
});
```

Add animations to HTML elements:
```html
<div data-aos="fade-up" data-aos-delay="200">Content</div>
```

Available AOS animations: `fade-up`, `fade-down`, `fade-left`, `fade-right`, `zoom-in`, `flip-left`, etc.

## File Structure

```
index.html                           # Main redesigned homepage
assets/
├── css/
│   ├── custom.css                  # Base color variables & utilities
│   └── redesign.css                # New portfolio styles (723 lines)
├── js/
│   └── redesign.js                 # Main JavaScript (282 lines)
└── vendor/
    └── particlesjs/
        ├── app.js                  # Particles.js configuration
        └── particles.min.js        # (CDN loaded)
```

## Responsive Breakpoints

The design is fully responsive:
- **Desktop** (992px+): Full sidebar, 3-column grid
- **Tablet** (768px-991px): Sidebar as drawer, 2-column grid
- **Mobile** (<768px): Hamburger menu, 1-column grid

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

**Note**: Particles.js may have reduced performance on older devices. Can disable on mobile in `assets/js/particles-config.js` if needed.

## Performance Optimization

The site uses:
- CDN-loaded libraries (no local vendor files needed)
- Lazy loading for images (via Bootstrap)
- Minified CSS/JS files
- Async loading of non-critical scripts

## Social Media Links

Update social links in:
1. Hero section: `index.html` lines 83-86
2. Footer: `index.html` lines 213-216

Supported icons: Twitter (`bxl-twitter`), GitHub (`bxl-github`), LinkedIn (`bxl-linkedin`), and many more from Boxicons.

## Next Steps

1. **Customize colors** - Update CSS variables in `assets/css/redesign.css`
2. **Update portfolio items** - Replace placeholder projects with real work
3. **Add real images** - Replace placeholder images with screenshots
4. **Set up contact form** - Integrate Email.js or Netlify forms
5. **Update social links** - Add your actual social media URLs
6. **Test on mobile** - Use Chrome DevTools mobile view
7. **Deploy** - Push to Netlify (already connected)

## Troubleshooting

**Particles not showing?**
- Check browser console for JavaScript errors
- Ensure `particles-js` div is in HTML
- Verify `assets/js/particles-config.js` is loaded

**Text animation not working?**
- Make sure Typed.js library is loaded from CDN
- Check browser console for errors

**Navigation not scrolling smoothly?**
- Ensure hash links match section IDs
- Check that `#hero`, `#blog`, `#portfolio`, etc. exist

**Portfolio filtering not working?**
- Verify Isotope.js is loaded
- Check that filter classes match (`.filter-*`)

## References

- **Particles.js**: https://vincentgarreau.com/particles.js/
- **Typed.js**: https://mattboldt.com/typed.js/
- **AOS**: https://michalsnik.github.io/aos/
- **Isotope**: https://isotope.metafizzy.co/
- **Boxicons**: https://boxicons.com/
- **Bootstrap**: https://getbootstrap.com/docs/4.6/

## Questions?

For questions about specific features or how to customize further, check the source code comments in:
- `index.html` - Structure and inline styles
- `assets/css/redesign.css` - Styling explanations
- `assets/js/redesign.js` - JavaScript functionality

---

**Created**: November 2025
**Based on**: jhedmendoza.is-a.dev portfolio design
**Customized for**: Kevin J. Magnan's professional brand
