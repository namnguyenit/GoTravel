import { ipKeyGenerator } from "express-rate-limit";

// Buckets survive configuration reloads when the policy is unchanged. A bounded
// in-process store is appropriate for the current single Gateway instance.
export function createDynamicLimiter() {
  const buckets = new Map();
  let requests = 0;
  return (req, res, next, id, policy) => {
    const now = Date.now();
    if (++requests % 256 === 0 || buckets.size >= 50000) {
      for (const [key, bucket] of buckets)
        if (bucket.resetAt <= now) buckets.delete(key);
    }
    const ip = ipKeyGenerator(req.ip || req.socket.remoteAddress || "unknown");
    const mode = policy.key || "ip";
    if (mode !== "ip" && !req.auth?.sub)
      return res.status(401).json({
        status: 401,
        message: "Cần xác thực trước khi áp dụng hạn mức tài khoản.",
      });
    const actor =
      mode === "user"
        ? JSON.stringify([req.auth.sub])
        : mode === "ip-user"
          ? JSON.stringify([ip, req.auth.sub])
          : ip;
    const key = JSON.stringify([
      id,
      policy.limit,
      policy.windowMs,
      mode,
      actor,
    ]);
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      if (!bucket && buckets.size >= 50000)
        return res.status(429).json({
          status: 429,
          message: "Gateway đang nhận quá nhiều yêu cầu. Vui lòng thử lại sau.",
        });
      bucket = { count: 0, resetAt: now + policy.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count++;
    res.set({
      "RateLimit-Limit": String(policy.limit),
      "RateLimit-Remaining": String(Math.max(0, policy.limit - bucket.count)),
      "RateLimit-Reset": String(Math.ceil((bucket.resetAt - now) / 1000)),
    });
    if (bucket.count > policy.limit) {
      res.set("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({
        status: 429,
        message: "Vượt giới hạn tần suất. Vui lòng thử lại sau.",
      });
    }
    next();
  };
}
