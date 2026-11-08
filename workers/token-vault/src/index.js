const SESSION_TTL = 4 * 60 * 60;
const WINDOW = 900;
const LIMITS = { login: 8, reveal: 20 };
const PRIVILEGED = new Set(["owner", "security_admin"]);
const enc = new TextEncoder();

function headers(extra = {}) {
  return {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    "cache-control": "no-store, max-age=0",
    ...extra
  };
}
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: headers({ "content-type": "application/json; charset=utf-8", ...extra }) });
}
function page(body) {
  return new Response(body, { headers: headers({ "content-type": "text/html; charset=utf-8" }) });
}
function b64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function unb64(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(value)) throw Error("bad encoding");
  const raw = value.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/g, "");
  const s = raw + "=".repeat((4 - raw.length % 4) % 4);
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}
async function hash(value) { return b64(await crypto.subtle.digest("SHA-256", enc.encode(value))); }
async function hmac(secret, usage) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}
async function verifyAppAssertion(req, env) {
  if (!env.APP_ASSERTION_SECRET || env.APP_ASSERTION_SECRET.length < 32) return null;
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const parts = authorization.slice(7).split(".");
  if (parts.length !== 3) return null;
  try {
    const claims = JSON.parse(new TextDecoder().decode(unb64(parts[1])));
    const valid = await crypto.subtle.verify(
      "HMAC", await hmac(env.APP_ASSERTION_SECRET, "verify"),
      unb64(parts[2]), enc.encode(parts[0] + "." + parts[1])
    );
    const now = Math.floor(Date.now() / 1000);
    if (!valid || claims.iss !== "ocodejs-account" || claims.aud !== "ocodejs-token-vault" ||
        typeof claims.sub !== "string" || claims.sub.length < 1 || claims.sub.length > 255 ||
        !Number.isInteger(claims.exp) || claims.exp <= now || claims.exp > now + 90 ||
        !Number.isInteger(claims.iat) || claims.iat > now + 30 ||
        typeof claims.jti !== "string" || claims.jti.length < 12) return null;
    return { subject: claims.sub };
  } catch { return null; }
}
async function serviceWriteAllowed(env, subject, action) {
  const bucket = await hash("vault-service|" + action + "|" + subject);
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare("SELECT attempts,window_started FROM login_attempts WHERE bucket=?").bind(bucket).first();
  if (row && now - row.window_started < 60 && row.attempts >= 20) return false;
  if (!row || now - row.window_started >= 60) {
    await env.DB.prepare("INSERT OR REPLACE INTO login_attempts(bucket,attempts,window_started) VALUES(?,?,?)").bind(bucket, 1, now).run();
  } else {
    await env.DB.prepare("UPDATE login_attempts SET attempts=attempts+1 WHERE bucket=?").bind(bucket).run();
  }
  return true;
}
async function serviceRoute(req, env, service) {
  const subject = service.subject;
  await env.DB.prepare("INSERT OR IGNORE INTO identities(id,subject,role,active) VALUES(?,?,'developer',1)")
    .bind(crypto.randomUUID(), subject).run();
  const identity = await env.DB.prepare("SELECT active FROM identities WHERE subject=?").bind(subject).first();
  if (!identity || !identity.active) return json({ error: "Account disabled" }, 403);

  if (req.method === "GET" && new URL(req.url).pathname === "/api/service/tokens") {
    const rows = await env.DB.prepare(
      "SELECT id,label,provider,created_at,rotated_at FROM vault_tokens WHERE owner_subject=? ORDER BY created_at DESC LIMIT 100"
    ).bind(subject).all();
    return json({ tokens: rows.results });
  }

  if (req.method === "POST" && new URL(req.url).pathname === "/api/service/tokens") {
    if (!await serviceWriteAllowed(env, subject, "create")) return json({ error: "Rate limit exceeded" }, 429);
    let body; try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
    const providers = new Set(["openai", "google", "anthropic", "custom"]);
    if (typeof body.label !== "string" || !body.label.trim() || body.label.length > 100 ||
        typeof body.provider !== "string" || !providers.has(body.provider) ||
        typeof body.value !== "string" || body.value.length < 8 || body.value.length > 8192) {
      return json({ error: "Invalid credential" }, 400);
    }
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(env), enc.encode(body.value));
    const id = crypto.randomUUID();
    const projectId = "user-" + subject.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 48);
    await env.DB.prepare(
      "INSERT INTO vault_tokens(id,label,provider,project_id,ciphertext,iv,created_by,owner_subject) VALUES(?,?,?,?,?,?,?,?)"
    ).bind(id, body.label.trim().slice(0, 100), body.provider, projectId, b64(ciphertext), b64(iv), subject, subject).run();
    await audit(env, subject, "user.token.create", id);
    return json({ id }, 201);
  }

  const resolve = new URL(req.url).pathname.match(/^\/api\/service\/tokens\/([0-9a-f-]{36})\/resolve$/i);
  if (req.method === "POST" && resolve) {
    if (!await serviceWriteAllowed(env, subject, "resolve")) return json({ error: "Rate limit exceeded" }, 429);
    const row = await env.DB.prepare(
      "SELECT ciphertext,iv FROM vault_tokens WHERE id=? AND owner_subject IS NULL AND owner_subject=?"
    ).bind(resolve[1], subject).first();
    if (!row) return json({ error: "Not found" }, 404);
    try {
      const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(row.iv) }, await key(env), unb64(row.ciphertext));
      await audit(env, subject, "user.token.resolve", resolve[1]);
      return json({ value: new TextDecoder().decode(clear) });
    } catch {
      await audit(env, subject, "user.token.resolve", resolve[1], "decrypt_failed");
      return json({ error: "Unable to resolve credential" }, 500);
    }
  }

  const remove = new URL(req.url).pathname.match(/^\/api\/service\/tokens\/([0-9a-f-]{36})$/i);
  if (req.method === "DELETE" && remove) {
    if (!await serviceWriteAllowed(env, subject, "delete")) return json({ error: "Rate limit exceeded" }, 429);
    const result = await env.DB.prepare("DELETE FROM vault_tokens WHERE id=? AND owner_subject IS NULL AND owner_subject=?")
      .bind(remove[1], subject).run();
    await audit(env, subject, "user.token.delete", remove[1], result.meta?.changes ? "success" : "not_found");
    return json({ ok: true });
  }
  return json({ error: "Not found" }, 404);
}

async function sign(id, secret) {
  return id + "." + b64(await crypto.subtle.sign("HMAC", await hmac(secret, "sign"), enc.encode(id)));
}
async function verify(value, secret) {
  if (!value || value.length > 256) return null;
  const parts = value.split(".");
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]{40,64}$/.test(parts[0])) return null;
  try {
    return await crypto.subtle.verify("HMAC", await hmac(secret, "verify"), unb64(parts[1]), enc.encode(parts[0])) ? parts[0] : null;
  } catch { return null; }
}
async function verifyPassword(password, encoded) {
  if (typeof encoded !== "string" || encoded.length > 256) return false;
  const parts = encoded.split(":");
  if (parts.length !== 2) return false;
  try {
    const salt = unb64(parts[0]), expected = unb64(parts[1]);
    if (salt.length !== 16 || expected.length !== 32) return false;
    const material = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" }, material, 256));
    return actual.length === expected.length && actual.every((v, i) => v === expected[i]);
  } catch { return false; }
}
function cookie(value, age) {
  return "oc_token_session=" + value + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=" + age;
}
function cookieValue(req) {
  return (req.headers.get("cookie") || "").split(";").map(x => x.trim())
    .find(x => x.startsWith("oc_token_session="))?.slice(17) || "";
}
function sameOrigin(req) {
  const origin = req.headers.get("origin"), site = req.headers.get("sec-fetch-site");
  return !!origin && origin === new URL(req.url).origin && (!site || site === "same-origin" || site === "none");
}
function configured(env) {
  if (!env.DB || !env.BOOTSTRAP_PASSWORD_HASH || !env.SESSION_SIGNING_KEY || !env.TOKEN_ENCRYPTION_KEY) throw Error("not configured");
  if (env.SESSION_SIGNING_KEY.length < 32 || unb64(env.TOKEN_ENCRYPTION_KEY).length !== 32) throw Error("invalid keys");
}
async function audit(env, actor, action, resource, outcome = "success") {
  await env.DB.prepare("INSERT INTO audit_events(id,actor,action,resource_id,outcome) VALUES(?,?,?,?,?)")
    .bind(crypto.randomUUID(), actor, action, resource || null, outcome).run();
}
async function currentUser(req, env, ctx) {
  const id = await verify(cookieValue(req), env.SESSION_SIGNING_KEY);
  if (id) {
    const row = await env.DB.prepare("SELECT s.subject,i.role,s.expires_at,i.active FROM sessions s JOIN identities i ON i.subject=s.subject WHERE s.id_hash=? AND s.revoked=0")
      .bind(await hash(id)).first();
    if (row && row.active && row.expires_at > Math.floor(Date.now() / 1000)) return { subject: row.subject, role: row.role, auth: "session" };
  }
  if (ctx?.access && typeof ctx.access.getIdentity === "function") {
    const identity = await ctx.access.getIdentity();
    const email = typeof identity?.email === "string" ? identity.email.trim().toLowerCase() : "";
    if (!email || email.length > 254) return null;
    const member = await env.DB.prepare("SELECT subject,role,active FROM identities WHERE subject=?").bind(email).first();
    if (member?.active) return { subject: member.subject, role: member.role, auth: "cloudflare-access" };
  }
  return null;
}
async function key(env) {
  return crypto.subtle.importKey("raw", unb64(env.TOKEN_ENCRYPTION_KEY), "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function rateLimit(req, env, action) {
  const bucket = await hash(action + "|" + (req.headers.get("cf-connecting-ip") || "unknown"));
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare("SELECT attempts,window_started FROM login_attempts WHERE bucket=?").bind(bucket).first();
  if (row && now - row.window_started < WINDOW && row.attempts >= LIMITS[action]) return { ok: false, bucket };
  if (!row || now - row.window_started >= WINDOW) {
    await env.DB.prepare("INSERT OR REPLACE INTO login_attempts(bucket,attempts,window_started) VALUES(?,?,?)").bind(bucket, 1, now).run();
  } else {
    await env.DB.prepare("UPDATE login_attempts SET attempts=attempts+1 WHERE bucket=?").bind(bucket).run();
  }
  return { ok: true, bucket };
}

async function authenticateAgent(req, env) {
  if (req.headers.has("origin")) return null;
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer (oca_[A-Za-z0-9_-]{40,64})$/);
  if (!match) return null;
  const row = await env.DB.prepare(
    "SELECT c.id,c.subject,c.expires_at,i.active FROM agent_credentials c JOIN identities i ON i.subject=c.subject WHERE c.key_hash=? AND c.active=1"
  ).bind(await hash(match[1])).first();
  const now = Math.floor(Date.now() / 1000);
  if (!row || !row.active || (row.expires_at && row.expires_at <= now)) return null;
  await env.DB.prepare("UPDATE agent_credentials SET last_used_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").bind(row.id).run();
  return { id: row.id, subject: row.subject };
}
async function agentGrant(env, agentId, projectId) {
  return env.DB.prepare("SELECT permission FROM agent_project_grants WHERE agent_id=? AND project_id=?")
    .bind(agentId, projectId).first();
}
function validProject(value) {
  return typeof value === "string" && /^[a-z0-9][a-z0-9._-]{1,63}$/.test(value);
}
const LOGIN_HTML = '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>OCode.js · Token Vault</title><style>:root{color-scheme:dark;font:13px/1.6 ui-monospace,monospace;background:#000;color:#f5f5f5}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px}main{width:min(100%,420px);border:1px solid #444;background:#080808;padding:28px}p{color:#999}h1{font-size:28px;margin:30px 0 4px}label{display:block;color:#aaa;font-size:10px;margin:24px 0 8px}input,button{width:100%;height:46px;border:1px solid #555;background:#000;color:#fff;padding:0 12px;font:inherit}button{margin-top:14px;background:#f5f5f5;color:#000;font-weight:700}.msg{min-height:24px;color:#aaa;margin-top:12px}</style><body><main><small>OCODE.JS / SECURITY</small><h1>Token Vault</h1><p>Protected credential workspace</p><form id="f"><label for="p">MASTER PASSWORD · TOKEN</label><input id="p" type="password" minlength="16" maxlength="1024" autocomplete="current-password" required autofocus><button id="b">Unlock Vault</button><div class="msg" id="m" role="status"></div></form></main><script>document.querySelector("#f").addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget,button=document.querySelector("#b"),message=document.querySelector("#m");button.disabled=true;message.textContent="Authenticating…";try{const r=await fetch("/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password:document.querySelector("#p").value})});if(!r.ok)throw Error();location.assign("/vault")}catch{message.textContent="Authentication failed or temporarily unavailable"}finally{button.disabled=false;form.reset()}})</script></body></html>';
const VAULT_HTML = '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>OCode.js · Vault</title><style>:root{color-scheme:dark;font:13px/1.6 ui-monospace,monospace;background:#000;color:#f5f5f5}*{box-sizing:border-box}body{max-width:1100px;margin:auto;padding:24px}.top{display:flex;justify-content:space-between;border-bottom:1px solid #444;padding:12px 0 20px}h1{font-size:26px;margin:28px 0 4px}.muted{color:#999}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px;margin:24px 0}.panel{border:1px solid #444;background:#080808;padding:18px}label{display:block;color:#aaa;font-size:10px;margin:12px 0 6px}input{width:100%;height:42px;background:#000;border:1px solid #555;color:#fff;padding:8px;font:inherit}button{border:1px solid #777;background:#f5f5f5;color:#000;padding:9px 12px;font:inherit;font-weight:700;margin:6px 6px 0 0}.alt{background:#080808;color:#fff}.token{border-top:1px solid #333;padding:14px 0}.token strong{display:block}.msg{min-height:20px;color:#aaa}</style><body><header class="top"><div><b>OCode.js / TOKEN VAULT</b><div class="muted" id="who">Checking session…</div></div><button class="alt" id="out">Sign out</button></header><h1>Credential workspace</h1><p class="muted">Encrypted storage · Explicit reveal · Audited access</p><div class="grid"><form class="panel" id="create"><b>Register credential</b><label>LABEL</label><input id="label" maxlength="100" required><label>PROVIDER</label><input id="provider" maxlength="80" required><label>PROJECT ID</label><input id="project" value="ocodejs-core" maxlength="64" required><label>SECRET VALUE</label><input id="value" type="password" minlength="8" maxlength="8192" autocomplete="off" required><button>Encrypt & save</button><div class="msg" id="createMsg"></div></form><section class="panel"><b>Security</b><p class="muted">Secrets are encrypted before storage. Reveal is restricted to privileged roles. Revealed values are cleared after 15 seconds.</p><button class="alt" id="refresh">Refresh inventory</button><div class="msg" id="status"></div></section></div><section class="panel" id="memberPanel" hidden><b>Authorized personnel · Owner only</b><form id="newMember"><label>WORK EMAIL · MUST MATCH CLOUDFLARE ACCESS IDENTITY</label><input id="memberEmail" type="email" maxlength="254" required><label>ROLE</label><select id="memberRole"><option value="security_admin">Security Admin</option><option value="developer">Developer · metadata only</option><option value="auditor">Auditor · metadata only</option></select><button>Add authorized member</button></form><div id="members" class="muted"></div></section><section class="panel" id="agentPanel" hidden><b>AI Agent access · Owner only</b><form id="newAgent"><label>AGENT SUBJECT</label><input id="agentSubject" maxlength="64" pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,63}" required><label>EXPIRY DAYS · 1–365</label><input id="agentDays" type="number" min="1" max="365" value="90" required><button>Issue one-time API key</button></form><label>ONE-TIME KEY · COPY NOW</label><input id="agentKey" readonly autocomplete="off" placeholder="Key appears once after creation"><form id="grantAgent"><label>AGENT SUBJECT</label><input id="grantSubject" maxlength="64" required><label>PROJECT ID</label><input id="grantProject" maxlength="64" required><label>PERMISSION</label><select id="grantPermission"><option value="metadata">Metadata only</option><option value="reveal">Read token value</option></select><button>Save project grant</button></form><div id="agents" class="muted"></div></section><section class="panel"><b>Stored credentials</b><div id="tokens" class="muted">Loading…</div></section><script>const $=s=>document.querySelector(s);async function api(path,o={}){const r=await fetch(path,{...o,headers:{"content-type":"application/json",...(o.headers||{})}});if(r.status===401){location.assign("/");throw Error("Session expired")}const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Request failed");return d}async function loadMembers(){try{const d=await api("/api/members");$("#members").replaceChildren();for(const m of d.members){const row=document.createElement("div");row.className="token";const name=document.createElement("strong");name.textContent=m.subject+" · "+m.role+(m.active?"":" · disabled");const select=document.createElement("select");for(const role of ["security_admin","developer","auditor"]){const option=document.createElement("option");option.value=role;option.textContent=role;select.append(option)}select.value=m.role;const save=document.createElement("button");save.className="alt";save.textContent="Update role";save.disabled=!m.active;save.onclick=async()=>{await api("/api/members/"+encodeURIComponent(m.subject),{method:"PATCH",body:JSON.stringify({role:select.value})});loadMembers()};const revoke=document.createElement("button");revoke.className="alt";revoke.textContent="Revoke";revoke.disabled=!m.active;revoke.onclick=async()=>{if(confirm("Revoke access for "+m.subject+"?")){await api("/api/members/"+encodeURIComponent(m.subject),{method:"DELETE"});loadMembers()}};row.append(name,select,save,revoke);$("#members").append(row)}}catch(e){$("#status").textContent=e.message}}$("#newMember").onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{await api("/api/members",{method:"POST",body:JSON.stringify({email:$("#memberEmail").value,role:$("#memberRole").value})});$("#memberEmail").value="";loadMembers()}catch(x){$("#status").textContent=x.message}finally{b.disabled=false}};async function loadAgents(){try{const d=await api("/api/agents");$("#agents").replaceChildren();for(const a of d.agents){const row=document.createElement("div");row.className="token";const name=document.createElement("strong");name.textContent=a.subject+" · "+(a.active?"active":"revoked");const meta=document.createElement("div");meta.textContent="Expires "+new Date(a.expires_at*1000).toLocaleString()+" · Last used "+(a.last_used_at||"never");const revoke=document.createElement("button");revoke.className="alt";revoke.textContent="Revoke";revoke.disabled=!a.active;revoke.onclick=async()=>{if(confirm("Revoke this agent key?")){await api("/api/agents/"+encodeURIComponent(a.subject),{method:"DELETE"});loadAgents()}};row.append(name,meta,revoke);$("#agents").append(row)}}catch(e){$("#status").textContent=e.message}}$("#newAgent").onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{const d=await api("/api/agents",{method:"POST",body:JSON.stringify({subject:$("#agentSubject").value,expires_in_days:Number($("#agentDays").value)})});$("#agentKey").value=d.api_key;$("#grantSubject").value=d.subject;$("#agentSubject").value="";loadAgents()}catch(x){$("#status").textContent=x.message}finally{b.disabled=false}};$("#grantAgent").onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{await api("/api/agents/"+encodeURIComponent($("#grantSubject").value)+"/grants",{method:"POST",body:JSON.stringify({project_id:$("#grantProject").value,permission:$("#grantPermission").value})});$("#status").textContent="Project grant saved.";loadAgents()}catch(x){$("#status").textContent=x.message}finally{b.disabled=false}};async function load(){try{const me=await api("/api/me");$("#who").textContent=me.subject+" · "+me.role;const canManage=["owner","security_admin"].includes(me.role);$("#memberPanel").hidden=me.role!=="owner";$("#agentPanel").hidden=me.role!=="owner";if(me.role==="owner"){loadMembers();loadAgents();}const d=await api("/api/tokens");$("#tokens").replaceChildren();if(!d.tokens.length){$("#tokens").textContent="No credentials stored.";return}for(const t of d.tokens){const row=document.createElement("div");row.className="token";const title=document.createElement("strong");title.textContent=t.label;const meta=document.createElement("div");meta.className="muted";meta.textContent=t.provider+" · "+t.project_id+" · "+new Date(t.created_at).toLocaleString();const reveal=document.createElement("button");reveal.className="alt";reveal.textContent="Reveal";reveal.disabled=!canManage;reveal.onclick=async()=>{try{const x=await api("/api/tokens/"+t.id+"/reveal",{method:"POST",body:"{}"});const v=document.createElement("input");v.readOnly=true;v.value=x.value;row.append(v);setTimeout(()=>{v.value="";v.remove()},15000)}catch(e){$("#status").textContent=e.message}};const del=document.createElement("button");del.className="alt";del.textContent="Delete";del.disabled=!canManage;del.onclick=async()=>{if(confirm("Delete this credential?")){await api("/api/tokens/"+t.id,{method:"DELETE"});load()}};row.append(title,meta,reveal,del);$("#tokens").append(row)}}catch(e){$("#status").textContent=e.message}}$("#create").onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{await api("/api/tokens",{method:"POST",body:JSON.stringify({label:$("#label").value,provider:$("#provider").value,project_id:$("#project").value,value:$("#value").value})});e.target.reset();$("#createMsg").textContent="Encrypted credential saved.";load()}catch(x){$("#createMsg").textContent=x.message}finally{b.disabled=false}};$("#out").onclick=async()=>{try{await api("/api/logout",{method:"POST",body:"{}"})}finally{location.assign("/")}};$("#refresh").onclick=load;load();</script></body></html>';
async function login(req, env) {
  if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);
  const limit = await rateLimit(req, env, "login");
  if (!limit.ok) return json({ error: "Too many attempts" }, 429);
  let body; try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 16 || password.length > 1024 || !await verifyPassword(password, env.BOOTSTRAP_PASSWORD_HASH)) {
    await audit(env, "TOKEN", "login", null, "denied");
    return json({ error: "Unauthorized" }, 401);
  }
  const identity = await env.DB.prepare("SELECT subject,role,active FROM identities WHERE subject='TOKEN'").first();
  if (!identity?.active || identity.role !== "owner") return json({ error: "Unauthorized" }, 401);
  await env.DB.prepare("DELETE FROM login_attempts WHERE bucket=?").bind(limit.bucket).run();
  const id = b64(crypto.getRandomValues(new Uint8Array(32)));
  const expiry = Math.floor(Date.now() / 1000) + SESSION_TTL;
  await env.DB.prepare("INSERT INTO sessions(id_hash,subject,role,expires_at) VALUES(?,?,?,?)").bind(await hash(id), identity.subject, identity.role, expiry).run();
  await audit(env, "TOKEN", "login", null);
  return json({ ok: true }, 200, { "set-cookie": cookie(await sign(id, env.SESSION_SIGNING_KEY), SESSION_TTL) });
}
async function route(req, env, ctx) {
  const path = new URL(req.url).pathname;
  const isAgentApi = path.startsWith("/api/agent/");
  const isServiceApi = path.startsWith("/api/service/");
  if (env.ACCESS_REQUIRED === "true" && !isAgentApi && !isServiceApi && !ctx?.access) return json({ error: "Cloudflare Access authentication required" }, 403);
  if (req.method === "GET" && (path === "/" || path === "/login")) {
    if (ctx?.access) {
      configured(env);
      if (await currentUser(req, env, ctx)) return Response.redirect(new URL("/vault", req.url), 303);
    }
    return page(LOGIN_HTML);
  }
  if (isAgentApi || isServiceApi) {
    if (req.headers.has("origin")) return json({ error: "Forbidden" }, 403);
  } else if (["POST", "PATCH", "DELETE"].includes(req.method) && !sameOrigin(req)) return json({ error: "Forbidden" }, 403);
  if (req.method === "GET" && path === "/vault") {
    configured(env);
    return await currentUser(req, env, ctx) ? page(VAULT_HTML) : Response.redirect(new URL("/", req.url), 303);
  }
  configured(env);
  if (req.method === "POST" && path === "/api/login") return login(req, env);
  if (req.method === "POST" && path === "/api/logout") {
    const user = await currentUser(req, env, ctx), id = await verify(cookieValue(req), env.SESSION_SIGNING_KEY);
    if (id) await env.DB.prepare("UPDATE sessions SET revoked=1 WHERE id_hash=?").bind(await hash(id)).run();
    if (user) await audit(env, user.subject, "logout", null);
    return json({ ok: true }, 200, { "set-cookie": cookie("", 0) });
  }

  if (path.startsWith("/api/agent/")) {
    const agent = await authenticateAgent(req, env);
    if (!agent) return json({ error: "Unauthorized" }, 401);
    if (req.method === "GET" && path === "/api/agent/tokens") {
      const projectId = new URL(req.url).searchParams.get("project_id") || "";
      if (!validProject(projectId)) return json({ error: "Invalid project_id" }, 400);
      const grant = await agentGrant(env, agent.id, projectId);
      if (!grant) return json({ error: "Forbidden" }, 403);
      const rows = await env.DB.prepare(
        "SELECT id,label,provider,project_id,created_at FROM vault_tokens WHERE project_id=? ORDER BY created_at DESC LIMIT 200"
      ).bind(projectId).all();
      return json({ tokens: rows.results, permission: grant.permission });
    }
    const agentReveal = path.match(/^\/api\/agent\/tokens\/([0-9a-f-]+)\/reveal$/i);
    if (req.method === "POST" && agentReveal) {
      const row = await env.DB.prepare("SELECT id,project_id,ciphertext,iv FROM vault_tokens WHERE id=?")
        .bind(agentReveal[1]).first();
      if (!row) return json({ error: "Not found" }, 404);
      const grant = await agentGrant(env, agent.id, row.project_id);
      if (!grant || grant.permission !== "reveal") return json({ error: "Forbidden" }, 403);
      const agentRevealLimit = await rateLimit(req, env, "reveal");
      if (!agentRevealLimit.ok) return json({ error: "Too many reveal attempts" }, 429);
      try {
        const clear = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: unb64(row.iv) }, await key(env), unb64(row.ciphertext)
        );
        await audit(env, agent.subject, "agent.token.reveal", row.id);
        return json({ value: new TextDecoder().decode(clear) });
      } catch {
        await audit(env, agent.subject, "agent.token.reveal", row.id, "decrypt_failed");
        return json({ error: "Unable to reveal credential" }, 500);
      }
    }
    return json({ error: "Not found" }, 404);
  }
  if (isServiceApi) {
    const service = await verifyAppAssertion(req, env);
    if (!service) return json({ error: "Unauthorized" }, 401);
    return await serviceRoute(req, env, service);
  }
  const user = await currentUser(req, env, ctx);
  if (!user) return json({ error: "Unauthorized" }, 401);
  if (req.method === "GET" && path === "/api/me") return json({ subject: user.subject, role: user.role, auth: user.auth || "session" });

  if (req.method === "GET" && path === "/api/members") {
    if (user.role !== "owner") return json({ error: "Forbidden" }, 403);
    const rows = await env.DB.prepare(
      "SELECT subject,role,active FROM identities WHERE subject<>'TOKEN' AND role<>'ai_agent' ORDER BY subject"
    ).all();
    return json({ members: rows.results });
  }
  if (req.method === "POST" && path === "/api/members") {
    if (user.role !== "owner") return json({ error: "Forbidden" }, 403);
    let body; try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
    const email = typeof body.email === "string" ? body.email.trim().t

--- TRUNCATED ---
Response was ~8,370 tokens (limit: 6,000). Use more specific queries to reduce response size.