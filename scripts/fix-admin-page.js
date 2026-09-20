const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'admin', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Detect line ending
const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';

// Replace the entire NOT LOGGED IN section
// Find from "// VIEW 1:" to just before "// VIEW 2:"
const view1Start = content.indexOf('// VIEW 1:');
const view2Start = content.indexOf('// ====', content.indexOf('// VIEW 2:'));

if (view1Start === -1 || view2Start === -1) {
  console.error('Could not find VIEW 1 or VIEW 2 markers');
  process.exit(1);
}

// Find the line start of VIEW 1 comment (go back to find the preceding whitespace/line)
let sectionStart = content.lastIndexOf(lineEnding, view1Start) + lineEnding.length;
// Find the end of the VIEW 1 section (just before VIEW 2 comment block)
let sectionEnd = content.lastIndexOf(lineEnding, view2Start) + lineEnding.length;

const newLoginSection = `  // =========================================================================
  // VIEW 1: NOT LOGGED IN -> RENDER GOOGLE-ONLY LOGIN
  // =========================================================================
  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4 pt-28 pb-20">
          <div className="max-w-md w-full bg-[#0e172e] rounded-3xl p-8 border-2 border-cyan-500/30 shadow-2xl relative overflow-hidden">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
                <ShieldCheck size={36} className="text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                ระบบจัดการและควบคุมงาน
              </span>
              <h1 className="text-2xl font-black text-white mt-1">
                เข้าสู่ระบบสำหรับเจ้าหน้าที่
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                อุทยานวิทยาศาสตร์และดาราศาสตร์ อบจ.พะเยา
              </p>
            </div>

            {authError && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-bold flex items-start gap-2 animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                <span>{authError}</span>
              </div>
            )}

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isAuthSubmitting}
              className="w-full py-4 bg-white hover:bg-gray-50 text-slate-800 font-bold rounded-2xl text-sm border-2 border-white/80 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
            >
              {isAuthSubmitting ? (
                <Loader2 className="animate-spin w-5 h-5 text-slate-600" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>เข้าสู่ระบบด้วย Google</span>
            </button>

            {/* Authorized Emails Info */}
            <div className="mt-6 p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/20">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={14} className="text-cyan-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                  Gmail ที่ได้รับอนุญาต
                </span>
              </div>
              <div className="space-y-1.5">
                {authorizedEmails.map((em) => (
                  <div key={em} className="flex items-center gap-2 text-xs">
                    <Mail size={12} className="text-slate-500 shrink-0" />
                    <span className="text-slate-300 font-mono">{em}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
                เฉพาะ Gmail ที่ระบุข้างต้นเท่านั้นที่สามารถเข้าสู่ระบบผู้ดูแลได้ หากต้องการเพิ่มเจ้าหน้าที่ กรุณาติดต่อผู้ดูแลระบบ
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 text-center text-[11px] text-slate-400">
              <Link href="/" className="hover:text-cyan-300 transition-colors">
                &larr; กลับสู่หน้าหลักของอุทยานฯ
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

`;

// Replace
content = content.substring(0, sectionStart) + newLoginSection.split('\n').join(lineEnding) + content.substring(sectionEnd);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated admin/page.tsx with Google-only login UI');
