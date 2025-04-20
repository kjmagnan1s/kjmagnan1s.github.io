const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Function to extract and copy images from HTML
function extractAndCopyImages(html, postDir, newFilesDir) {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    // Find all images in the content
    const images = doc.querySelectorAll('img');
    const imagePaths = new Set();
    
    images.forEach(img => {
        const src = img.getAttribute('src');
        if (src) {
            imagePaths.add(src);
        }
    });
    
    // Also check for thumbnail.png in the post directory
    const thumbnailPath = path.join(postDir, 'thumbnail.png');
    if (fs.existsSync(thumbnailPath)) {
        imagePaths.add('thumbnail.png');
    }
    
    // Copy each image
    imagePaths.forEach(imagePath => {
        const sourcePath = path.join(postDir, imagePath);
        const destPath = path.join(newFilesDir, path.basename(imagePath));
        
        if (fs.existsSync(sourcePath)) {
            if (!fs.existsSync(path.dirname(destPath))) {
                fs.mkdirSync(path.dirname(destPath), { recursive: true });
            }
            fs.copyFileSync(sourcePath, destPath);
        }
    });
    
    return imagePaths;
}

// Function to convert HTML to Markdown
function htmlToMarkdown(html, postDir) {
    // First, remove all script tags and HTML comments
    html = html.replace(/<script[\s\S]*?<\/script>/g, '');
    html = html.replace(/<!--[\s\S]*?-->/g, '');
    
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    // Extract the main content (usually in article or main tag)
    const mainContent = doc.querySelector('article, main, .post-content, .content') || doc.body;
    
    // Get all images and convert them to markdown
    const images = mainContent.querySelectorAll('img');
    images.forEach(img => {
        const src = img.getAttribute('src');
        const alt = img.getAttribute('alt') || '';
        if (src) {
            const markdownImage = `![${alt}](/assets/images/blog/${path.basename(postDir)}/${path.basename(src)})`;
            img.replaceWith(markdownImage);
        }
    });
    
    // Get the text content and clean it up
    let content = mainContent.textContent
        .replace(/\n{3,}/g, '\n\n')  // Clean up multiple newlines
        .trim();
    
    // Add proper markdown formatting
    content = content
        .split('\n')
        .map(line => {
            // Convert headings
            if (line.match(/^#+\s/)) {
                return line;
            }
            // Convert lists
            if (line.match(/^[-*]\s/)) {
                return line;
            }
            // Convert links
            if (line.match(/https?:\/\/\S+/)) {
                return `[${line}](${line})`;
            }
            // Add paragraph spacing
            return line + '\n\n';
        })
        .join('');
    
    return content.trim();
}

// Function to extract metadata from HTML
function extractMetadata(html) {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const title = doc.querySelector('title')?.textContent || '';
    const description = doc.querySelector('meta[property="description"]')?.getAttribute('content') || '';
    const date = doc.querySelector('meta[property="article:published"]')?.getAttribute('content') || '';
    const author = doc.querySelector('meta[name="article:author"]')?.getAttribute('content') || '';
    const categories = doc.querySelector('meta[name="categories"]')?.getAttribute('content')?.split(',') || [];

    return {
        title,
        description,
        date,
        author,
        categories
    };
}

// Function to copy files recursively
function copyFilesRecursively(source, destination) {
    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
    }

    const files = fs.readdirSync(source);
    
    for (const file of files) {
        const sourcePath = path.join(source, file);
        const destPath = path.join(destination, file);
        
        // Skip JavaScript files and directories
        if (file.endsWith('.js') || file.endsWith('.min.js')) {
            continue;
        }
        
        const stat = fs.statSync(sourcePath);
        
        if (stat.isDirectory()) {
            // Skip known unnecessary directories
            if (['anchor-4.2.2', 'bowser-1.9.3', 'distill-2.2.21', 'header-attrs-2.6', 'jquery-1.11.3', 'webcomponents-2.0.0'].includes(file)) {
                continue;
            }
            copyFilesRecursively(sourcePath, destPath);
        } else {
            // Only copy image files and other necessary assets
            if (file.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
                fs.copyFileSync(sourcePath, destPath);
            }
        }
    }
}

// Function to process a single blog post
function processBlogPost(postDir) {
    const htmlFile = fs.readdirSync(postDir).find(file => file.endsWith('.html'));
    if (!htmlFile) return;

    const htmlPath = path.join(postDir, htmlFile);
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Extract metadata
    const metadata = extractMetadata(htmlContent);
    
    // Create directory for images
    const newFilesDir = path.join('assets', 'images', 'blog', path.basename(postDir));
    if (!fs.existsSync(newFilesDir)) {
        fs.mkdirSync(newFilesDir, { recursive: true });
    }
    
    // Extract and copy images
    const imagePaths = extractAndCopyImages(htmlContent, postDir, newFilesDir);
    
    // Convert HTML to Markdown
    const markdownContent = htmlToMarkdown(htmlContent, postDir);
    
    // Create Jekyll front matter
    const frontMatter = `---
layout: post
title: "${metadata.title}"
date: ${metadata.date}
author: ${metadata.author}
categories: ${JSON.stringify(metadata.categories)}
description: "${metadata.description}"
---

`;
    
    // Combine front matter and content
    const jekyllContent = frontMatter + markdownContent;
    
    // Create new filename in _posts directory
    const newFileName = `${metadata.date}-${path.basename(postDir)}.md`;
    const newFilePath = path.join('_posts', newFileName);
    
    // Write the new file
    fs.writeFileSync(newFilePath, jekyllContent);
    
    // Copy associated files
    const filesDir = path.join(postDir, `${path.basename(postDir)}_files`);
    if (fs.existsSync(filesDir)) {
        const newFilesDir = path.join('assets', 'images', 'blog', path.basename(postDir));
        copyFilesRecursively(filesDir, newFilesDir);
    }
}

// Main function to process all blog posts
function main() {
    const oldBlogDir = 'old_blog_content';
    const postsDir = '_posts';
    
    // Ensure _posts directory exists
    if (!fs.existsSync(postsDir)) {
        fs.mkdirSync(postsDir);
    }
    
    // Process each blog post directory
    fs.readdirSync(oldBlogDir).forEach(dir => {
        const postDir = path.join(oldBlogDir, dir);
        if (fs.statSync(postDir).isDirectory()) {
            try {
                processBlogPost(postDir);
                console.log(`Successfully processed: ${dir}`);
            } catch (error) {
                console.error(`Error processing ${dir}:`, error.message);
            }
        }
    });
}

// Run the conversion
main(); 