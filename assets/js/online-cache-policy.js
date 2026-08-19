(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MonitoringOnlineCachePolicy = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  return Object.freeze({
    AUTO_PUBLISH_LOCAL: false,
    PUSH_HYDRATE_EXTRAS: false,
    SCOPE_TABLES_WRITABLE_FROM_CACHE: false,
    reason: "SCOPE-IMPL-1A",
    serverWinsArray: function (serverItems) {
      return Array.isArray(serverItems) ? serverItems.slice() : [];
    },
    serverWinsObject: function (serverObject, localObject) {
      const server = serverObject && typeof serverObject === "object" && !Array.isArray(serverObject) ? serverObject : {};
      if (Object.keys(server).length > 0) return server;
      return localObject && typeof localObject === "object" ? localObject : {};
    }
  });
});
