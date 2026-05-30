import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchPoems, fetchFeatured, fetchPoem, fetchTags,
  toggleLike, createPoem, updatePoem, deletePoem,
  adminFetchAll, authGoogle, authMe,
  setToken, getToken, clearToken,
} from "./api/index.js";

/* ─── Google OAuth helper ─────────────────────────────────────────────────── */
function googleSignIn(clientId) {
  return new Promise((resolve, reject) => {
    if (!window.google) return reject(new Error("Google script not loaded"));
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: ({ credential }) => resolve(credential),
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        const div = document.createElement("div");
        div.style.cssText = "position:fixed;opacity:0;pointer-events:none;top:0;left:0";
        document.body.appendChild(div);
        window.google.accounts.id.renderButton(div, { type: "standard" });
        const btn = div.querySelector("div[role=button]");
        if (btn) btn.click();
        else reject(new Error("Could not trigger Google sign-in"));
      }
    });
  });
}

/* ─── Icons ───────────────────────────────────────────────────────────────── */
const Icon = {
  Feather: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>,
  Search:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  X:       ({s=16}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Heart:   ({f}) => <svg width="14" height="14" viewBox="0 0 24 24" fill={f?"currentColor":"none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  Share:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  Eye:     () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Clock:   () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Plus:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Edit:    () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash:   () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  LogIn:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>,
  LogOut:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Tag:     () => <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  Star:    () => <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Chev:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
  Book:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Loader:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{animation:"spin .7s linear infinite",display:"block"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
};

/* ─── CSS ─────────────────────────────────────────────────────────────────── */
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,700&family=Crimson+Pro:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');`;

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#080709;--s1:#0E0D12;--s2:#141320;--b1:#1C1B28;--b2:#252336;
  --gold:#C8A84B;--gold2:#E4C97A;--gg:rgba(200,168,75,.12);
  --cream:#F0EAD6;--cream2:#B8B0A0;--t2:#7A7670;--t3:#3E3C38;
  --pink:#E87AA0;--pb:rgba(232,122,160,.13);
}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fIn{from{opacity:0}to{opacity:1}}
@keyframes mIn{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes cIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes drIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
@keyframes bob{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(7px)}}
@keyframes tIn{from{opacity:0;transform:translateY(12px) scale(.9)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}

body{background:var(--bg);color:var(--cream);font-family:'DM Sans',sans-serif;min-height:100vh;overflow-x:hidden}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:var(--bg)}::-webkit-scrollbar-thumb{background:var(--b2);border-radius:2px}
::selection{background:var(--gg);color:var(--gold2)}

/* NAV */
.nav{position:fixed;top:0;left:0;right:0;z-index:100;height:58px;padding:0 40px;display:flex;align-items:center;justify-content:space-between;background:rgba(8,7,9,.88);backdrop-filter:blur(20px);border-bottom:1px solid var(--b1)}
.logo{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;letter-spacing:.22em;color:var(--cream);display:flex;align-items:center;gap:9px;user-select:none;cursor:default}
.logo-dot{width:5px;height:5px;border-radius:50%;background:var(--gold)}
.nav-r{display:flex;align-items:center;gap:10px}
.iBtn{width:34px;height:34px;border-radius:50%;border:1px solid var(--b2);background:none;color:var(--cream2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .18s}
.iBtn:hover{border-color:var(--gold);color:var(--gold);background:var(--gg)}
.iBtn:disabled{opacity:.4;cursor:default}
.gBtn{height:32px;padding:0 14px;border-radius:6px;border:1px solid var(--b2);background:none;color:var(--t2);font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .18s;white-space:nowrap}
.gBtn:hover{border-color:var(--gold);color:var(--gold);background:var(--gg)}
.goldBtn{height:32px;padding:0 16px;border-radius:6px;border:none;background:var(--gold);color:#0A0702;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .18s;white-space:nowrap}
.goldBtn:hover{background:var(--gold2);transform:translateY(-1px);box-shadow:0 6px 20px rgba(200,168,75,.28)}
.goldBtn:disabled{opacity:.5;cursor:default;transform:none;box-shadow:none}

/* HERO */
.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:90px 40px 70px;position:relative;overflow:hidden;text-align:center}
.h-glow{position:absolute;inset:0;background:radial-gradient(ellipse 55% 45% at 50% 48%,rgba(200,168,75,.07) 0%,transparent 70%),radial-gradient(ellipse 28% 28% at 18% 82%,rgba(200,100,180,.04) 0%,transparent 60%);pointer-events:none}
.h-grid{position:absolute;inset:0;background-image:linear-gradient(var(--b1) 1px,transparent 1px),linear-gradient(90deg,var(--b1) 1px,transparent 1px);background-size:56px 56px;opacity:.28;pointer-events:none;mask-image:radial-gradient(ellipse 65% 55% at 50% 50%,black 0%,transparent 80%)}
.h-ey{font-size:10px;font-weight:500;letter-spacing:.25em;text-transform:uppercase;color:var(--gold);margin-bottom:24px;display:flex;align-items:center;gap:12px}
.h-ey::before,.h-ey::after{content:'';display:block;width:28px;height:1px;background:var(--gold);opacity:.4}
.h1{font-family:'Playfair Display',serif;font-size:clamp(44px,7vw,88px);font-weight:900;line-height:1.05;color:var(--cream);margin-bottom:22px}
.h1 em{font-style:italic;color:var(--gold2)}
.h-sub{font-family:'Crimson Pro',serif;font-size:18px;font-style:italic;font-weight:300;line-height:1.85;color:var(--cream2);max-width:500px;margin:0 auto 38px}
.h-cta{display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap}
.h-scroll{position:absolute;bottom:32px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--t3);font-size:9px;letter-spacing:.22em;text-transform:uppercase;animation:bob 2.2s ease-in-out infinite}

/* FEATURED BANNER — lives above the grid, always shown if feat poem exists */
.feat-banner{margin:0 40px 32px;background:var(--s2);border:1px solid var(--b2);border-radius:14px;display:grid;grid-template-columns:1fr 1fr;overflow:hidden;cursor:pointer;transition:box-shadow .28s,border-color .28s;position:relative}
.feat-banner::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent)}
.feat-banner:hover{border-color:rgba(200,168,75,.35);box-shadow:0 20px 60px rgba(0,0,0,.5)}
.feat-l{padding:36px;display:flex;flex-direction:column;justify-content:space-between;border-right:1px solid var(--b1)}
.feat-badge{display:flex;align-items:center;gap:6px;font-size:9px;font-weight:500;letter-spacing:.24em;text-transform:uppercase;color:var(--gold);margin-bottom:16px}
.feat-r{padding:36px;position:relative;display:flex;flex-direction:column;justify-content:center}
.feat-q{font-family:'Playfair Display',serif;font-size:120px;line-height:.8;color:var(--gold);opacity:.13;position:absolute;top:8px;left:28px;pointer-events:none;user-select:none}
.feat-text{font-family:'Crimson Pro',serif;font-size:16px;font-style:italic;font-weight:300;line-height:2.05;color:var(--cream2);position:relative;z-index:1;padding-top:44px}
.feat-skel{margin:0 40px 32px;height:240px;background:var(--s1);border:1px solid var(--b1);border-radius:14px;animation:pulse 1.6s ease-in-out infinite}

/* STATS */
.stats-row{padding:0 40px;margin-bottom:44px;display:flex;gap:40px;flex-wrap:wrap}
.stat-n{font-family:'Playfair Display',serif;font-size:34px;font-weight:700;color:var(--cream);line-height:1;display:block}
.stat-l{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--t2)}

/* SECTION HEAD */
.sh{padding:0 40px;margin-bottom:22px;display:flex;align-items:baseline;gap:14px}
.sh-title{font-family:'Playfair Display',serif;font-size:25px;font-weight:600;color:var(--cream)}
.sh-c{font-size:12px;color:var(--t2)}

/* TAGS */
.tags{padding:0 40px;margin-bottom:32px;display:flex;gap:7px;overflow-x:auto;scrollbar-width:none}
.tags::-webkit-scrollbar{display:none}
.tp{flex-shrink:0;height:30px;padding:0 14px;border-radius:100px;border:1px solid var(--b2);background:none;color:var(--cream2);font-size:11px;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .18s;white-space:nowrap}
.tp:hover{border-color:var(--gold);color:var(--gold)}
.tp.on{border-color:var(--gold);color:var(--gold);background:var(--gg)}

/* GRID */
.grid{padding:0 40px;display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:18px;margin-bottom:50px}

/* CARD */
.card{background:var(--s1);border:1px solid var(--b1);border-radius:12px;padding:26px;cursor:pointer;transition:all .28s cubic-bezier(.4,0,.2,1);position:relative;overflow:hidden;animation:cIn .4s ease both}
.card::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:0;transition:opacity .28s}
.card:hover{border-color:var(--b2);background:var(--s2);transform:translateY(-4px);box-shadow:0 18px 52px rgba(0,0,0,.45),0 0 0 1px var(--b2)}
.card:hover::after{opacity:1}
.c-cat{font-size:9px;font-weight:500;letter-spacing:.24em;text-transform:uppercase;color:var(--gold);margin-bottom:12px;display:flex;align-items:center;gap:6px}
.c-title{font-family:'Playfair Display',serif;font-size:21px;font-weight:600;line-height:1.28;color:var(--cream);margin-bottom:12px}
.c-exc{font-family:'Crimson Pro',serif;font-size:14px;font-style:italic;font-weight:300;line-height:1.78;color:var(--cream2);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:20px}
.c-foot{display:flex;align-items:center;justify-content:space-between;padding-top:16px;border-top:1px solid var(--b1)}
.c-meta{display:flex;gap:12px;color:var(--t2);font-size:10px}
.c-mi{display:flex;align-items:center;gap:3px}
.lbtn{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t2);background:none;border:none;cursor:pointer;padding:4px 9px;border-radius:20px;font-family:'DM Sans',sans-serif;transition:all .18s}
.lbtn:hover,.lbtn.on{color:var(--pink);background:var(--pb)}

/* LOAD MORE */
.lm{display:flex;justify-content:center;align-items:center;padding:36px;min-height:90px}
.spin{width:26px;height:26px;border:2px solid var(--b2);border-top-color:var(--gold);border-radius:50%;animation:spin .7s linear infinite}
.end{color:var(--t3);font-size:12px;letter-spacing:.2em;font-family:'Playfair Display',serif;font-style:italic}
.empty-s{grid-column:1/-1;text-align:center;padding:72px 40px;color:var(--t2)}

/* SEARCH OVERLAY */
.sOv{position:fixed;inset:0;z-index:200;background:rgba(8,7,9,.97);backdrop-filter:blur(24px);display:flex;align-items:flex-start;justify-content:center;padding-top:90px;animation:fIn .18s ease}
.sBox{width:100%;max-width:640px;padding:0 36px}
.sWrap{position:relative;border-bottom:2px solid var(--gold);margin-bottom:30px}
.sInp{width:100%;background:none;border:none;outline:none;font-family:'Playfair Display',serif;font-size:30px;font-weight:400;color:var(--cream);padding:12px 40px 12px 0;caret-color:var(--gold)}
.sInp::placeholder{color:var(--t3)}
.sX{position:absolute;right:0;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--t2);cursor:pointer;padding:6px;transition:color .18s}
.sX:hover{color:var(--cream)}
.sR{padding:12px 0;border-bottom:1px solid var(--b1);cursor:pointer;transition:padding .14s}
.sR:hover{padding-left:8px}
.sR-t{font-family:'Playfair Display',serif;font-size:17px;color:var(--cream);margin-bottom:4px}
.sR-p{font-size:12px;color:var(--t2)}

/* POEM MODAL */
.mOv{position:fixed;inset:0;z-index:300;background:rgba(8,7,9,.98);backdrop-filter:blur(32px);display:flex;align-items:flex-start;justify-content:center;padding:80px 48px;animation:fIn .22s ease;overflow-y:auto}
.mC{width:100%;max-width:660px;animation:mIn .38s cubic-bezier(.4,0,.2,1);margin:auto}
.mClose{position:fixed;top:18px;right:18px;width:40px;height:40px;border-radius:50%;border:1px solid var(--b2);background:var(--s1);color:var(--cream2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .18s;z-index:10}
.mClose:hover{border-color:var(--cream);color:var(--cream)}
.m-ey{font-size:9px;font-weight:500;letter-spacing:.24em;text-transform:uppercase;color:var(--gold);margin-bottom:20px;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.m-title{font-family:'Playfair Display',serif;font-size:clamp(32px,5vw,54px);font-weight:700;line-height:1.12;color:var(--cream);margin-bottom:24px}
.m-rule{width:50px;height:2px;background:linear-gradient(90deg,var(--gold),transparent);margin-bottom:36px}
.m-poem{font-family:'Crimson Pro',serif;font-size:19px;font-weight:300;line-height:2.1;color:var(--cream2);white-space:pre-wrap;margin-bottom:48px}
.m-foot{display:flex;align-items:center;justify-content:space-between;padding-top:24px;border-top:1px solid var(--b1)}
.m-name{font-family:'Playfair Display',serif;font-size:16px;font-weight:600;color:var(--cream)}
.m-date{font-size:11px;color:var(--t2);margin-top:3px}
.m-acts{display:flex;gap:9px;align-items:center}
.m-views{font-size:11px;color:var(--t3);display:flex;align-items:center;gap:4px}

/* LOGIN */
.lOv{position:fixed;inset:0;z-index:400;background:rgba(8,7,9,.97);backdrop-filter:blur(32px);display:flex;align-items:center;justify-content:center;animation:fIn .18s ease}
.lCard{width:100%;max-width:360px;background:var(--s1);border:1px solid var(--b2);border-radius:14px;padding:44px;text-align:center;position:relative;animation:mIn .28s ease}
.lLogo{font-family:'Playfair Display',serif;font-size:28px;font-weight:700;letter-spacing:.16em;color:var(--cream);margin-bottom:7px}
.lSub{font-size:12px;color:var(--t2);margin-bottom:36px;line-height:1.6}
.ggBtn{width:100%;height:46px;border-radius:9px;border:1px solid var(--b2);background:var(--s2);color:var(--cream);font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:11px;transition:all .18s}
.ggBtn:hover:not(:disabled){border-color:var(--gold);background:var(--gg)}
.ggBtn:disabled{opacity:.6;cursor:default}
.lErr{font-size:11px;color:#e87070;margin-top:14px;line-height:1.5;background:rgba(232,112,112,.08);border:1px solid rgba(232,112,112,.2);border-radius:7px;padding:10px 12px}
.lNote{font-size:10px;color:var(--t3);margin-top:18px;line-height:1.7}

/* ADMIN DRAWER */
.aOv{position:fixed;inset:0;z-index:400;background:rgba(8,7,9,.55);backdrop-filter:blur(8px);display:flex;justify-content:flex-end;animation:fIn .18s ease}
.drw{width:100%;max-width:520px;height:100%;background:var(--s1);border-left:1px solid var(--b1);overflow-y:auto;animation:drIn .3s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column}
.drHead{padding:24px 28px;border-bottom:1px solid var(--b1);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--s1);z-index:1}
.drTitle{font-family:'Playfair Display',serif;font-size:19px;font-weight:600;color:var(--cream)}
.drBody{padding:24px 28px;flex:1}
.fLbl{display:block;font-size:10px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--t2);margin-bottom:8px}
.fInp,.fTA{width:100%;background:var(--s2);border:1px solid var(--b2);border-radius:7px;color:var(--cream);font-family:'DM Sans',sans-serif;font-size:13px;padding:10px 13px;outline:none;transition:border-color .18s}
.fInp:focus,.fTA:focus{border-color:var(--gold)}
.fTA{min-height:180px;resize:vertical;font-family:'Crimson Pro',serif;font-size:15px;line-height:1.8}
.fRow{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.fGrp{margin-bottom:18px}
.aList{margin-top:24px;padding-top:24px;border-top:1px solid var(--b1)}
.aItem{display:flex;align-items:center;justify-content:space-between;padding:12px;border-radius:7px;border:1px solid var(--b1);margin-bottom:9px;transition:border-color .18s}
.aItem:hover{border-color:var(--b2)}
.aItem-t{font-family:'Playfair Display',serif;font-size:14px;color:var(--cream);margin-bottom:2px}
.aItem-m{font-size:10px;color:var(--t2)}
.aBtns{display:flex;gap:5px}
.dBtn{width:28px;height:28px;border-radius:5px;border:1px solid rgba(200,80,80,.22);background:none;color:#e87070;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .18s}
.dBtn:hover{background:rgba(200,80,80,.1);border-color:rgba(200,80,80,.45)}

/* CONFIRM */
.cfmCard{width:100%;max-width:320px;background:var(--s1);border:1px solid var(--b2);border-radius:12px;padding:36px;text-align:center;animation:mIn .25s ease}

/* TOAST */
.toast{position:fixed;bottom:24px;right:24px;z-index:500;background:var(--s2);border:1px solid var(--b2);border-radius:9px;padding:12px 20px;font-size:12px;color:var(--cream);animation:tIn .28s cubic-bezier(.34,1.56,.64,1);box-shadow:0 14px 44px rgba(0,0,0,.5)}

@media(max-width:700px){
  .nav{padding:0 18px}.hero{padding:82px 18px 60px}
  .stats-row,.sh,.tags,.grid{padding-left:18px;padding-right:18px}
  .grid{grid-template-columns:1fr}
  .feat-banner{margin-left:18px;margin-right:18px;grid-template-columns:1fr}
  .feat-l{border-right:none;border-bottom:1px solid var(--b1)}
  .feat-skel{margin-left:18px;margin-right:18px}
  .mOv{padding:70px 18px 40px}
}
`;

const GOOG_SVG = (
  <svg width="17" height="17" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const PAGE_SIZE = 8;

export default function App() {
  // ── Auth
  const [user, setUser]               = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError]   = useState("");
  const [showLogin, setShowLogin]     = useState(false);

  // ── Featured poem — fetched separately, always on top
  const [featPoem, setFeatPoem]       = useState(null);   // null = loading, false = none
  const [featLoading, setFeatLoading] = useState(true);

  // ── Poems feed
  const [poems, setPoems]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [hasMore, setHasMore]         = useState(true);
  const [nextCursor, setNextCursor]   = useState(null);

  // ── Filters / tags
  const [activeTag, setActiveTag]     = useState("All");
  const [allTags, setAllTags]         = useState(["All"]);

  // ── Search
  const [searchOpen, setSearchOpen]   = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // ── Poem modal — stores the full poem object once opened
  const [selected, setSelected]       = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // ── Likes (optimistic)
  const [liked, setLiked]             = useState(new Set());
  const [likeCounts, setLikeCounts]   = useState({});

  // ── Admin
  const [showAdmin, setShowAdmin]     = useState(false);
  const [adminPoems, setAdminPoems]   = useState([]);
  const [editId, setEditId]           = useState(null);
  const [saving, setSaving]           = useState(false);
  const [confirmDel, setConfirmDel]   = useState(null);
  const [form, setForm] = useState({ title:"", content:"", author:"HD", category:"", tags:"", is_featured:false });

  // ── Toast
  const [toast, setToast]             = useState(null);

  // ── Refs
  const sentinelRef = useRef(null);
  const loadingRef  = useRef(false);
  const toastTimer  = useRef(null);

  const isAdmin = user?.role === "admin";

  /* ── Toast ──────────────────────────────────────────────────────────────── */
  const showT = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  /* ── On mount: restore session + fetch tags + featured ─────────────────── */
  useEffect(() => {
    (async () => {
      // Restore JWT session
      const token = getToken();
      if (token) {
        try { const { user: u } = await authMe(); setUser(u); }
        catch { clearToken(); }
      }
      setAuthLoading(false);

      // Fetch tags for filter pills
      try {
        const { tags } = await fetchTags();
        setAllTags(["All", ...tags.map(t => t.tag)]);
      } catch { /* no tags yet */ }
    })();

    // Fetch featured poem independently — not tied to the paginated list
    fetchFeatured()
      .then(({ poem }) => setFeatPoem(poem || false))
      .catch(() => setFeatPoem(false))
      .finally(() => setFeatLoading(false));
  }, []);

  /* ── Load a page of poems ───────────────────────────────────────────────── */
  const loadPage = useCallback(async (cursor = null, tag = "All", reset = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const params = { limit: PAGE_SIZE };
      if (cursor)        params.cursor = cursor;
      if (tag !== "All") params.tag    = tag;
      const { poems: batch, hasMore: more, nextCursor: nc } = await fetchPoems(params);
      setPoems(prev => reset ? batch : [...prev, ...batch]);
      setHasMore(more);
      setNextCursor(nc);
    } catch {
      showT("⚠ Failed to load poems");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [showT]);

  /* ── Reset feed when tag changes ───────────────────────────────────────── */
  useEffect(() => {
    setPoems([]); setHasMore(true); setNextCursor(null);
    loadPage(null, activeTag, true);
  }, [activeTag]); // eslint-disable-line

  /* ── Infinite scroll observer ───────────────────────────────────────────── */
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && hasMore && !loadingRef.current) loadPage(nextCursor, activeTag); },
      { threshold: 0.4 }
    );
    if (sentinelRef.current) obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, nextCursor, activeTag, loadPage]);

  /* ── Keyboard shortcuts ─────────────────────────────────────────────────── */
  useEffect(() => {
    const h = e => {
      if (e.key === "Escape") {
        setSelected(null); setSearchOpen(false);
        setShowLogin(false); setShowAdmin(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault(); setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* ── Search (debounced, hits real API) ──────────────────────────────────── */
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const { poems: res } = await fetchPoems({ search: searchQuery, limit: 6 });
        setSearchResults(res);
      } catch { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  /* ── Open poem — calls API to increment view counter ───────────────────── */
  const openPoem = async (poem) => {
    // Show what we have immediately (no blank flash)
    setSelected(poem);
    setModalLoading(true);
    try {
      // GET /api/poems/:id increments views and returns fresh data
      const { poem: fresh } = await fetchPoem(poem.id);
      setSelected(fresh);
      // Update view count in the feed list too
      setPoems(prev => prev.map(p => p.id === fresh.id ? { ...p, views: fresh.views } : p));
      // Update featured banner if it's the same poem
      setFeatPoem(prev => prev && prev.id === fresh.id ? { ...prev, views: fresh.views } : prev);
    } catch { /* keep showing the cached version */ }
    finally { setModalLoading(false); }
  };

  /* ── Like toggle (optimistic) ───────────────────────────────────────────── */
  const handleLike = async (e, id) => {
    e.stopPropagation();
    const wasLiked = liked.has(id);
    setLiked(prev => { const n = new Set(prev); wasLiked ? n.delete(id) : n.add(id); return n; });
    setLikeCounts(prev => ({ ...prev, [id]: (prev[id] ?? 0) + (wasLiked ? -1 : 1) }));
    try {
      const { liked: nowLiked, likes } = await toggleLike(id);
      setLiked(prev => { const n = new Set(prev); nowLiked ? n.add(id) : n.delete(id); return n; });
      setLikeCounts(prev => ({ ...prev, [id]: likes }));
      // Sync featured banner if applicable
      setFeatPoem(prev => prev && prev.id === id ? { ...prev, likes } : prev);
    } catch {
      // Revert on failure
      setLiked(prev => { const n = new Set(prev); wasLiked ? n.add(id) : n.delete(id); return n; });
      setLikeCounts(prev => ({ ...prev, [id]: (prev[id] ?? 0) + (wasLiked ? 1 : -1) }));
    }
  };

  const getLikes = (poem) =>
    likeCounts[poem.id] !== undefined ? likeCounts[poem.id] : poem.likes;

  /* ── Copy to clipboard ──────────────────────────────────────────────────── */
  const copyPoem = (e, poem) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(`"${poem.title}" — ${poem.author}\n\n${poem.content}`)
      .then(() => showT("✓ Copied to clipboard"));
  };

  /* ── Google sign-in ─────────────────────────────────────────────────────── */
  const handleGoogleLogin = async () => {
    setLoginLoading(true); setLoginError("");
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) throw new Error("VITE_GOOGLE_CLIENT_ID not set in .env.local");
      const idToken = await googleSignIn(clientId);
      const { token, user: u } = await authGoogle(idToken);
      setToken(token); setUser(u); setShowLogin(false);
      showT(`✓ Welcome back, ${u.name.split(" ")[0]}`);
    } catch (err) {
      const msg = err.message || "Sign-in failed";
      setLoginError(msg.includes("Access denied") ? "⛔ This account is not authorised." : msg);
    } finally { setLoginLoading(false); }
  };

  const handleLogout = () => { clearToken(); setUser(null); showT("Signed out"); };

  /* ── Admin: open drawer + fetch full list ───────────────────────────────── */
  const openAdmin = async () => {
    setShowAdmin(true);
    try { const { poems: all } = await adminFetchAll(); setAdminPoems(all); }
    catch { showT("⚠ Failed to load admin list"); }
  };

  const startEdit = (poem) => {
    setEditId(poem.id);
    setForm({
      title: poem.title, content: poem.content, author: poem.author,
      category: poem.category || "", tags: (poem.tags || []).join(", "),
      is_featured: poem.is_featured || false,
    });
  };

  const resetForm = () => {
    setEditId(null);
    setForm({ title:"", content:"", author:"HD", category:"", tags:"", is_featured:false });
  };

  /* ── Admin: save ────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) { showT("⚠ Title and content required"); return; }
    const payload = {
      title: form.title.trim(), content: form.content.trim(),
      author: form.author || "HD", category: form.category || "Uncategorized",
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      is_featured: form.is_featured,
    };
    setSaving(true);
    try {
      if (editId) { await updatePoem(editId, payload); showT("✓ Poem updated"); }
      else        { await createPoem(payload); showT("✓ Published!"); }
      resetForm();
      // Refresh feed, admin list, and featured banner
      const { poems: all } = await adminFetchAll();
      setAdminPoems(all);
      setPoems([]); setNextCursor(null); setHasMore(true);
      await loadPage(null, activeTag, true);
      // Re-fetch featured in case it changed
      const { poem: fp } = await fetchFeatured();
      setFeatPoem(fp || false);
    } catch (err) {
      showT(`⚠ ${err.message}`);
    } finally { setSaving(false); }
  };

  /* ── Admin: delete ──────────────────────────────────────────────────────── */
  const handleDelete = async (id) => {
    try {
      await deletePoem(id); setConfirmDel(null); showT("Poem deleted");
      const { poems: all } = await adminFetchAll(); setAdminPoems(all);
      setPoems([]); setNextCursor(null); setHasMore(true);
      await loadPage(null, activeTag, true);
      const { poem: fp } = await fetchFeatured(); setFeatPoem(fp || false);
    } catch (err) { showT(`⚠ ${err.message}`); }
  };

  const fmt = d => new Date(d).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
  const totalLikes = poems.reduce((a, p) => a + getLikes(p), 0);
  const totalViews = poems.reduce((a, p) => a + p.views, 0);

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{FONTS + CSS}</style>

      {/* NAV */}
      <nav className="nav">
        <div className="logo"><Icon.Feather /><span>VERSES</span><span className="logo-dot"/></div>
        <div className="nav-r">
          <button className="iBtn" onClick={() => setSearchOpen(true)} title="Search (⌘K)"><Icon.Search /></button>
          {authLoading
            ? <div className="iBtn" style={{cursor:"default"}}><Icon.Loader /></div>
            : isAdmin
              ? <><button className="gBtn" onClick={openAdmin}><Icon.Edit />Manage</button>
                  <button className="iBtn" onClick={handleLogout} title="Sign out"><Icon.LogOut /></button></>
              : <button className="gBtn" onClick={() => setShowLogin(true)}><Icon.LogIn />Admin</button>
          }
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="h-glow"/><div className="h-grid"/>
        <div className="h-ey">HD's Writing Portfolio</div>
        <h1 className="h1">Words that live<br/>between <em>the lines</em></h1>
        <p className="h-sub">A private collection of poems, reflections, and writings — from Kashmir to Bangalore and everywhere between.</p>
        <div className="h-cta">
          <button className="goldBtn" onClick={() => document.getElementById("wr")?.scrollIntoView({behavior:"smooth"})}>
            <Icon.Book />Read Writings
          </button>
          <button className="gBtn" style={{height:36,padding:"0 18px"}} onClick={() => setSearchOpen(true)}>
            <Icon.Search />Search <span style={{opacity:.5,fontSize:10}}>⌘K</span>
          </button>
        </div>
        <div className="h-scroll"><Icon.Chev /><span>Scroll</span></div>
      </section>

      {/* MAIN */}
      <main id="wr">

        {/* ── FEATURED BANNER — independent of paginated feed ── */}
        {featLoading && <div className="feat-skel"/>}

        {!featLoading && featPoem && (
          <div className="feat-banner" onClick={() => openPoem(featPoem)}>
            <div className="feat-l">
              <div>
                <div className="feat-badge"><Icon.Star />Featured · {featPoem.category}</div>
                <div className="c-title" style={{fontSize:26,marginBottom:18}}>{featPoem.title}</div>
                <div className="c-meta" style={{marginBottom:0}}>
                  <span className="c-mi"><Icon.Eye />{featPoem.views}</span>
                  <span className="c-mi"><Icon.Clock />{featPoem.reading_time} min read</span>
                  <span className="c-mi"><Icon.Tag />{(featPoem.tags||[]).slice(0,2).join(", ")}</span>
                </div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",marginTop:20}}>
                <button className={`lbtn ${liked.has(featPoem.id)?"on":""}`} onClick={e=>handleLike(e,featPoem.id)}>
                  <Icon.Heart f={liked.has(featPoem.id)}/>{getLikes(featPoem)}
                </button>
                <button className="iBtn" style={{width:30,height:30}} onClick={e=>copyPoem(e,featPoem)}><Icon.Share /></button>
                {isAdmin && (
                  <button className="iBtn" style={{width:30,height:30}} onClick={e=>{e.stopPropagation();startEdit(featPoem);openAdmin();}}>
                    <Icon.Edit />
                  </button>
                )}
              </div>
            </div>
            <div className="feat-r">
              <div className="feat-q">"</div>
              <div className="feat-text">{featPoem.content.split("\n").slice(0,7).join("\n")}…</div>
            </div>
          </div>
        )}

        {/* STATS */}
        <div className="stats-row">
          {[["Poems", poems.length||"—"],["Hearts", totalLikes||"—"],["Reads", totalViews||"—"]].map(([l,v]) => (
            <div key={l} style={{display:"flex",flexDirection:"column",gap:2}}>
              <span className="stat-n">{typeof v === "number" ? v.toLocaleString() : v}</span>
              <span className="stat-l">{l}</span>
            </div>
          ))}
        </div>

        <div className="sh">
          <h2 className="sh-title">All Writings</h2>
          {poems.length > 0 && <span className="sh-c">{poems.length}+ pieces</span>}
        </div>

        {/* TAGS */}
        <div className="tags">
          {allTags.map(t => (
            <button key={t} className={`tp ${activeTag===t?"on":""}`} onClick={() => setActiveTag(t)}>{t}</button>
          ))}
        </div>

        {/* GRID */}
        <div className="grid">
          {poems.map((poem, i) => {
            const lk = liked.has(poem.id);
            return (
              <div
                key={poem.id}
                className="card"
                onClick={() => openPoem(poem)}
                style={{animationDelay:`${(i % PAGE_SIZE) * 0.06}s`}}
              >
                <div className="c-cat"><Icon.Tag />{poem.category}</div>
                <div className="c-title">{poem.title}</div>
                <div className="c-exc">{poem.content.replace(/\n/g," ").slice(0,150)}…</div>
                <div className="c-foot">
                  <div className="c-meta">
                    <span className="c-mi"><Icon.Eye />{poem.views}</span>
                    <span className="c-mi"><Icon.Clock />{poem.reading_time} min</span>
                  </div>
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    <button className={`lbtn ${lk?"on":""}`} onClick={e=>handleLike(e,poem.id)}>
                      <Icon.Heart f={lk}/>{getLikes(poem)}
                    </button>
                    {isAdmin && (
                      <button className="iBtn" style={{width:27,height:27}} onClick={e=>{e.stopPropagation();startEdit(poem);openAdmin();}}>
                        <Icon.Edit />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {poems.length === 0 && !loading && (
            <div className="empty-s">
              <div style={{fontFamily:"Playfair Display",fontSize:40,opacity:.15,marginBottom:16}}>✦</div>
              <p style={{fontFamily:"Playfair Display",fontSize:18,marginBottom:7}}>
                {activeTag !== "All" ? `No poems tagged "${activeTag}"` : "No writings yet"}
              </p>
              <p style={{fontSize:12,color:"var(--t2)"}}>
                {isAdmin ? "Add your first poem from the Manage panel." : "Check back soon."}
              </p>
            </div>
          )}
        </div>

        {/* SENTINEL */}
        <div className="lm" ref={sentinelRef}>
          {loading && <div className="spin"/>}
          {!hasMore && poems.length > 0 && <span className="end">— fin —</span>}
        </div>
      </main>

      {/* SEARCH OVERLAY */}
      {searchOpen && (
        <div className="sOv" onClick={() => setSearchOpen(false)}>
          <div className="sBox" onClick={e => e.stopPropagation()}>
            <div className="sWrap">
              <input
                className="sInp"
                placeholder="Search poems & writings…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button className="sX" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}><Icon.X s={18}/></button>
            </div>
            {searchResults.map(p => (
              <div key={p.id} className="sR" onClick={() => { openPoem(p); setSearchOpen(false); setSearchQuery(""); }}>
                <div className="sR-t">{p.title}</div>
                <div className="sR-p">{p.content.replace(/\n/g," ").slice(0,90)}…</div>
              </div>
            ))}
            {searchQuery && !searchResults.length && (
              <div style={{color:"var(--t2)",fontSize:13,paddingTop:12}}>No results for "{searchQuery}"</div>
            )}
          </div>
        </div>
      )}

      {/* POEM MODAL */}
      {selected && (
        <div className="mOv" onClick={() => setSelected(null)}>
          <div className="mC" onClick={e => e.stopPropagation()}>
            <button className="mClose" onClick={() => setSelected(null)}><Icon.X/></button>
            <div className="m-ey">
              <Icon.Tag/>{selected.category}
              {(selected.tags||[]).map(t => <span key={t} style={{color:"var(--t2)"}}>· {t}</span>)}
            </div>
            <h1 className="m-title">{selected.title}</h1>
            <div className="m-rule"/>
            <div className="m-poem">{selected.content}</div>
            <div className="m-foot">
              <div>
                <div className="m-name">— {selected.author}</div>
                <div className="m-date">{fmt(selected.published_at)}</div>
              </div>
              <div className="m-acts">
                <span className="m-views"><Icon.Eye />{modalLoading ? "…" : selected.views}</span>
                <button
                  className={`lbtn ${liked.has(selected.id)?"on":""}`}
                  onClick={e => handleLike(e, selected.id)}
                  style={{padding:"7px 15px"}}
                >
                  <Icon.Heart f={liked.has(selected.id)}/>{getLikes(selected)}
                </button>
                <button className="iBtn" onClick={e => copyPoem(e, selected)}><Icon.Share/></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN MODAL */}
      {showLogin && (
        <div className="lOv" onClick={() => setShowLogin(false)}>
          <div className="lCard" onClick={e => e.stopPropagation()}>
            <button className="iBtn" style={{position:"absolute",top:12,right:12,margin:0}} onClick={() => setShowLogin(false)}>
              <Icon.X s={14}/>
            </button>
            <div className="lLogo">VERSES</div>
            <div className="lSub">Private admin access<br/>Restricted to authorised email only</div>
            <button className="ggBtn" onClick={handleGoogleLogin} disabled={loginLoading}>
              {loginLoading ? <><Icon.Loader />Signing in…</> : <>{GOOG_SVG}Continue with Google</>}
            </button>
            {loginError && <div className="lErr">{loginError}</div>}
            <div className="lNote">🔒 Only the registered admin email can sign in.<br/>All others will be denied.</div>
          </div>
        </div>
      )}

      {/* ADMIN DRAWER */}
      {showAdmin && isAdmin && (
        <div className="aOv" onClick={() => setShowAdmin(false)}>
          <div className="drw" onClick={e => e.stopPropagation()}>
            <div className="drHead">
              <div className="drTitle">{editId ? "Edit Poem" : "New Poem"}</div>
              <div style={{display:"flex",gap:8}}>
                {editId && <button className="gBtn" onClick={resetForm}>Cancel edit</button>}
                <button className="iBtn" style={{margin:0}} onClick={() => { setShowAdmin(false); resetForm(); }}>
                  <Icon.X s={14}/>
                </button>
              </div>
            </div>
            <div className="drBody">
              <div className="fGrp">
                <label className="fLbl">Title</label>
                <input className="fInp" value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} placeholder="Poem title…"/>
              </div>
              <div className="fGrp">
                <label className="fLbl">Content</label>
                <textarea className="fTA" value={form.content} onChange={e => setForm(p=>({...p,content:e.target.value}))}
                  placeholder={"Write your poem here…\n\nLine breaks are preserved."} style={{minHeight:200}}/>
              </div>
              <div className="fRow">
                <div className="fGrp">
                  <label className="fLbl">Author</label>
                  <input className="fInp" value={form.author} onChange={e => setForm(p=>({...p,author:e.target.value}))} placeholder="HD"/>
                </div>
                <div className="fGrp">
                  <label className="fLbl">Category</label>
                  <input className="fInp" value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))} placeholder="Night, Love…"/>
                </div>
              </div>
              <div className="fGrp">
                <label className="fLbl">Tags (comma separated)</label>
                <input className="fInp" value={form.tags} onChange={e => setForm(p=>({...p,tags:e.target.value}))} placeholder="love, cosmos, kashmir…"/>
              </div>
              <div className="fGrp" style={{display:"flex",alignItems:"center",gap:9}}>
                <input type="checkbox" id="ft" checked={form.is_featured}
                  onChange={e => setForm(p=>({...p,is_featured:e.target.checked}))}
                  style={{accentColor:"var(--gold)",width:15,height:15}}/>
                <label htmlFor="ft" className="fLbl" style={{margin:0}}>Set as featured poem</label>
              </div>
              <button
                className="goldBtn"
                style={{width:"100%",justifyContent:"center",height:42,marginTop:6}}
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? <><Icon.Loader />{editId?"Saving…":"Publishing…"}</>
                  : <><Icon.Plus/>{editId?"Save Changes":"Publish Poem"}</>}
              </button>

              {/* Published list */}
              <div className="aList">
                <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:16}}>
                  <span className="drTitle" style={{fontSize:15}}>Published</span>
                  <span style={{fontSize:11,color:"var(--t2)"}}>{adminPoems.length}</span>
                </div>
                {adminPoems.map(poem => (
                  <div key={poem.id} className="aItem">
                    <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
                      <div className="aItem-t" style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {poem.is_featured && <span style={{color:"var(--gold)",marginRight:6}}>★</span>}
                        {poem.title}
                      </div>
                      <div className="aItem-m">{fmt(poem.published_at)} · ♥ {poem.likes} · 👁 {poem.views}</div>
                    </div>
                    <div className="aBtns">
                      <button className="iBtn" style={{width:28,height:28}} onClick={() => startEdit(poem)}><Icon.Edit/></button>
                      <button className="dBtn" onClick={() => setConfirmDel(poem.id)}><Icon.Trash/></button>
                    </div>
                  </div>
                ))}
                {adminPoems.length === 0 && (
                  <p style={{fontSize:12,color:"var(--t3)",textAlign:"center",padding:"20px 0"}}>No poems yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE */}
      {confirmDel && (
        <div className="lOv" style={{zIndex:500}} onClick={() => setConfirmDel(null)}>
          <div className="cfmCard" onClick={e => e.stopPropagation()}>
            <div className="lLogo" style={{fontSize:20,marginBottom:10}}>Delete this poem?</div>
            <div className="lSub" style={{marginBottom:28}}>This cannot be undone.</div>
            <div style={{display:"flex",gap:10}}>
              <button className="gBtn" style={{flex:1,justifyContent:"center",height:40}} onClick={() => setConfirmDel(null)}>Cancel</button>
              <button className="dBtn" style={{flex:1,height:40,width:"auto",borderRadius:7,fontSize:13}} onClick={() => handleDelete(confirmDel)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
