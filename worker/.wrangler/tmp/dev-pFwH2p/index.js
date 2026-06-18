var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/cors.js
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};
function handleOptions() {
  return new Response(null, { status: 204, headers: CORS });
}
__name(handleOptions, "handleOptions");
function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...CORS,
      ...extraHeaders
    }
  });
}
__name(json, "json");

// src/cache.js
async function withEdgeCache(cacheTag, ttlSeconds, producer, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(`https://edge-cache.twlive/${cacheTag}`, { method: "GET" });
  const hit = await cache.match(cacheKey);
  if (hit) {
    const h = new Headers(hit.headers);
    h.set("x-cache", "HIT");
    return new Response(hit.body, { status: hit.status, headers: h });
  }
  const data = await producer();
  const res = new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=${ttlSeconds}`,
      "x-cache": "MISS",
      ...CORS
    }
  });
  const put = cache.put(cacheKey, res.clone());
  if (ctx?.waitUntil) ctx.waitUntil(put);
  else await put;
  return res;
}
__name(withEdgeCache, "withEdgeCache");

// src/data/reservoir-coords.js
var RESERVOIR_COORDS = {
  \u65B0\u5C71\u6C34\u5EAB: [25.121, 121.726],
  \u897F\u52E2\u6C34\u5EAB: [25.094, 121.731],
  \u7FE1\u7FE0\u6C34\u5EAB: [24.91, 121.58],
  \u77F3\u9580\u6C34\u5EAB: [24.811, 121.293],
  \u5BF6\u5C71\u6C34\u5EAB: [24.745, 121.06],
  \u5BF6\u5C71\u7B2C\u4E8C\u6C34\u5EAB: [24.73, 121.045],
  \u6C38\u548C\u5C71\u6C34\u5EAB: [24.621, 120.912],
  \u660E\u5FB7\u6C34\u5EAB: [24.562, 120.902],
  \u9BC9\u9B5A\u6F6D\u6C34\u5EAB: [24.32, 120.768],
  \u5FB7\u57FA\u6C34\u5EAB: [24.262, 121.18],
  \u77F3\u5CA1\u58E9: [24.255, 120.79],
  \u9727\u793E\u6C34\u5EAB: [24.02, 121.15],
  \u65E5\u6708\u6F6D\u6C34\u5EAB: [23.86, 120.915],
  \u6E56\u5C71\u6C34\u5EAB: [23.68, 120.53],
  \u96C6\u96C6\u6514\u6CB3\u5830: [23.84, 120.78],
  \u4EC1\u7FA9\u6F6D\u6C34\u5EAB: [23.52, 120.43],
  \u862D\u6F6D\u6C34\u5EAB: [23.47, 120.49],
  \u767D\u6CB3\u6C34\u5EAB: [23.33, 120.47],
  \u66FE\u6587\u6C34\u5EAB: [23.255, 120.527],
  \u70CF\u5C71\u982D\u6C34\u5EAB: [23.2, 120.38],
  \u93E1\u9762\u6C34\u5EAB: [23.15, 120.48],
  \u5357\u5316\u6C34\u5EAB: [23.043, 120.475],
  \u963F\u516C\u5E97\u6C34\u5EAB: [22.77, 120.38],
  \u9CF3\u5C71\u6C34\u5EAB: [22.5, 120.29],
  \u6F84\u6E05\u6E56\u6C34\u5EAB: [22.65, 120.36],
  \u7261\u4E39\u6C34\u5EAB: [22.22, 120.79],
  \u9F8D\u947E\u6F6D: [22, 120.73],
  \u6210\u529F\u6C34\u5EAB: [23.5, 119.58]
};

// src/sources/water.js
var REALTIME = "https://opendata.wra.gov.tw/api/v2/2be9044c-6e44-4856-aad5-dd108c2e6679?sort=_importdate%20asc&format=JSON";
var BASIC = "https://opendata.wra.gov.tw/api/v2/708a43b0-24dc-40b7-9ed2-fca6a291e7ae?sort=_importdate%20asc&format=JSON";
var WRA_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "application/json,text/plain,*/*",
  "Accept-Language": "zh-TW,zh;q=0.9",
  Referer: "https://opendata.wra.gov.tw/"
};
function stripControlChars(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) >= 32) out += text[i];
  }
  return out;
}
__name(stripControlChars, "stripControlChars");
async function fetchWraJSON(url) {
  const r = await fetch(url, { headers: WRA_HEADERS, cf: { cacheTtl: 0 } });
  if (!r.ok) throw new Error(`WRA upstream ${r.status}`);
  const text = await r.text();
  return JSON.parse(stripControlChars(text));
}
__name(fetchWraJSON, "fetchWraJSON");
var num = /* @__PURE__ */ __name((v) => {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}, "num");
async function build() {
  const [realtime, basic] = await Promise.all([fetchWraJSON(REALTIME), fetchWraJSON(BASIC)]);
  const latest = /* @__PURE__ */ new Map();
  for (const r of Array.isArray(realtime) ? realtime : []) {
    const id = String(r.reservoiridentifier ?? "");
    if (!id) continue;
    const prev = latest.get(id);
    if (!prev || String(r.observationtime ?? "") > String(prev.observationtime ?? "")) latest.set(id, r);
  }
  const items = [];
  for (const b of Array.isArray(basic) ? basic : []) {
    const id = String(b["\u6C34\u5EAB\u4EE3\u78BC"] ?? "");
    const name = b["\u6C34\u5EAB\u540D\u7A31"];
    if (!id || !name) continue;
    const capacity = num(b["\u76EE\u524D\u6709\u6548\u5BB9\u91CF"]) ?? num(b["\u8A2D\u8A08\u6709\u6548\u5BB9\u91CF"]);
    const rt = latest.get(id);
    const current = rt ? num(rt.effectivewaterstoragecapacity) : null;
    let pct = null;
    if (capacity && capacity > 0 && current != null) {
      pct = Math.max(0, Math.min(105, current / capacity * 100));
      pct = Math.round(pct * 10) / 10;
    }
    const coord = RESERVOIR_COORDS[name];
    items.push({
      id,
      name,
      group: b["\u5730\u5340\u5225"] ?? null,
      lat: coord ? coord[0] : null,
      lng: coord ? coord[1] : null,
      value: pct,
      ts: rt?.observationtime ?? null,
      meta: {
        capacity,
        current,
        waterlevel: rt ? num(rt.waterlevel) : null,
        river: b["\u6CB3\u5DDD\u540D\u7A31"] ?? null,
        agency: b["\u6A5F\u95DC\u540D\u7A31"] ?? null,
        town: b["\u9109\u93AE\u5E02\u5340\u540D\u7A31"] ?? null
      }
    });
  }
  items.sort((a, b) => {
    if (a.value == null !== (b.value == null)) return a.value == null ? 1 : -1;
    return (b.value ?? 0) - (a.value ?? 0);
  });
  return items;
}
__name(build, "build");
function handleWater(request, ctx) {
  return withEdgeCache("water", 30 * 60, build, ctx);
}
__name(handleWater, "handleWater");

// src/index.js
var ROUTES = {
  "/api/water": handleWater
};
var src_default = {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return handleOptions();
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (path === "/" || path === "/api") {
      return json({ ok: true, service: "tw-live-api", sources: Object.keys(ROUTES).map((p) => p.replace("/api/", "")) });
    }
    const handler = ROUTES[path];
    if (!handler) return json({ error: "not found", path }, 404);
    try {
      return await handler(request, ctx, env);
    } catch (err) {
      return json({ error: String(err?.message || err) }, 502);
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-OXnS4e/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-OXnS4e/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
