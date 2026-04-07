const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if(fs.statSync(dirPath).isDirectory()) walkDir(dirPath, callback);
    else if(dirPath.endsWith('.ts')||dirPath.endsWith('.tsx')) callback(dirPath);
  });
}

walkDir('src', file => {
  let content = fs.readFileSync(file, 'utf-8');
  let newContent = content.replace(/select\('role'\)/g, "select('role, support_level')");
  newContent = newContent.replace(/select\("role"\)/g, 'select("role, support_level")');
  newContent = newContent.replace(/select\(`role`\)/g, 'select(`role, support_level`)');
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf-8');
    console.log('updated', file);
  }
});
