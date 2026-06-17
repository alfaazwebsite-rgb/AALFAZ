const fs = require('fs');
const path = require('path');

const dir = './';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Only add if it's not already there
  if (!content.includes('<meta name="color-scheme" content="light" />')) {
    content = content.replace('</head>', '  <meta name="color-scheme" content="light" />\n  </head>');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', file);
  } else {
    console.log('Skipped', file);
  }
});
