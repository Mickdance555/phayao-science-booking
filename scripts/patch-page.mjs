import { readFileSync, writeFileSync } from 'fs';

let code = readFileSync('src/app/page.tsx', 'utf8');

// --- 1. Hero quick contact bar after CTA buttons ---
const heroTarget = `                 )}
              </div>
           </div>
        </div>
      </section>`;

const heroReplacement = `                 )}
              </div>

              {/* Quick Contact Bar */}
              <div className="mt-10 pt-6 border-t border-cyan-500/20 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs">
                 <span className="text-slate-400 font-bold">ช่องทางติดต่อสอบถาม:</span>
                 <a
                   href={SITE_CONFIG.facebookUrl}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white rounded-xl font-bold border border-blue-500/30 transition-all hover:scale-105"
                 >
                   <FacebookIcon className="w-4 h-4 fill-current" />
                   <span>Facebook: {SITE_CONFIG.facebookName}</span>
                 </a>
                 <a
                   href={\`tel:\${SITE_CONFIG.phone}\`}
                   className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 hover:text-white rounded-xl font-bold border border-cyan-500/30 transition-all hover:scale-105"
                 >
                   <Phone size={14} className="text-cyan-400" />
                   <span>โทร: {SITE_CONFIG.phone}</span>
                 </a>
              </div>
           </div>
        </div>
      </section>`;

if (code.includes(heroTarget)) {
  code = code.replace(heroTarget, heroReplacement);
  console.log('✅ Hero quick contact bar added');
} else {
  console.log('⚠️  Hero target not found — skipping');
}

// --- 2. Footer social icon buttons - replace Globe icon with FacebookIcon ---
const footerTarget = `                  <a href={SITE_CONFIG.facebookUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-blue-600 transition-all text-blue-300 hover:text-white" title="Facebook">
                     <Globe size={18} />
                  </a>`;

const footerReplacement = `                  <a href={SITE_CONFIG.facebookUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 bg-blue-950/60 hover:bg-blue-600 border border-blue-500/30 rounded-2xl transition-all text-blue-300 hover:text-white font-bold text-xs" title="Facebook แฟนเพจ">
                     <FacebookIcon className="w-4 h-4 fill-current" />
                     <span>Facebook แฟนเพจ</span>
                  </a>`;

if (code.includes(footerTarget)) {
  code = code.replace(footerTarget, footerReplacement);
  console.log('✅ Footer Facebook icon updated to FacebookIcon');
} else {
  console.log('⚠️  Footer Facebook target not found — skipping');
}

// Also expand the Phone link in footer to show text
const footerPhoneTarget = `                  <a href={\`tel:\${SITE_CONFIG.phone}\`} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-cyan-600 transition-all text-cyan-300 hover:text-white" title="โทรศัพท์">
                     <Phone size={18} />
                  </a>`;

const footerPhoneReplacement = `                  <a href={\`tel:\${SITE_CONFIG.phone}\`} className="flex items-center gap-2 px-4 py-2.5 bg-cyan-950/60 hover:bg-cyan-600 border border-cyan-500/30 rounded-2xl transition-all text-cyan-300 hover:text-white font-bold text-xs" title="โทรศัพท์ติดต่อ">
                     <Phone size={16} />
                     <span>โทร {SITE_CONFIG.phone}</span>
                  </a>`;

if (code.includes(footerPhoneTarget)) {
  code = code.replace(footerPhoneTarget, footerPhoneReplacement);
  console.log('✅ Footer Phone link updated');
} else {
  console.log('⚠️  Footer Phone target not found — skipping');
}

// --- 3. Footer address section: replace plain phone text with Facebook link too ---
const contactTarget = `               <p className="text-slate-400 text-xs font-bold pt-2">โทรศัพท์: {SITE_CONFIG.phone}</p>`;

const contactReplacement = `               <div className="pt-2 space-y-1.5">
                 <p className="text-cyan-300 text-xs font-bold flex items-center gap-1.5">
                   <Phone size={12} className="text-cyan-400" />
                   โทร: <a href={\`tel:\${SITE_CONFIG.phone}\`} className="hover:underline">{SITE_CONFIG.phone}</a>
                 </p>
                 <p className="text-blue-400 text-xs font-bold flex items-center gap-1.5">
                   <FacebookIcon className="w-3 h-3 fill-current" />
                   <a href={SITE_CONFIG.facebookUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">facebook.com/sciparkphayao</a>
                 </p>
               </div>`;

if (code.includes(contactTarget)) {
  code = code.replace(contactTarget, contactReplacement);
  console.log('✅ Footer address section updated with Facebook link');
} else {
  console.log('⚠️  Footer contact target not found — skipping');
}

writeFileSync('src/app/page.tsx', code, 'utf8');
console.log('\n✅ patch-page.mjs done!');
