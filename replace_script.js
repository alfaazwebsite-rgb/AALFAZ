const fs = require('fs');
const path = require('path');

const files = [
  'index.html', 'about.html', 'craftsmanship.html', 'care-guide.html',
  'cart.html', 'privacy-policy.html', 'shipping-returns.html',
  'terms.html', 'shop.html', 'product-details.html'
];

const target1 = '<button class="nav-link nav-link--desktop nav-account-trigger" id="account-btn" aria-label="Open account">Account</button>';
const repl1   = '<a href="account.html" class="nav-link nav-link--desktop" id="account-btn">Account</a>';

const target2 = '<button class="mobile-menu__link" data-account="true" style="background:none;border:none;cursor:pointer;text-align:left;padding:0;font:inherit;color:inherit;">Account</button>';
const repl2   = '<a href="account.html" class="mobile-menu__link">Account</a>';

const footerTarget = `<button id="footer-contact-toggle" class="footer__link" aria-expanded="false">Contact</button>
              <div class="footer__contact-tray" id="footer-contact-tray">
                <div class="footer__contact-icons">`;
const footerRepl = `<span class="footer__col-title" style="display:block;margin-bottom:.75rem;">Contact</span>
                <div class="footer__contact-icons">`;

const footerTrayCloseRegex = /<\/div>\s*<\/div>\s*<a href="shipping-returns\.html"/;
const footerTrayCloseRepl = `</div>\n              <a href="shipping-returns.html"`;

files.forEach(f => {
  const fp = path.join(__dirname, f);
  if (!fs.existsSync(fp)) return;
  
  let content = fs.readFileSync(fp, 'utf8');
  
  // Change 2: Navbar
  content = content.replace(target1, repl1);
  content = content.replace(target2, repl2);

  // Change 3: Footer Contact structure
  // Need to handle the whitespace carefully, let's use a regex for the target
  const footerRegex = /<button id="footer-contact-toggle" class="footer__link" aria-expanded="false">Contact<\/button>\s*<div class="footer__contact-tray" id="footer-contact-tray">\s*<div class="footer__contact-icons">/;
  const fRepl = `<span class="footer__col-title" style="display:block;margin-bottom:.75rem;">Contact</span>\n              <div class="footer__contact-icons">`;
  
  content = content.replace(footerRegex, fRepl);
  
  // Remove the closing </div> of footer-contact-tray
  const closeRegex = /<\/div>\s*<\/div>\s*<a href="shipping-returns\.html"/;
  const cRepl = `</div>\n              <a href="shipping-returns.html"`;
  content = content.replace(closeRegex, cRepl);

  fs.writeFileSync(fp, content, 'utf8');
  console.log('Processed', f);
});
