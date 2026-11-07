const RESERVED = new Set(["admin","api","auth","account","accounts","login","logout","signup","register","settings","support","help","about","terms","privacy","security","profile","profiles","u","user","users","www","root","system","ocodejs"]);

export function normalizeProfileUsername(input) {
  const normalized = String(input ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
    .replace(/-+$/g, "");
  return normalized.length >= 3 && !RESERVED.has(normalized) ? normalized : "member";
}

export function isReservedProfileUsername(value) {
  return RESERVED.has(String(value ?? "").toLowerCase());
}
