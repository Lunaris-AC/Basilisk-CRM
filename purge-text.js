const fs = require('fs');
const path = require('path');

function processClassName(classNameStr) {
    let classes = classNameStr.split(/\s+/);

    // Determine if this element has a solid colored background
    const hasSolidBg = classes.some(c =>
        (c.startsWith('bg-primary') && !c.includes('/10') && !c.includes('/20')) || // solid primary
        (c.startsWith('bg-destructive') && !c.includes('/10') && !c.includes('/20')) ||
        c.match(/^bg-(rose|emerald|amber|sky|blue|green|red|purple|violet|indigo)-[567]00$/) // tailwind color
    );

    classes = classes.map(c => {
        // Match text-white, text-slate-50, text-gray-100 + optional opacity
        let match = c.match(/^text-(white|slate-50|gray-100)(\/[0-9]+)?$/);
        if (match) {
            let opacity = match[2] || '';

            if (hasSolidBg) {
                // Keep it white or map to primary-foreground
                if (classes.includes('bg-primary')) return `text-primary-foreground${opacity}`;
                return `text-white${opacity}`;
            } else {
                // Not a solid background: use semantic foreground
                if (opacity === '/50' || opacity === '/40' || opacity === '/60' || opacity === '/30') {
                    return `text-muted-foreground`; // better semantics for gray disabled text
                } else if (opacity) {
                    return `text-foreground${opacity}`;
                } else {
                    return `text-foreground`;
                }
            }
        }
        return c;
    });

    return classes.join(' ');
}

function sanitizeFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Match classNames wrapped in quotes or backticks
    const classNameRegex = /className=(["'`])(.*?)\1/g;

    content = content.replace(classNameRegex, (match, quote, classNames) => {
        const updated = processClassName(classNames);
        return `className=${quote}${updated}${quote}`;
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
