import { MockWebpage, Script } from './types';

// Standard template mocked pages for simulator context
export const mockWebpages: MockWebpage[] = [
  {
    id: 'shop',
    name: '🌟 Retro Tech e-Store',
    description: 'An online shop catalog. Great for script testing DOM item scrapes, attribute parsing, and price comparisons.',
    category: 'E-Commerce',
    url: 'https://retro-tech.shop/products',
    html: `<div class="p-6 bg-slate-900 border border-slate-800 rounded-xl" id="sandbox-root">
  <div class="flex justify-between items-center mb-6">
    <h2 class="text-xl font-bold tracking-tight text-white">Retro Tech Catalog</h2>
    <span class="text-xs text-emerald-400 border border-emerald-500/20 px-2 py-1 bg-emerald-500/10 rounded-full">Secure Storefront</span>
  </div>
  
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="products-container">
    <div class="product bg-slate-800/80 p-4 rounded-lg border border-slate-700 hover:border-violet-500 transition-all flex flex-col justify-between" data-id="1">
      <div>
        <div class="flex justify-between items-start">
          <span class="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded">SKU-7703</span>
          <span class="text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded">Instock</span>
        </div>
        <h3 class="text-md font-semibold text-white mt-2 product-title">Mechanical Cyber Keyboard</h3>
        <p class="text-xs text-slate-400 mt-1">Retro mechanical keystroke switches with neon blue backlights.</p>
      </div>
      <div class="flex items-center justify-between mt-4 border-t border-slate-700/60 pt-3">
        <span class="text-lg font-mono font-bold text-amber-400 price">$129.99</span>
        <button class="add-to-cart-btn btn bg-violet-600 hover:bg-violet-500 text-white text-xs px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer" data-product="Keyboard">
          Add To Cart
        </button>
      </div>
    </div>

    <div class="product bg-slate-800/80 p-4 rounded-lg border border-slate-700 hover:border-violet-500 transition-all flex flex-col justify-between" data-id="2">
      <div>
        <div class="flex justify-between items-start">
          <span class="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded">SKU-8104</span>
          <span class="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">Low Stock</span>
        </div>
        <h3 class="text-md font-semibold text-white mt-2 product-title">Retro CRT Glow Monitor</h3>
        <p class="text-xs text-slate-400 mt-1">Flicker-free classic display mockup simulated with responsive visual filters.</p>
      </div>
      <div class="flex items-center justify-between mt-4 border-t border-slate-700/60 pt-3">
        <span class="text-lg font-mono font-bold text-amber-400 price">$349.99</span>
        <button class="add-to-cart-btn btn bg-violet-600 hover:bg-violet-500 text-white text-xs px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer" data-product="CRT Monitor">
          Add To Cart
        </button>
      </div>
    </div>

    <div class="product bg-slate-800/80 p-4 rounded-lg border border-slate-700 hover:border-violet-500 transition-all flex flex-col justify-between" data-id="3">
      <div>
        <div class="flex justify-between items-start">
          <span class="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded">SKU-2041</span>
          <span class="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">Hot Deal</span>
        </div>
        <h3 class="text-md font-semibold text-white mt-2 product-title">Atomic Bluetooth Speaker</h3>
        <p class="text-xs text-slate-400 mt-1">High fidelity classic aesthetic speaker with heavy metal dials.</p>
      </div>
      <div class="flex items-center justify-between mt-4 border-t border-slate-700/60 pt-3">
        <span class="text-lg font-mono font-bold text-amber-400 price">$45.50</span>
        <button class="add-to-cart-btn btn bg-violet-600 hover:bg-violet-500 text-white text-xs px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer" data-product="Speaker">
          Add To Cart
        </button>
      </div>
    </div>

    <div class="product bg-slate-800/80 p-4 rounded-lg border border-slate-700 hover:border-violet-500 transition-all flex flex-col justify-between" data-id="4">
      <div>
        <div class="flex justify-between items-start">
          <span class="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded">SKU-9092</span>
          <span class="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">In Stock</span>
        </div>
        <h3 class="text-md font-semibold text-white mt-2 product-title">Neon Cyberpunk Mouse</h3>
        <p class="text-xs text-slate-400 mt-1">Ergonomic laser sensor gaming mouse with glowing fiber tracks.</p>
      </div>
      <div class="flex items-center justify-between mt-4 border-t border-slate-700/60 pt-3">
        <span class="text-lg font-mono font-bold text-amber-400 price">$29.95</span>
        <button class="add-to-cart-btn btn bg-violet-600 hover:bg-violet-500 text-white text-xs px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer" data-product="Cybermouse">
          Add To Cart
        </button>
      </div>
    </div>
  </div>

  <div class="mt-6 flex justify-between bg-slate-950 p-4 rounded-lg border border-slate-800" id="cart-summary-section">
    <div class="flex items-center gap-2">
      <span class="text-slate-400 text-xs text-medium">Cart:</span>
      <span class="text-xs text-violet-300 font-bold font-mono" id="items-count-display">0 Items Selected</span>
    </div>
    <div id="coupon-alert-section" class="hidden text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-1 rounded inline-block animate-pulse">
      🎉 Automatic coupon 'CYBER20' applied (-$20.00)!
    </div>
  </div>
</div>`
  },
  {
    id: 'form',
    name: '📝 Portal Account Form',
    description: 'A classic sign-up profile form. Perfect for testing scripts that auto-fill, validate inputs, or submit API-payload details.',
    category: 'Forms',
    url: 'https://cyberdev-auth.org/register',
    html: `<div class="p-6 bg-slate-900 border border-slate-800 rounded-xl" id="sandbox-root">
  <div class="mb-4">
    <h2 class="text-xl font-bold text-white tracking-tight">Create Developer Account</h2>
    <p class="text-xs text-slate-400">Fill in details to access the centralized node command deck.</p>
  </div>

  <form id="register-form" class="space-y-4" onsubmit="event.preventDefault(); alert('Form submitted!');">
    <div>
      <label class="block text-xs font-medium text-slate-300 mb-1">Developer User Name</label>
      <input type="text" id="dev-user" name="user" placeholder="e.g. cyber_runner" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 font-mono" required />
    </div>

    <div>
      <label class="block text-xs font-medium text-slate-300 mb-1">Decryption Password</label>
      <input type="password" id="dev-pass" name="password" placeholder="••••••••••••" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 font-mono" required />
    </div>

    <div>
      <label class="block text-xs font-medium text-slate-300 mb-1">Primary Node Role</label>
      <select id="dev-role" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500">
        <option value="">-- Choose Access Tier --</option>
        <option value="netrunner">Syndicate Netrunner</option>
        <option value="scavenger">Data Scavenger</option>
        <option value="architect">Core System Architect</option>
      </select>
    </div>

    <div class="flex items-center gap-2 py-1">
      <input type="checkbox" id="terms-agree" class="rounded border-slate-800 text-violet-600 bg-slate-950 focus:ring-violet-500" required />
      <label for="terms-agree" class="text-xs text-slate-400">I declare myself bound by Net neutrality terms.</label>
    </div>

    <button type="submit" id="submit-btn" class="w-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold py-2 rounded transition-colors uppercase tracking-wider">
      Commit Credentials
    </button>
  </form>
  
  <div id="secret-access-token" class="hidden mt-4 p-3 bg-violet-950/40 border border-violet-500/20 rounded shadow">
    <div class="text-[10px] font-mono text-violet-400 uppercase tracking-widest font-bold">Node Access Token Generated:</div>
    <div class="text-xs font-mono text-white mt-1 select-all" id="auth-token-string">CTX-990-JWT-ALPHA-929110</div>
  </div>
</div>`
  },
  {
    id: 'blogs',
    name: '📰 Tech Feed Scraper',
    description: 'A dynamic news catalog displaying scrolling logs and metrics. Great for testing scripts that scrape data or auto-pager selectors.',
    category: 'Listing',
    url: 'https://net-logs.io/feed',
    html: `<div class="p-6 bg-slate-900 border border-slate-800 rounded-xl" id="sandbox-root">
  <div class="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
    <span class="text-sm font-bold text-white uppercase tracking-wider font-mono">Incoming Hacker News Logs</span>
    <span class="text-[10px] bg-sky-500/10 text-sky-400 font-mono px-2 py-0.5 rounded border border-sky-500/20 animate-pulse">● Live Feed</span>
  </div>

  <div class="space-y-4" id="log-entries">
    <div class="entry p-3 bg-slate-950 border border-slate-800/80 rounded hover:border-sky-500/30 transition-all" data-id="1">
      <div class="flex justify-between text-[10px] text-slate-500 font-mono mb-1">
        <span>Posted by root_net</span>
        <span>Score: <b class="score-val text-white">42</b> points</span>
      </div>
      <h4 class="text-xs font-semibold text-sky-400 entry-title hover:underline cursor-pointer">Declassifying Old Proxy Overwrite Methods</h4>
      <p class="text-[11px] text-slate-400 mt-1 lines-clamp">An extensive audit detailing backflow exploits on legacy firewall routing vectors.</p>
    </div>

    <div class="entry p-3 bg-slate-950 border border-slate-800/80 rounded hover:border-sky-500/30 transition-all" data-id="2">
      <div class="flex justify-between text-[10px] text-slate-500 font-mono mb-1">
        <span>Posted by script_kid_00</span>
        <span>Score: <b class="score-val text-white">128</b> points</span>
      </div>
      <h4 class="text-xs font-semibold text-sky-400 entry-title hover:underline cursor-pointer">The Absolute Guide To Writing Tampermonkey UserScripts</h4>
      <p class="text-[11px] text-slate-400 mt-1 lines-clamp">Learn to hack DOM structures safely, inject styles, and sync states via GM Storage.</p>
    </div>

    <div class="entry p-3 bg-slate-950 border border-slate-800/80 rounded hover:border-sky-500/30 transition-all" data-id="3">
      <div class="flex justify-between text-[10px] text-slate-500 font-mono mb-1">
        <span>Posted by silicon_valy</span>
        <span>Score: <b class="score-val text-white">15</b> points</span>
      </div>
      <h4 class="text-xs font-semibold text-sky-400 entry-title hover:underline cursor-pointer">Silicon Core Shortages Reach Historic Peak</h4>
      <p class="text-[11px] text-slate-400 mt-1 lines-clamp">Production output schedules are cut by half as critical minerals dry out.</p>
    </div>
  </div>
  
  <div class="mt-4 flex justify-between items-center text-[10px] text-slate-500 font-mono">
    <span>Showing 3 Log Entries</span>
    <button class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 hover:text-white hover:bg-slate-700 transition" id="load-more-btn">
      Load Page 2
    </button>
  </div>
</div>`
  }
];

// Seed sample user scripts on first open
export const sampleScripts: Script[] = [
  {
    id: 'script-discount',
    name: '💰 Discount Item Highlights',
    description: 'Finds product elements, reads price values, and highlights items under $50 with a glowing emerald badge inside the simulator shop page!',
    author: 'Akash Chaudhary',
    tags: ['Highlight', 'E-Commerce'],
    version: '1.0.0',
    code: `// ==UserScript==
// @name         Discount Item Highlights
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Find products under $50 and highlight them!
// @match        https://retro-tech.shop/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';
    
    console.log("Discount Highlight script initialized!");
    
    // Select all product modules
    const products = document.querySelectorAll('.product');
    let highlightCount = 0;
    
    products.forEach(product => {
        const titleEl = product.querySelector('.product-title');
        const priceEl = product.querySelector('.price');
        
        if (titleEl && priceEl) {
            const rawPrice = priceEl.textContent;
            // Parse numeric value
            const numericValue = parseFloat(rawPrice.replace('$', ''));
            
            if (numericValue < 50.00) {
                // Apply a glowing emerald border
                product.style.borderColor = 'rgba(16, 185, 129, 0.8)';
                product.style.background = 'linear-gradient(to bottom, rgba(15, 23, 42, 0.9), rgba(16, 185, 129, 0.05))';
                
                // Inject custom badge
                const badge = document.createElement('span');
                badge.className = 'text-[9px] bg-emerald-500/20 text-emerald-400 font-mono font-bold uppercase rounded px-2 py-0.5 mt-1 inline-block';
                badge.innerText = '🔥 Budget Deal';
                badge.id = 'budget-badge-' + product.getAttribute('data-id');
                
                titleEl.appendChild(badge);
                highlightCount++;
                
                // Add log output
                console.log("Highlighted deal matched: " + titleEl.childNodes[0].textContent.trim());
            }
        }
    });
    
    // Auto fill a coupon if products matched have budget deals
    if (highlightCount > 0) {
        const couponSec = document.getElementById('coupon-alert-section');
        if (couponSec) {
            couponSec.classList.remove('hidden');
        }
    }
})();`,
    sitePattern: 'https://retro-tech.shop/*',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    versions: [
      {
        id: 'ver-1.0.0',
        version: '1.0.0',
        code: `// Initial draft`,
        changelog: 'Initial script design and creation',
        updatedAt: new Date().toISOString()
      }
    ]
  }
];
