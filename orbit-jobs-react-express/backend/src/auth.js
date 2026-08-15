/**
 * Session auth: HMAC-signed cookie, same scheme as the original build.
 * Passwords are hashed with bcryptjs for the demo; production uses argon2id.
 */
import crypto from "crypto";
import { Users } from "./db.js";

const SESSION_SECRET = process.env.SESSION_SECRET || "orbit-demo-secret-change-me";
export const SESSION_COOKIE = "orbit_session";
const SESSION_TTL_HOURS = 24 * 14;

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function verify(token) {
  if (!token || !token.includes(".")) return null;
  const [body, mac] = token.split(".");
  const expect = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  if (mac.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expect))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setSession(res, user) {
  const token = sign({
    uid: user.id,
    sv: user.sessionVersion || 0,
    exp: Date.now() + SESSION_TTL_HOURS * 3600 * 1000,
  });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_TTL_HOURS * 3600 * 1000,
  });
}

export function clearSession(res) {
  res.cookie(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

/** Current user from the request cookie. Session dies if a reset bumped sessionVersion. */
export async function currentUser(req) {
  const payload = verify(req.cookies?.[SESSION_COOKIE]);
  if (!payload) return null;
  const u = await (await Users()).findOne({ id: payload.uid }, { projection: { _id: 0 } });
  if (!u || (u.sessionVersion || 0) !== payload.sv) return null;
  return u;
}

export function publicUser(u) {
  if (!u) return null;
  return { id: u.id, role: u.role, name: u.name, email: u.email, employerId: u.employerId || null };
}

/** Role gate middleware: sets req.user or ends the request with 401/403. */
export function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      const user = await currentUser(req);
      if (!user) return res.status(401).json({ error: "Sign in required." });
      if (!roles.includes(user.role)) return res.status(403).json({ error: "Not allowed." });
      req.user = user;
      next();
    } catch (ex) {
      next(ex);
    }
  };
}

/* Minimal in-memory rate limiter for auth + public forms. Per-instance is fine for the demo;
   production would back this with Redis or the platform's edge rate limiting. */
const buckets = new Map();
export function rateLimited(name, ip, max, windowMs) {
  const key = `${name}:${ip}`;
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.reset) b = { n: 0, reset: now + windowMs };
  b.n += 1;
  buckets.set(key, b);
  return b.n > max;
}

export function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  return (typeof fwd === "string" && fwd.split(",")[0].trim()) || req.ip || "local";
}

/** Rate-limit middleware wrapper for public endpoints. */
export function rateLimit(name, max, windowMs) {
  return (req, res, next) => {
    if (rateLimited(name, clientIp(req), max, windowMs)) {
      return res.status(429).json({ error: "Too many requests — please wait a moment." });
    }
    next();
  };
}
