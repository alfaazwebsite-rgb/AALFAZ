const fs = require('fs');
const path = require('path');

const files = [
  'index.html', 'about.html', 'craftsmanship.html', 'care-guide.html',
  'cart.html', 'privacy-policy.html', 'shipping-returns.html',
  'terms.html', 'shop.html', 'product-details.html', 'account.html'
];

files.forEach(f => {
  const fp = path.join(__dirname, f);
  if (!fs.existsSync(fp)) return;
  
  let content = fs.readFileSync(fp, 'utf8');
  
  // Remove the Call icon
  const callRegex = /<a href="tel:#[^>]*data-cms-social="call"[\s\S]*?<\/a>\s*/;
  content = content.replace(callRegex, '');
  
  fs.writeFileSync(fp, content, 'utf8');
  console.log('Processed', f);
});
