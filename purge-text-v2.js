const fs = require('fs');
const path = require('path');

function processClassNameString(str) {
    // Determine if this string has a solid colored background
    const hasSolidBg = str.match(/bg-(primary|destructive|rose|emerald|amber|sky|blue|green|red|purple|violet|indigo)-[567]00\b/);

    // Replace text-white variations
    return str.replace(/text-(white|slate-50|gray-100)(\/[0-9]+)?/g, (match, base, opacity) => {
        opacity = opacity || '';

        if (hasSolidBg) {
            // If it has a solid background, keep it white or primary-foreground
            if (str.includes('bg-primary')) return `text-primary-foreground${opacity}`;
            return match; // Keep it as is (text-white) if it has a solid non-primary bg (like rose-500)
        } else {
            // Not a solid background
            if (opacity === '/50' || opacity === '/40' || opacity === '/60' || opacity === '/30') {
                return `text-muted-foreground`;
            } else if (opacity) {
                return `text-foreground${opacity}`;
            } else {
                return `text-foreground`;
            }
        }
    });
}

function sanitizeFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // We will do a global regex replace for any text-white occurrence, 
    // but we use a specialized trick to grab the entire line it resides on 
    // to check for solid backgrounds contextual to that line/block.

    const lines = content.split('\n');
    const newLines = lines.map(line => {
        if (line.includes('text-white') || line.includes('text-slate-50') || line.includes('text-gray-100')) {
            return processClassNameString(line);
        }
        return line;
    });

    content = newLines.join('\n');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            sanitizeFile(fullPath);
        }
    }
}

walkDir('./src');
console.log('Second pass purge complete.');
