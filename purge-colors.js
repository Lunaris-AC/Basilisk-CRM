const fs = require('fs');
const path = require('path');

function sanitizeFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace color utility classes (bg, text, border, ring, shadow, fill, stroke, from, to)
    // for all hardcoded colors (indigo, violet, purple) targeting 300, 400, 500, 600
    // and map them to primary
    const regex = /(bg|text|border|ring|shadow|fill|stroke|from|to)-(indigo|violet|purple)-([3456]00)(\/[0-9]+)?/g;

    content = content.replace(regex, (match, type, color, weight, opacity) => {
        let replacement = `${type}-primary`;

        // If it's a lighter text variant (like text-indigo-300 in dark mode), primary might be fine but let's add opacity
        if (weight === '300' || weight === '400') {
            // In shadcn, text-primary is often the bold foreground color. 
            // We can just use primary/80 or similar, but Tailwind handles /opacity fine
        }

        if (opacity) {
            replacement += opacity;
        } else if (weight === '400' || weight === '300') {
            if (type === 'text') replacement += '/80';
            if (type === 'border') replacement += '/50';
            if (type === 'bg') replacement += '/20';
        }

        return replacement;
    });

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
console.log('Purge complete.');
