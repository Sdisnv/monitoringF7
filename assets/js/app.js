/* Application métier v65 — cœur historique v47, préparation backend optionnel sans activation. */

    /* ========================================================= */
    /* TABLE DES MATIÈRES SCRIPT                                 */
    /* ========================================================= */
    /*
    1. Configuration
    2. État global
    3. Éléments DOM
    4. Utilitaires
    5. Chargement / sauvegarde
    6. Effectifs de référence
    7. Gestion formulaire exercice
    8. Domaines / listes dépendantes
    9. Calculs / statistiques
    10. Rendu écran
    11. Import / export
    12. Génération modèles annuels
    13. Events / initialisation
    */

    /* ========================================================= */
    /* 1. CONFIGURATION                                          */
    /* ========================================================= */

    const STORAGE_KEY = "monitoring_exercices_sdis_v2";
    const STORAGE_KEY_REFERENCES = "monitoring_exercices_sdis_references_v1";
    const STORAGE_KEY_IMPORTED_EVENTS = "monitoring_exercices_sdis_imported_events_v1";
    const STORAGE_KEY_OBJECTIVES = "monitoring_exercices_sdis_objectifs_v1";
    const PERSONNEL_SDIS_CSV_URL = "assets/data/PersonnelSDIS.csv";
    const PERSONNEL_SDIS_STORAGE_KEY = "monitoring_f7_personnel_sdis_csv_v1";

    const APP_VERSION = (window.MonitoringConfig && window.MonitoringConfig.version) || "v65";
    const MAX_IMPORT_JSON_BYTES = 8 * 1024 * 1024;
    const MAX_IMPORT_CSV_BYTES = 5 * 1024 * 1024;
    const ONLINE_COLLECTIONS = Object.freeze({
      records: { storageKey: STORAGE_KEY, list: "listRecords", replace: "replaceRecords", responseKey: "records", array: true },
      importedEvents: { storageKey: STORAGE_KEY_IMPORTED_EVENTS, list: "apiGet", listPath: "/imported-events", replace: "replaceImportedEvents", responseKey: "importedEvents", array: true },
      referencePeriods: { storageKey: "monitoring_exercices_sdis_reference_periods_v1", list: "apiGet", listPath: "/reference-periods", replace: "replaceReferencePeriods", responseKey: "referencePeriods", array: true },
      objectives: { storageKey: STORAGE_KEY_OBJECTIVES, list: "listObjectives", replace: "replaceObjectives", responseKey: "objectives", array: false }
    });
    const onlineWriteTimers = Object.create(null);
    let personnelSdisDirectory = [];

    function centralStorageReady() {
      const cfg = window.MonitoringBackendConfig?.current || {};
      return cfg.backendEnabled === true && cfg.storageMode === "backend" && cfg.centralStorageEnabled === true && !!window.MonitoringApiClient;
    }

    function readLocalJSON(key, fallback) {
      try {
        if (window.MonitoringStorage?.getJSON) return window.MonitoringStorage.getJSON(key, fallback);
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    }

    function writeLocalJSON(key, value) {
      try {
        if (window.MonitoringStorage?.setJSON) window.MonitoringStorage.setJSON(key, value);
        else localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    }

    function normalizePersonnelHeader(value) {
      return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
    }

    function normalizePersonnelNip(value) {
      return String(value || "").replace(/\D+/g, "").trim();
    }

    function parsePersonnelCsvLine(line, sep) {
      const out = [];
      let cur = "";
      let quoted = false;
      for (let i = 0; i < String(line).length; i++) {
        const ch = line[i];
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; continue; }
        if (ch === '"') { quoted = !quoted; continue; }
        if (ch === sep && !quoted) { out.push(cur.trim()); cur = ""; continue; }
        cur += ch;
      }
      out.push(cur.trim());
      return out;
    }

    function parsePersonnelSdisCsv(text) {
      const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
      if (lines.length < 2) return [];
      const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ";" : ",";
      const headers = parsePersonnelCsvLine(lines[0], sep).map(normalizePersonnelHeader);
      const indexOf = names => headers.findIndex(header => names.includes(header));
      const idx = {
        nip: indexOf(["nip", "eca", "identifiant", "matricule"]),
        grade: indexOf(["grade", "rang"]),
        nom: indexOf(["nom", "name"]),
        prenom: indexOf(["prenom"]),
        oi: indexOf(["oi", "organe", "organisation", "affectation"])
      };
      return lines.slice(1).map(line => {
        const values = parsePersonnelCsvLine(line, sep);
        const nip = idx.nip >= 0 ? values[idx.nip] : "";
        const grade = idx.grade >= 0 ? values[idx.grade] : "";
        const nom = idx.nom >= 0 ? values[idx.nom] : "";
        const prenom = idx.prenom >= 0 ? values[idx.prenom] : "";
        const oi = idx.oi >= 0 ? values[idx.oi] : "";
        const displayName = [grade, prenom, nom].map(v => String(v || "").trim()).filter(Boolean).join(" ") || nip;
        return { nip, grade, nom, prenom, oi, displayName };
      }).filter(person => normalizePersonnelNip(person.nip) && person.displayName);
    }

    async function loadPersonnelSdisDirectory() {
      try {
        const saved = localStorage.getItem(PERSONNEL_SDIS_STORAGE_KEY);
        if (saved) {
          personnelSdisDirectory = parsePersonnelSdisCsv(saved);
          return personnelSdisDirectory;
        }
      } catch {}
      try {
        const response = await fetch(PERSONNEL_SDIS_CSV_URL, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        personnelSdisDirectory = parsePersonnelSdisCsv(await response.text());
      } catch {
        personnelSdisDirectory = [];
      }
      return personnelSdisDirectory;
    }

    function findPersonnelSdisByNip(nip) {
      const normalized = normalizePersonnelNip(nip);
      if (!normalized) return null;
      return personnelSdisDirectory.find(person => normalizePersonnelNip(person.nip) === normalized) || null;
    }

    function normalizePersonnelName(value) {
      return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    }

    function findPersonnelSdisByDisplayName(name) {
      const normalized = normalizePersonnelName(name);
      if (!normalized) return null;
      return personnelSdisDirectory.find(person => {
        const full = normalizePersonnelName(person.displayName);
        const short = normalizePersonnelName(`${person.prenom} ${person.nom}`);
        const inverted = normalizePersonnelName(`${person.nom} ${person.prenom}`);
        return full === normalized || short === normalized || inverted === normalized || full.endsWith(` ${normalized}`);
      }) || null;
    }

    function connectedUserDisplayName() {
      const user = window.CurrentUser || window.MonitoringAuth?.user || {};
      const profile = window.MonitoringSessionManager?.getProfile?.() || {};
      return String(user.displayName || user.name || profile.displayName || profile.name || user.email || "").trim();
    }

    function mergeServerAndLocalArrays(serverItems, localItems) {
      const merged = new Map();
      (Array.isArray(serverItems) ? serverItems : []).forEach((item, index) => {
        const id = String(item?.id || item?.key || `server-${index}`);
        merged.set(id, item);
      });
      (Array.isArray(localItems) ? localItems : []).forEach((item, index) => {
        const id = String(item?.id || item?.key || `local-${index}`);
        if (!merged.has(id)) merged.set(id, item);
      });
      return Array.from(merged.values());
    }

    async function fetchOnlineCollection(name, config) {
      const api = window.MonitoringApiClient;
      if (!api) return null;
      const result = config.listPath ? await api[config.list](config.listPath) : await api[config.list]();
      if (!result?.ok || !result.data?.ok) return null;
      return result.data[config.responseKey];
    }

    async function pushOnlineCollection(name, data) {
      if (!centralStorageReady()) return null;
      const config = ONLINE_COLLECTIONS[name];
      const api = window.MonitoringApiClient;
      if (!config || !api?.[config.replace]) return null;
      try {
        const result = await api[config.replace](data);
        if (!result?.ok) window.MonitoringAuditLog?.logWarning?.("online-save-failed", "Sauvegarde serveur non confirmée.", { collection: name, status: result?.status, error: result?.data?.error || result?.error, message: result?.data?.message || result?.message || "" });
        return result;
      } catch (error) {
        window.MonitoringAuditLog?.logWarning?.("online-save-failed", "Sauvegarde serveur impossible.", { collection: name, message: String(error?.message || error) });
        return null;
      }
    }

    function scheduleOnlineCollectionWrite(name, data) {
      if (!centralStorageReady()) return;
      clearTimeout(onlineWriteTimers[name]);
      const snapshot = Array.isArray(data) ? data.map(item => ({ ...(item || {}) })) : { ...(data || {}) };
      onlineWriteTimers[name] = setTimeout(() => { pushOnlineCollection(name, snapshot); }, 350);
    }

    function hasMeaningfulLocalData(config, value) {
      if (config.array) return Array.isArray(value) && value.length > 0;
      return value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0;
    }

    async function publishLocalCacheToServer() {
      if (!centralStorageReady()) return { ok:false, reason:"central_storage_not_ready", published:[] };
      const knownServer = readLocalJSON("monitoring_f7_server_status_v1", null);
      const lastPublish = readLocalJSON("monitoring_f7_online_publish_status_v1", null);
      const serverHasData = knownServer && knownServer.collections && Object.values(knownServer.collections).some(value => Number(value || 0) > 0);
      if (serverHasData && lastPublish?.ok === true) return Object.assign({}, lastPublish, { skipped:true, reason:"server_already_seeded" });
      const status = { ok:true, published:[], failed:[], checkedAt:new Date().toISOString() };
      for (const [name, config] of Object.entries(ONLINE_COLLECTIONS)) {
        const localValue = readLocalJSON(config.storageKey, config.array ? [] : {});
        if (!hasMeaningfulLocalData(config, localValue)) continue;
        const result = await pushOnlineCollection(name, localValue);
        if (result?.ok) status.published.push(name);
        else {
          status.ok = false;
          status.failed.push({ collection:name, status:result?.status || 0, error:result?.data?.error || result?.error || "unknown" });
        }
      }
      try { localStorage.setItem("monitoring_f7_online_publish_status_v1", JSON.stringify(status)); } catch {}
      window.MonitoringAuditLog?.logInfo?.("online-cache-published", "Cache local publié vers le stockage central.", status);
      return status;
    }

    async function refreshOnlineServerStatus() {
      if (!centralStorageReady() || !window.MonitoringApiClient?.getDataStatus) return null;
      const result = await window.MonitoringApiClient.getDataStatus();
      if (result?.ok && result.data?.ok) {
        try { localStorage.setItem("monitoring_f7_server_status_v1", JSON.stringify(result.data)); } catch {}
        return result.data;
      }
      return null;
    }

    async function hydrateOnlineDataCache() {
      if (!centralStorageReady()) return { ok: false, reason: "central_storage_not_ready" };
      const status = { ok: true, hydrated: [], pushedLocal: [] };
      await Promise.all(Object.entries(ONLINE_COLLECTIONS).map(async ([name, config]) => {
        try {
          const localValue = readLocalJSON(config.storageKey, config.array ? [] : {});
          const serverValue = await fetchOnlineCollection(name, config);
          if (serverValue == null) return;
          if (config.array) {
            const merged = mergeServerAndLocalArrays(serverValue, localValue);
            writeLocalJSON(config.storageKey, merged);
            status.hydrated.push(name);
            if (merged.length > (Array.isArray(serverValue) ? serverValue.length : 0)) {
              await pushOnlineCollection(name, merged);
              status.pushedLocal.push(name);
            }
          } else {
            const serverObject = serverValue && typeof serverValue === "object" && !Array.isArray(serverValue) ? serverValue : {};
            const localObject = localValue && typeof localValue === "object" && !Array.isArray(localValue) ? localValue : {};
            const hasServer = Object.keys(serverObject).length > 0;
            const next = hasServer ? { ...localObject, ...serverObject } : localObject;
            writeLocalJSON(config.storageKey, next);
            status.hydrated.push(name);
            if (!hasServer && Object.keys(localObject).length > 0) {
              await pushOnlineCollection(name, localObject);
              status.pushedLocal.push(name);
            }
          }
        } catch (error) {
          status.ok = false;
          window.MonitoringAuditLog?.logWarning?.("online-cache-hydrate-failed", "Hydratation serveur partielle impossible.", { collection: name, message: String(error?.message || error) });
        }
      }));
      await refreshOnlineServerStatus();
      window.MonitoringAuditLog?.logInfo?.("online-cache-hydrated", "Cache local hydraté depuis le stockage central.", status);
      return status;
    }

    window.MonitoringOnlineDataService = Object.freeze({
      hydrate: hydrateOnlineDataCache,
      publishLocal: publishLocalCacheToServer,
      refreshStatus: refreshOnlineServerStatus,
      push: pushOnlineCollection,
      schedule: scheduleOnlineCollectionWrite,
      isReady: centralStorageReady
    });

    let onlineRefreshInFlight = null;

    function loadApplicationDataFromLocalCache() {
      referencePeriods = loadReferencePeriods();
      selectedReferencePeriodId = referencePeriods[0]?.id || null;
      records = loadRecords();
      importedEvents = loadImportedEvents();
      objectives = loadObjectives();
    }

    function refreshApplicationAfterOnlineHydration(result) {
      if (!result?.hydrated?.length) return;
      loadApplicationDataFromLocalCache();
      ensureAtLeastOneReferencePeriod();
      initializeReferenceData();
      applyObjectivesToForm();
      renderImportedEventOptions();
      renderTemplateSuggestions();
      renderMonitoring();
    }

    function startOnlineRefreshAfterInitialRender() {
      if (!centralStorageReady()) return Promise.resolve(null);
      if (onlineRefreshInFlight) return onlineRefreshInFlight;
      onlineRefreshInFlight = (async () => {
        await publishLocalCacheToServer();
        const result = await hydrateOnlineDataCache();
        refreshApplicationAfterOnlineHydration(result);
        return result;
      })().catch(error => {
        window.MonitoringAuditLog?.logWarning?.("online-refresh-background-failed", "Rafraîchissement serveur en arrière-plan impossible.", { message: String(error?.message || error) });
        return null;
      }).finally(() => { onlineRefreshInFlight = null; });
      return onlineRefreshInFlight;
    }

    document.addEventListener("monitoring-f7-auth-session-changed", async () => {
      try {
        if (sessionStorage.getItem("monitoring_f7_online_hydrated_v1") === "1") return;
        sessionStorage.setItem("monitoring_f7_online_hydrated_v1", "1");
      } catch {}
      if (window.__monitoringF7AppReady) startOnlineRefreshAfterInitialRender();
    });

    function safeText(value) {
      return window.MonitoringDomUtils?.safeText
        ? window.MonitoringDomUtils.safeText(value)
        : (window.MonitoringSecurity?.safeText ? window.MonitoringSecurity.safeText(value) : String(value ?? ""));
    }

    function setElementText(el, value, className = "") {
      if (window.MonitoringRenderKpis?.setKpiText) {
        window.MonitoringRenderKpis.setKpiText(el, value, className);
        return;
      }
      if (!el) return;
      el.textContent = safeText(value);
      if (className) el.className = className;
    }

    function validateImportFile(file, allowedExtensions, maxBytes) {
      if (window.MonitoringDataImport?.validateImportFile) {
        return window.MonitoringDataImport.validateImportFile(file, allowedExtensions, maxBytes);
      }
      if (!file) throw new Error("Aucun fichier sélectionné.");
      const name = String(file.name || "").toLowerCase();
      if (allowedExtensions && !allowedExtensions.some(ext => name.endsWith(ext))) {
        throw new Error(`Type de fichier refusé. Formats autorisés : ${allowedExtensions.join(", ")}.`);
      }
      if (file.size <= 0) throw new Error("Fichier vide.");
      if (file.size > maxBytes) throw new Error(`Fichier trop volumineux. Limite : ${Math.round(maxBytes / 1024 / 1024)} Mo.`);
    }

    function validateMonitoringImportPayload(parsed) {
      if (window.MonitoringDataImport?.validateMonitoringImportPayload) {
        return window.MonitoringDataImport.validateMonitoringImportPayload(parsed);
      }
      const allowedTopLevelKeys = new Set(["type","app","application","version","exportedAt","records","importedEvents","referencePeriods","selectedReferencePeriodId","references","objectives","schemaVersion","storageSchemaVersion","appVersion","sourceVersion","migrationHistory","storageDiagnostics"]);
      if (Array.isArray(parsed)) {
        if (parsed.length > 20000) throw new Error("Import refusé : nombre d’exercices anormalement élevé.");
        return { format: "legacy-array", records: parsed.length };
      }
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Le JSON doit contenir un objet ou un tableau d’exercices.");
      }
      if (parsed.type && !String(parsed.type).toLowerCase().includes("monitoring")) {
        throw new Error("Type de sauvegarde JSON non reconnu pour Monitoring F7.");
      }
      const unexpected = Object.keys(parsed).filter(key => !allowedTopLevelKeys.has(key));
      const criticalUnexpected = unexpected.filter(key => /script|html|token|password|credential|auth/i.test(key));
      if (criticalUnexpected.length) {
        throw new Error("Import refusé : champ critique inattendu détecté (" + criticalUnexpected.join(", ") + ").");
      }
      if (unexpected.length) {
        console.warn("Monitoring F7 : champs JSON non reconnus ignorés", unexpected);
      }
      const hasKnownData = Array.isArray(parsed.records) || Array.isArray(parsed.importedEvents) || Array.isArray(parsed.referencePeriods) || parsed.references || parsed.objectives;
      if (!hasKnownData) {
        throw new Error("Structure JSON non reconnue : records/importedEvents/referencePeriods absents.");
      }
      if (parsed.version && !/^v?\d+/i.test(String(parsed.version))) {
        throw new Error("Version JSON illisible.");
      }
      if (parsed.version && parseInt(String(parsed.version).replace(/\D/g, "") || "0", 10) > 999) {
        throw new Error("Version JSON anormale.");
      }
      if (Array.isArray(parsed.records) && parsed.records.length > 20000) {
        throw new Error("Import refusé : nombre d’exercices anormalement élevé.");
      }
      if (Array.isArray(parsed.importedEvents) && parsed.importedEvents.length > 50000) {
        throw new Error("Import refusé : nombre d’événements importés anormalement élevé.");
      }
      return { format: "object" };
    }

    function validateCsvTextForAnnualImport(csvText) {
      const text = String(csvText || "").replace(/^\uFEFF/, "");
      if (text.length > MAX_IMPORT_CSV_BYTES) throw new Error("CSV trop volumineux pour un import client-only.");
      if (/\u0000/.test(text)) throw new Error("Encodage CSV illisible ou binaire détecté.");
      if (!text.trim()) throw new Error("CSV vide.");
      const firstLine = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").find(line => line.trim());
      if (!firstLine) throw new Error("CSV sans en-tête lisible.");
      const semicolons = (firstLine.match(/;/g) || []).length;
      const commas = (firstLine.match(/,/g) || []).length;
      if (semicolons === 0 && commas === 0) throw new Error("Séparateur CSV non détecté. Utiliser ; ou , avec une ligne d’en-tête.");
      if (semicolons === 0 && commas > 0) {
        console.warn("Monitoring F7 : séparateur virgule accepté par compatibilité. Le séparateur métier recommandé reste ;.");
      }
      if (commas > semicolons) {
        console.warn("Monitoring F7 : CSV avec séparateur virgule détecté. Compatible, mais le séparateur ; reste recommandé.");
      }
      return text;
    }

    const DEFAULT_OBJECTIVES = {
      objDpsG1: 75, objDpsC1: 75, objDpsB1: 75, objDpsB2: 75,
      objDapY1: 75, objDapY2: 75, objDapY3: 75, objDapY4: 75,
      objFOBA: 80, objPR: 80, objAUTO: 80, objJSP: 85,
      objJspSanction: 60, objJspCost: 1500, objJspCotisation: 150,
      objCoverageGlobal: 85
    };

    const DOMAIN_ORDER = ["DPS", "DAP", "FOBA", "PR", "AUTO", "JSP"];
    const COMMAND_DOMAIN_ORDER = ["FOBA", "PR", "DPS", "DAP", "AUTO", "JSP"];
    const OI_ORDER = ["DPS G1", "DPS C1", "DPS B1", "DPS B2", "DAP Y1", "DAP Y2", "DAP Y3", "DAP Y4"];
    const SUB_STRUCTURE_ORDER = ["DPS", "DPS G1", "DPS C1", "DPS B1", "DPS B2", "DAP", "DAP Y1", "DAP Y2", "DAP Y3", "DAP Y4", "FOBA 1", "FOBA 2", "FOBA 3", "PAPR", "Cond PL", "Cond VL DPS", "JSP", "Cadets", "JSP G1", "JSP C1", "JSP B1"];
    const DOMAIN_COLOR_MAP = { FOBA: "#de000a", DPS: "#171c8f", PR: "#ffa300", PAPR: "#ffa300", AUTO: "#54585a", DAP: "#e5333b", JSP: "#4549a5" };

    const DOMAIN_CONFIG = {
      DPS: {
        subs: ["G1", "C1", "B1", "B2"],
        globalLabel: "DPS global",
        templates: [
          "Exercice DPS 1",
          "Exercice DPS 2",
          "Exercice DPS 3",
          "Formation groupée DPS 1.1",
          "Formation groupée DPS 1.2",
          "Formation groupée DPS 1.3",
          "Formation groupée DPS 1.4",
          "Formation groupée DPS 1.5",
          "Formation groupée DPS 1.6"
        ]
      },
      DAP: {
        subs: ["Y1", "Y2", "Y3", "Y4"],
        globalLabel: "DAP global",
        templates: [
          "Exercice DAP 1",
          "Exercice DAP 2",
          "Exercice DAP 3",
          "Exercice DAP 4",
          "Formation groupée DAP 1.1",
          "Formation groupée DAP 1.2"
        ]
      },
      PR: {
        subs: ["PR global"],
        subsLabels: {"PR global": "PAPR"},
        globalLabel: "PAPR",
        templates: (() => {
          const out = [];
          for (let s = 1; s <= 4; s++) {
            for (let i = 1; i <= 6; i++) {
              out.push(`Exercice PR ${s}.${i}`);
            }
          }
          return out;
        })()
      },
      JSP: {
        subs: ["JSP", "JSP G1", "JSP C1", "JSP B1", "Cadets"],
        globalLabel: "JSP",
        templates: [
          "Exercice JSP 1",
          "Exercice JSP 2",
          "Exercice JSP 3",
          "Exercice JSP 4",
          "Exercice JSP 5",
          "Exercice JSP 6",
          "Exercice JSP 7",
          "Exercice JSP 8",
          "Exercice JSP 9",
          "Exercice JSP 10",
          "Formation groupée JSP"
        ]
      },
      FOBA: {
        subs: ["FOBA 1", "FOBA 2", "FOBA 3"],
        globalLabel: "FOBA global",
        templates: (() => {
          const out = [];
          for (let i = 1; i <= 10; i++) {
            out.push(`Exercice FOBA ${i}`);
          }
          return out;
        })()
      },
      AUTO: {
        subs: ["Cond VL", "Cond PL"],
        subsLabels: {
          "Cond VL": "Cond VL DPS",
          "Cond PL": "Cond PL"
        },
        globalLabel: "AUTO global",
        templates: [
          "Exercice Car 1.1",
          "Exercice Car 1.2",
          "Exercice Car 1.3",
          "Exercice Car 1.4",
          "Exercice Car 1.5",
          "Exercice Truck 1.1",
          "Exercice Truck 1.2",
          "Exercice Truck 1.3",
          "Exercice Truck 1.4"
        ]
      }
    };

    const DEFAULT_REFERENCE_DATA = {
      effectifFoba1: 0,
      effectifFoba2: 0,
      effectifFoba3: 0,

      effectifPrGlobal: 0,
      effectifPrG1: 0,
      effectifPrC1: 0,
      effectifPrB1: 0,
      effectifPrB2: 0,
      effectifAutoVl: 0,
      effectifAutoPl: 0,

      effectifDpsG1: 0,
      effectifDpsC1: 0,
      effectifDpsB1: 0,
      effectifDpsB2: 0,

      effectifDapY1: 0,
      effectifDapY2: 0,
      effectifDapY3: 0,
      effectifDapY4: 0,

      effectifJspG1: 0,
      effectifJspC1: 0,
      effectifJspB1: 0,
      effectifJspCadets: 0,

      effectifUpdatedAt: "",
      effectifUpdatedBy: "",
      effectifCommentaire: ""
    };

/* ========================================================= */
/* PHASE 1 — GESTION DES EFFECTIFS PAR PÉRIODE               */
/* ========================================================= */

const REFERENCE_PERIODS_STORAGE_KEY = "monitoring_exercices_sdis_reference_periods_v1";

const DEFAULT_REFERENCE_PERIOD = {
  id: "",
  dateEffective: "",

  foba: {
    foba1: 0,
    foba2: 0,
    foba3: 0
  },

  domaines: {
    pr: 0,
    autoVl: 0,
    autoPl: 0
  },

  organes: {
    dpsG1: 0,
    dpsC1: 0,
    dpsB1: 0,
    dpsB2: 0,
    dapY1: 0,
    dapY2: 0,
    dapY3: 0,
    dapY4: 0,
    jspG1: 0,
    jspC1: 0,
    jspB1: 0,
    jspCadets: 0
  },

  suivi: {
    updatedByNip: "",
    updatedBy: "",
    generatedByNip: "",
    generatedBy: "",
    updateScope: "all",
    updateDomains: ["foba", "pr", "auto", "dps", "dap", "jsp"],
    commentaire: ""
  }
};

function createEmptyReferencePeriod() {
  return {
    id: uid(),
    dateEffective: "",

    foba: {
      foba1: 0,
      foba2: 0,
      foba3: 0
    },

    domaines: {
      pr: 0,
      prG1: 0,
      prC1: 0,
      prB1: 0,
      prB2: 0,
      autoVl: 0,
      autoPl: 0
    },

    organes: {
      dpsG1: 0,
      dpsC1: 0,
      dpsB1: 0,
      dpsB2: 0,
      dapY1: 0,
      dapY2: 0,
      dapY3: 0,
      dapY4: 0,
      jspG1: 0,
      jspC1: 0,
      jspB1: 0,
      jspCadets: 0
    },

    suivi: {
      updatedByNip: "",
      updatedBy: "",
      generatedByNip: "",
      generatedBy: "",
      updateScope: "all",
      updateDomains: ["foba", "pr", "auto", "dps", "dap", "jsp"],
      commentaire: ""
    }
  };
}

function normalizeReferencePeriod(raw) {
  const safe = raw && typeof raw === "object" ? raw : {};

  return {
    id: String(safe.id || uid()),
    dateEffective: String(safe.dateEffective || ""),

    foba: {
      foba1: toInt(safe.foba?.foba1),
      foba2: toInt(safe.foba?.foba2),
      foba3: toInt(safe.foba?.foba3)
    },

    domaines: {
      pr: toInt(safe.domaines?.pr),
      prG1: toInt(safe.domaines?.prG1),
      prC1: toInt(safe.domaines?.prC1),
      prB1: toInt(safe.domaines?.prB1),
      prB2: toInt(safe.domaines?.prB2),
      autoVl: toInt(safe.domaines?.autoVl),
      autoPl: toInt(safe.domaines?.autoPl)
    },

    organes: {
      dpsG1: toInt(safe.organes?.dpsG1),
      dpsC1: toInt(safe.organes?.dpsC1),
      dpsB1: toInt(safe.organes?.dpsB1),
      dpsB2: toInt(safe.organes?.dpsB2),
      dapY1: toInt(safe.organes?.dapY1),
      dapY2: toInt(safe.organes?.dapY2),
      dapY3: toInt(safe.organes?.dapY3),
      dapY4: toInt(safe.organes?.dapY4),
      jspG1: toInt(safe.organes?.jspG1),
      jspC1: toInt(safe.organes?.jspC1),
      jspB1: toInt(safe.organes?.jspB1),
      jspCadets: toInt(safe.organes?.jspCadets)
    },

    suivi: {
      updatedByNip: String(safe.suivi?.updatedByNip || "").trim(),
      updatedBy: String(safe.suivi?.updatedBy || "").trim(),
      generatedByNip: String(safe.suivi?.generatedByNip || "").trim(),
      generatedBy: String(safe.suivi?.generatedBy || "").trim(),
      updateScope: safe.suivi?.updateScope === "domains" ? "domains" : "all",
      updateDomains: Array.isArray(safe.suivi?.updateDomains) && safe.suivi.updateDomains.length ? safe.suivi.updateDomains.map(String) : ["foba", "pr", "auto", "dps", "dap", "jsp"],
      commentaire: String(safe.suivi?.commentaire || "").trim()
    }
  };
}

function sortReferencePeriods(periods) {
  return [...periods].sort((a, b) => {
    const da = a.dateEffective || "";
    const db = b.dateEffective || "";

    if (da && db) {
      return db.localeCompare(da);
    }

    if (da) return -1;
    if (db) return 1;

    return String(b.id || "").localeCompare(String(a.id || ""));
  });
}

function loadReferencePeriods() {
  try {
    const raw = window.MonitoringStorage?.getJSON ? JSON.stringify(window.MonitoringStorage.getJSON(REFERENCE_PERIODS_STORAGE_KEY, [])) : localStorage.getItem(REFERENCE_PERIODS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortReferencePeriods(parsed.map(normalizeReferencePeriod));
  } catch {
    return [];
  }
}

function saveReferencePeriods(periods) {
  const normalized = sortReferencePeriods(
    (Array.isArray(periods) ? periods : []).map(normalizeReferencePeriod)
  );

  if (window.MonitoringStorage?.setJSON) window.MonitoringStorage.setJSON(REFERENCE_PERIODS_STORAGE_KEY, normalized);
  else localStorage.setItem(REFERENCE_PERIODS_STORAGE_KEY, JSON.stringify(normalized));
  scheduleOnlineCollectionWrite("referencePeriods", normalized);

  return normalized;
}

let referencePeriods = [];
let selectedReferencePeriodId = null;

function getReferencePeriodById(periodId) {
  if (!periodId) return null;
  return referencePeriods.find(period => period.id === periodId) || null;
}

function getSelectedReferencePeriod() {
  return getReferencePeriodById(selectedReferencePeriodId);
}

function setSelectedReferencePeriod(periodId) {
  const found = getReferencePeriodById(periodId);

  if (!found) {
    selectedReferencePeriodId = referencePeriods[0]?.id || null;
    return null;
  }

  selectedReferencePeriodId = found.id;
  return found;
}

function createReferencePeriod(initialData = {}) {
  const base = createEmptyReferencePeriod();

  const merged = normalizeReferencePeriod({
    ...base,
    ...initialData,
    foba: {
      ...base.foba,
      ...(initialData.foba || {})
    },
    domaines: {
      ...base.domaines,
      ...(initialData.domaines || {})
    },
    organes: {
      ...base.organes,
      ...(initialData.organes || {})
    },
    suivi: {
      ...base.suivi,
      ...(initialData.suivi || {})
    }
  });

  referencePeriods.push(merged);
  referencePeriods = saveReferencePeriods(referencePeriods);
  selectedReferencePeriodId = merged.id;

  return merged;
}

function duplicateReferencePeriod(sourceId, overrides = {}) {
  const source = getReferencePeriodById(sourceId);

  if (!source) {
    return null;
  }

  const duplicate = normalizeReferencePeriod({
    ...source,
    id: uid(),
    dateEffective: overrides.dateEffective || "",
    foba: {
      ...source.foba,
      ...(overrides.foba || {})
    },
    domaines: {
      ...source.domaines,
      ...(overrides.domaines || {})
    },
    organes: {
      ...source.organes,
      ...(overrides.organes || {})
    },
    suivi: {
      ...source.suivi,
      ...(overrides.suivi || {})
    }
  });

  referencePeriods.push(duplicate);
  referencePeriods = saveReferencePeriods(referencePeriods);
  selectedReferencePeriodId = duplicate.id;

  return duplicate;
}

function updateReferencePeriod(periodId, patch = {}) {
  const index = referencePeriods.findIndex(period => period.id === periodId);

  if (index < 0) {
    return null;
  }

  const current = referencePeriods[index];

  const updated = normalizeReferencePeriod({
    ...current,
    ...patch,
    foba: {
      ...current.foba,
      ...(patch.foba || {})
    },
    domaines: {
      ...current.domaines,
      ...(patch.domaines || {})
    },
    organes: {
      ...current.organes,
      ...(patch.organes || {})
    },
    suivi: {
      ...current.suivi,
      ...(patch.suivi || {})
    }
  });

  referencePeriods[index] = updated;
  referencePeriods = saveReferencePeriods(referencePeriods);

  if (selectedReferencePeriodId === updated.id) {
    selectedReferencePeriodId = updated.id;
  }

  return updated;
}

function deleteReferencePeriod(periodId) {
  const beforeCount = referencePeriods.length;

  referencePeriods = referencePeriods.filter(period => period.id !== periodId);
  referencePeriods = saveReferencePeriods(referencePeriods);

  if (referencePeriods.length === beforeCount) {
    return false;
  }

  if (selectedReferencePeriodId === periodId) {
    selectedReferencePeriodId = referencePeriods[0]?.id || null;
  }

  return true;
}

function ensureAtLeastOneReferencePeriod() {
  if (referencePeriods.length > 0) {
    if (!selectedReferencePeriodId) {
      selectedReferencePeriodId = referencePeriods[0].id;
    }
    return referencePeriods[0];
  }

  const created = createReferencePeriod({
    dateEffective: new Date().toISOString().slice(0, 10),
    suivi: {
      commentaire: "État initial"
    }
  });

  return created;
}


function getReferencePeriodGlobals(period) {
  if (!period) {
    return {
      fobaGlobal: 0,
      autoGlobal: 0,
      dpsGlobal: 0,
      dapGlobal: 0,
      jspGlobal: 0
    };
  }

  return {
    fobaGlobal:
      toInt(period.foba?.foba1) +
      toInt(period.foba?.foba2) +
      toInt(period.foba?.foba3),

    autoGlobal:
      toInt(period.domaines?.autoVl) +
      toInt(period.domaines?.autoPl),

    dpsGlobal:
      toInt(period.organes?.dpsG1) +
      toInt(period.organes?.dpsC1) +
      toInt(period.organes?.dpsB1) +
      toInt(period.organes?.dpsB2),

    dapGlobal:
      toInt(period.organes?.dapY1) +
      toInt(period.organes?.dapY2) +
      toInt(period.organes?.dapY3) +
      toInt(period.organes?.dapY4),

    jspGlobal:
      toInt(period.organes?.jspG1) +
      toInt(period.organes?.jspC1) +
      toInt(period.organes?.jspB1)
  };
}

    /* ========================================================= */
    /* 2. ÉTAT GLOBAL                                            */
    /* ========================================================= */

    let records = [];
    let importedEvents = [];
    let objectives = { ...DEFAULT_OBJECTIVES };
    let editingId = null;
    let selectedImportedEventId = null;
    let recordsSortState = { key: "dateExercice", direction: "asc" };
    let selectedRowKeys = new Set();

    /* ========================================================= */
    /* 3. ÉLÉMENTS DOM                                           */
    /* ========================================================= */

    const els = {
      eventSelect: document.getElementById("eventSelect"),
      newManualEventBtn: document.getElementById("newManualEventBtn"),
      importedEventInfo: document.getElementById("importedEventInfo"),
      domain: document.getElementById("domain"),
      subStructure: document.getElementById("subStructure"),
      template: document.getElementById("template"),
      templateSuggestions: document.getElementById("templateSuggestions"),
      dateExercice: document.getElementById("dateExercice"),
      statCom: document.getElementById("statCom"),
      eventStatus: document.getElementById("eventStatus"),
      nbConvoques: document.getElementById("nbConvoques"),
      nbPresents: document.getElementById("nbPresents"),
      nbMaladie: document.getElementById("nbMaladie"),
      nbAccident: document.getElementById("nbAccident"),
      nbArmee: document.getElementById("nbArmee"),
      nbProfessionnel: document.getElementById("nbProfessionnel"),
      nbPrive: document.getElementById("nbPrive"),
      nbAbsents: document.getElementById("nbAbsents"),
      aComptabiliser: document.getElementById("aComptabiliser"),
      remarque: document.getElementById("remarque"),
      detailTotal: document.getElementById("detailTotal"),
      totalExcuses: document.getElementById("totalExcuses"),
      targetVisibilityCard: document.getElementById("targetVisibilityCard"),
      targetBruteValue: document.getElementById("targetBruteValue"),
      targetFormateursValue: document.getElementById("targetFormateursValue"),
      targetNetteValue: document.getElementById("targetNetteValue"),
      targetVisibilityFoot: document.getElementById("targetVisibilityFoot"),
      validationMessage: document.getElementById("validationMessage"),
      filterDomain: document.getElementById("filterDomain"),
      filterSub: document.getElementById("filterSub"),
      filterCompta: document.getElementById("filterCompta"),

      saveBtn: document.getElementById("saveBtn"),
      resetBtn: document.getElementById("resetBtn"),
      duplicateBtn: document.getElementById("duplicateBtn"),
      referencePeriodSelect: document.getElementById("referencePeriodSelect"),
      saveReferencePeriodBtn: document.getElementById("saveReferencePeriodBtn"),
      createReferencePeriodBtn: document.getElementById("createReferencePeriodBtn"),
      duplicateReferencePeriodBtn: document.getElementById("duplicateReferencePeriodBtn"),
      applyFiltersBtn: document.getElementById("applyFiltersBtn"),
      clearFiltersBtn: document.getElementById("clearFiltersBtn"),
      exportJsonBtn: document.getElementById("exportJsonBtn"),
      exportCsvBtn: document.getElementById("exportCsvBtn"),
      importJsonBtn: document.getElementById("importJsonBtn"),
      importEventsBtn: document.getElementById("importEventsBtn"),
      jsonFileInput: document.getElementById("jsonFileInput"),
      eventsFileInput: document.getElementById("eventsFileInput"),
      importStatus: document.getElementById("importStatus"),
      seedBtn: document.getElementById("seedBtn"),
      clearDataBtn: document.getElementById("clearDataBtn"),
      deleteFilteredEventsBtn: document.getElementById("deleteFilteredEventsBtn"),
      selectAllVisibleBtn: document.getElementById("selectAllVisibleBtn"),
      clearSelectionBtn: document.getElementById("clearSelectionBtn"),
      exportSelectedCsvBtn: document.getElementById("exportSelectedCsvBtn"),
      deleteSelectedBtn: document.getElementById("deleteSelectedBtn"),
      markSelectedDoneBtn: document.getElementById("markSelectedDoneBtn"),
      exportPdfBtn: document.getElementById("exportPdfBtn"),
      recordsSearch: document.getElementById("recordsSearch"),
      selectAllRecordsCheckbox: document.getElementById("selectAllRecordsCheckbox"),

      kpiExercices: document.getElementById("kpiExercices"),
      kpiNonComptabilises: document.getElementById("kpiNonComptabilises"),
      kpiConvoques: document.getElementById("kpiConvoques"),
      kpiPresents: document.getElementById("kpiPresents"),
      kpiTaux: document.getElementById("kpiTaux"),
      kpiTauxAjuste: document.getElementById("kpiTauxAjuste"),
      kpiExcuses: document.getElementById("kpiExcuses"),
      kpiAbsents: document.getElementById("kpiAbsents"),
      kpiBusinessAlerts: document.getElementById("kpiBusinessAlerts"),
      commandDomainTableBody: document.getElementById("commandDomainTableBody"),
      commandPresenceChart: document.getElementById("commandPresenceChart"),

      dapPermutationBlock: document.getElementById("dapPermutationBlock"),

      nbPermutation: document.getElementById("nbPermutation"),

      nbExtDapY1: document.getElementById("nbExtDapY1"),
      nbExtDapY2: document.getElementById("nbExtDapY2"),
      nbExtDapY3: document.getElementById("nbExtDapY3"),
      nbExtDapY4: document.getElementById("nbExtDapY4"),
      nbExtDapTotal: document.getElementById("nbExtDapTotal"),

      domainTableBody: document.querySelector("#domainTable tbody"),
      subTableBody: document.querySelector("#subTable tbody"),
      coverageDomainTableBody: document.querySelector("#coverageDomainTable tbody"),
      recordsTableBody: document.querySelector("#recordsTable tbody"),
      recordCount: document.getElementById("recordCount"),

      effectifFobaGlobal: document.getElementById("effectifFobaGlobal"),
      effectifFoba1: document.getElementById("effectifFoba1"),
      effectifFoba2: document.getElementById("effectifFoba2"),
      effectifFoba3: document.getElementById("effectifFoba3"),

      effectifPrGlobal: document.getElementById("effectifPrGlobal"),
      effectifPrG1: document.getElementById("effectifPrG1"),
      effectifPrC1: document.getElementById("effectifPrC1"),
      effectifPrB1: document.getElementById("effectifPrB1"),
      effectifPrB2: document.getElementById("effectifPrB2"),
      effectifAutoVl: document.getElementById("effectifAutoVl"),
      effectifAutoPl: document.getElementById("effectifAutoPl"),
      effectifAutoGlobal: document.getElementById("effectifAutoGlobal"),

      effectifDpsGlobal: document.getElementById("effectifDpsGlobal"),
      effectifDpsG1: document.getElementById("effectifDpsG1"),
      effectifDpsC1: document.getElementById("effectifDpsC1"),
      effectifDpsB1: document.getElementById("effectifDpsB1"),
      effectifDpsB2: document.getElementById("effectifDpsB2"),

      effectifDapGlobal: document.getElementById("effectifDapGlobal"),
      effectifDapY1: document.getElementById("effectifDapY1"),
      effectifDapY2: document.getElementById("effectifDapY2"),
      effectifDapY3: document.getElementById("effectifDapY3"),
      effectifDapY4: document.getElementById("effectifDapY4"),
      dapBusinessTableBody: document.querySelector("#dapBusinessTable tbody"),

      effectifJspGlobal: document.getElementById("effectifJspGlobal"),
      effectifJspG1: document.getElementById("effectifJspG1"),
      effectifJspC1: document.getElementById("effectifJspC1"),
      effectifJspB1: document.getElementById("effectifJspB1"),
      effectifJspCadets: document.getElementById("effectifJspCadets"),

      effectifUpdatedAt: document.getElementById("effectifUpdatedAt"),
      effectifUpdatedByNip: document.getElementById("effectifUpdatedByNip"),
      effectifUpdatedBy: document.getElementById("effectifUpdatedBy"),
      effectifGeneratedBy: document.getElementById("effectifGeneratedBy"),
      effectifUpdateScope: document.getElementById("effectifUpdateScope"),
      effectifUpdateDomains: document.getElementById("effectifUpdateDomains"),
      effectifCommentaire: document.getElementById("effectifCommentaire"),

      groupExerciseBlock: document.getElementById("groupExerciseBlock"),
      groupExerciseTableBody: document.getElementById("groupExerciseTableBody"),
      groupGlobalConvoques: document.getElementById("groupGlobalConvoques"),
      groupGlobalPresents: document.getElementById("groupGlobalPresents"),
      groupGlobalRate: document.getElementById("groupGlobalRate"),

      mutualRolesBlock: document.getElementById("mutualRolesBlock"),
      mutualRolesStatus: document.getElementById("mutualRolesStatus"),
      mutualRolesSeriesBadge: document.getElementById("mutualRolesSeriesBadge"),
      mutualRolesVisualFormateurs: document.getElementById("mutualRolesVisualFormateurs"),
      mutualRolesVisualSurveillants: document.getElementById("mutualRolesVisualSurveillants"),
      mutualRolesVisualAuxiliaires: document.getElementById("mutualRolesVisualAuxiliaires"),
      mutualRoleRowFormateurs: document.getElementById("mutualRoleRowFormateurs"),
      mutualRoleRowSurveillants: document.getElementById("mutualRoleRowSurveillants"),
      mutualRoleRowAuxiliaires: document.getElementById("mutualRoleRowAuxiliaires"),
      roleFormateursCount: document.getElementById("roleFormateursCount"),
      roleFormateursCompta: document.getElementById("roleFormateursCompta"),
      roleFormateursMutualise: document.getElementById("roleFormateursMutualise"),
      roleSurveillantsCount: document.getElementById("roleSurveillantsCount"),
      roleSurveillantsCompta: document.getElementById("roleSurveillantsCompta"),
      roleSurveillantsMutualise: document.getElementById("roleSurveillantsMutualise"),
      roleAuxiliairesCount: document.getElementById("roleAuxiliairesCount"),
      roleAuxiliairesCompta: document.getElementById("roleAuxiliairesCompta"),
      roleAuxiliairesMutualise: document.getElementById("roleAuxiliairesMutualise"),
      targetExclusionsBlock: document.getElementById("targetExclusionsBlock"),
      targetExclusionRowDispenses: document.getElementById("targetExclusionRowDispenses"),
      roleDispensesCount: document.getElementById("roleDispensesCount"),
      roleDispensesDeduct: document.getElementById("roleDispensesDeduct"),
      roleDispensesMutualise: document.getElementById("roleDispensesMutualise"),

      organeRateTableBody: document.querySelector("#organeRateTable tbody"),

      previewModal: document.getElementById("previewModal"),
      previewBody: document.getElementById("previewBody"),
      closePreviewBtn: document.getElementById("closePreviewBtn"),

      referenceSaveStatus: document.getElementById("referenceSaveStatus"),
      annualChart: document.getElementById("annualChart"),
      domainPieChart: document.getElementById("domainPieChart"),
      oiChart: document.getElementById("oiChart"),
      semesterChart: document.getElementById("semesterChart"),
      presenceYearChart: document.getElementById("presenceYearChart"),
      absenceYearChart: document.getElementById("absenceYearChart"),
      excusesDomainChart: document.getElementById("excusesDomainChart"),
      presenceDomainChart: document.getElementById("presenceDomainChart"),
      adjustedRateDomainChart: document.getElementById("adjustedRateDomainChart"),
      topAbsenceChart: document.getElementById("topAbsenceChart"),
      absenceDomainChart: document.getElementById("absenceDomainChart"),
      graphYearFilter: document.getElementById("graphYearFilter"),
      graphDomainFilters: document.getElementById("graphDomainFilters"),
      deleteReferencePeriodBtn: document.getElementById("deleteReferencePeriodBtn"),
      overdueTableBody: document.querySelector("#overdueTable tbody"),
      overdueCount: document.getElementById("overdueCount"),
      kpiCoverageCommand: document.getElementById("kpiCoverageCommand"),
      kpiObjectiveCompliance: document.getElementById("kpiObjectiveCompliance"),
      kpiAbsenceDiscipline: document.getElementById("kpiAbsenceDiscipline"),
      kpiJspCostEstimate: document.getElementById("kpiJspCostEstimate"),
      objectiveTableBody: document.getElementById("objectiveTableBody"),
      commandHeatmapBody: document.getElementById("commandHeatmapBody"),
      objectiveGapChart: document.getElementById("objectiveGapChart"),
      objectiveComplianceChart: document.getElementById("objectiveComplianceChart"),
      jspCostChart: document.getElementById("jspCostChart"),
      commandGapChart: document.getElementById("commandGapChart"),
      objDpsG1: document.getElementById("objDpsG1"),
      objDpsC1: document.getElementById("objDpsC1"),
      objDpsB1: document.getElementById("objDpsB1"),
      objDpsB2: document.getElementById("objDpsB2"),
      objDapY1: document.getElementById("objDapY1"),
      objDapY2: document.getElementById("objDapY2"),
      objDapY3: document.getElementById("objDapY3"),
      objDapY4: document.getElementById("objDapY4"),
      objFOBA: document.getElementById("objFOBA"),
      objPR: document.getElementById("objPR"),
      objAUTO: document.getElementById("objAUTO"),
      objJSP: document.getElementById("objJSP"),
      objJspSanction: document.getElementById("objJspSanction"),
      objJspCost: document.getElementById("objJspCost"),
      objJspCotisation: document.getElementById("objJspCotisation"),
      objCoverageGlobal: document.getElementById("objCoverageGlobal"),
      printArea: document.getElementById("printArea")
    };

    /* ========================================================= */
    /* 4. UTILITAIRES                                            */
    /* ========================================================= */

    window.addEventListener("error", event => {
      console.error("Erreur JS détectée :", event?.message, event?.filename, event?.lineno, event?.error);
    });

    window.addEventListener("unhandledrejection", event => {
      console.error("Promesse rejetée non gérée :", event?.reason);
    });

    function uid() {
      return crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(16).slice(2);
    }

    function toInt(v) {
      return window.MonitoringNumberUtils?.toInt ? window.MonitoringNumberUtils.toInt(v) : Math.max(0, parseInt(v || "0", 10) || 0);
    }

    function getSafeReferencePeriods() {
      if (typeof referencePeriods === "undefined") return [];
      if (!Array.isArray(referencePeriods)) return [];
      return referencePeriods;
    }

    function getSafeSelectedReferencePeriod() {
      if (typeof getSelectedReferencePeriod === "function") {
        try {
          return getSelectedReferencePeriod();
        } catch {
          return null;
        }
      }
      return null;
    }

    function currentYear() {
      return window.MonitoringDateUtils?.currentYear ? window.MonitoringDateUtils.currentYear() : new Date().getFullYear();
    }

    function quarterOf(d) {
      return window.MonitoringDateUtils?.quarterOf ? window.MonitoringDateUtils.quarterOf(d) : (new Date(d).getMonth() + 1 <= 3 ? 1 : new Date(d).getMonth() + 1 <= 6 ? 2 : new Date(d).getMonth() + 1 <= 9 ? 3 : 4);
    }

    function semesterOf(d) {
      return window.MonitoringDateUtils?.semesterOf ? window.MonitoringDateUtils.semesterOf(d) : (new Date(d).getMonth() + 1 <= 6 ? 1 : 2);
    }

    function yearOf(d) {
      return window.MonitoringDateUtils?.yearOf ? window.MonitoringDateUtils.yearOf(d) : new Date(d).getFullYear();
    }

    function fmtPercent(n) {
      return window.MonitoringFormatters?.percent ? window.MonitoringFormatters.percent(n) : (Number.isFinite(n) ? `${n.toFixed(1)}%` : "0.0%");
    }

    function fmtDate(d) {
      return window.MonitoringDateUtils?.fmtDate ? window.MonitoringDateUtils.fmtDate(d) : (() => {
        if (!d) return "—";
        const x = new Date(d);
        if (isNaN(x)) return d;
        return x.toLocaleDateString("fr-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
      })();
    }

    function fmtDateInputValue(d) {
      if (window.MonitoringDateUtils?.fmtDateInputValue) return window.MonitoringDateUtils.fmtDateInputValue(d);
      if (!d) return "";
      const x = new Date(d);
      if (isNaN(x)) return String(d);
      const dd = String(x.getDate()).padStart(2, "0");
      const mm = String(x.getMonth() + 1).padStart(2, "0");
      const yyyy = x.getFullYear();
      return `${dd}.${mm}.${yyyy}`;
    }

    function parseFlexibleDateToIso(value) {
      if (window.MonitoringDateUtils?.parseFlexibleDateToIso) return window.MonitoringDateUtils.parseFlexibleDateToIso(value);
      const raw = String(value || "").trim();
      if (!raw) return "";

      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return raw;
      }

      const dotMatch = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/);
      if (dotMatch) {
        let [, dd, mm, yy] = dotMatch;
        dd = dd.padStart(2, "0");
        mm = mm.padStart(2, "0");
        if (yy.length === 2) {
          const yr = parseInt(yy, 10);
          yy = String(yr >= 70 ? 1900 + yr : 2000 + yr);
        }
        return `${yy}-${mm}-${dd}`;
      }

      const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
      if (slashMatch) {
        let [, dd, mm, yy] = slashMatch;
        dd = dd.padStart(2, "0");
        mm = mm.padStart(2, "0");
        if (yy.length === 2) {
          const yr = parseInt(yy, 10);
          yy = String(yr >= 70 ? 1900 + yr : 2000 + yr);
        }
        return `${yy}-${mm}-${dd}`;
      }

      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
      }

      return raw;
    }

    function escapeHtml(s) {
      return window.MonitoringDomUtils?.escapeHTML
        ? window.MonitoringDomUtils.escapeHTML(s)
        : String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    }

    function escapeHtmlAttr(s) {
      return window.MonitoringDomUtils?.escapeAttr
        ? window.MonitoringDomUtils.escapeAttr(s)
        : escapeHtml(s).replaceAll('"', "&quot;").replaceAll("'", "&#39;");
    }


    function autoFormatDateInput(rawValue) {
      if (window.MonitoringDateUtils?.autoFormatDateInput) return window.MonitoringDateUtils.autoFormatDateInput(rawValue);
      const digits = String(rawValue || "").replace(/\D/g, "").slice(0, 8);
      if (digits.length <= 2) return digits;
      if (digits.length <= 4) return `${digits.slice(0,2)}.${digits.slice(2)}`;
      return `${digits.slice(0,2)}.${digits.slice(2,4)}.${digits.slice(4)}`;
    }

    function bindDateMaskInput(input) {
      if (!input) return;
      const handler = () => {
        const formatted = autoFormatDateInput(input.value);
        if (input.value !== formatted) input.value = formatted;
      };
      input.addEventListener("input", handler);
      input.addEventListener("blur", handler);
    }

    function getReferenceValueForCurrentForm() {
      return getReferenceValueForRecordLike({
        domain: els.domain?.value || "",
        subStructure: els.subStructure?.value || "",
        dateExercice: parseFlexibleDateToIso(els.dateExercice?.value || "")
      });
    }

    function applyReferenceConvoquesToForm(force = false) {
      if (!els.nbConvoques) return;
      const value = getReferenceValueForCurrentForm();
      if (!value) return;
      const current = toInt(els.nbConvoques.value);
      const noDetailedData =
        toInt(els.nbPresents?.value) === 0 &&
        toInt(els.nbMaladie?.value) === 0 &&
        toInt(els.nbAccident?.value) === 0 &&
        toInt(els.nbArmee?.value) === 0 &&
        toInt(els.nbProfessionnel?.value) === 0 &&
        toInt(els.nbPrive?.value) === 0 &&
        toInt(els.nbAbsents?.value) === 0 &&
        toInt(els.nbPermutation?.value) === 0;

      if (force || (!editingId && (current === 0 || noDetailedData))) {
        els.nbConvoques.value = String(value);
      }
    }

    function getReferenceDateForNewPeriod() {
      const draft = (els.effectifUpdatedAt?.value || "").trim();
      if (/^\d{2}\.\d{2}\.\d{4}$/.test(draft)) return draft;
      return fmtDateInputValue(new Date().toISOString().slice(0, 10));
    }

    function getGraphFilteredRows() {
      let rows = getDisplayRows().filter(r => r.aComptabiliser);
      const selectedYear = String(els.graphYearFilter?.value || "").trim();
      if (selectedYear) {
        rows = rows.filter(r => String(yearOf(r.dateExercice)) === selectedYear);
      }
      const selectedDomains = els.graphDomainFilters
        ? [...els.graphDomainFilters.querySelectorAll('input[type="checkbox"]:checked')].map(input => input.value)
        : [];
      if (selectedDomains.length) {
        rows = rows.filter(r => selectedDomains.includes(r.domain));
      }
      return rows;
    }

    function populateGraphFilters() {
      if (els.graphYearFilter) {
        const years = [...new Set(getDisplayRows().map(r => yearOf(r.dateExercice)).filter(y => Number.isFinite(y)))].sort((a,b) => a-b);
        const currentValue = els.graphYearFilter.value;
        els.graphYearFilter.innerHTML = '<option value="">Toutes</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
        if (years.map(String).includes(currentValue)) els.graphYearFilter.value = currentValue;
      }
      if (els.graphDomainFilters) {
        const checked = new Set([...els.graphDomainFilters.querySelectorAll('input[type="checkbox"]:checked')].map(i => i.value));
        els.graphDomainFilters.innerHTML = DOMAIN_ORDER.map(domain => `
          <label><input type="checkbox" value="${domain}" ${checked.has(domain) ? 'checked' : ''}> <span>${domain}</span></label>
        `).join('');
        els.graphDomainFilters.querySelectorAll('input[type="checkbox"]').forEach(input => {
          input.addEventListener('change', () => renderCharts());
        });
      }
      if (els.graphYearFilter) {
        els.graphYearFilter.onchange = () => renderCharts();
      }
    }

    function isGroupedTemplate(template) {
      return String(template || "").startsWith("Formation groupée");
    }

    function isGroupedOrganExercise(domain, template) {
      return (domain === "DPS" || domain === "DAP") && isGroupedTemplate(template);
    }

    function getMutualizedSeriesKey(domain, template) {
      const safeDomain = String(domain || "").trim().toUpperCase();
      const safeTemplate = String(template || "").trim();
      if (!safeDomain || !safeTemplate) return "";

      let match = null;

      if (safeDomain === "DPS") {
        match = safeTemplate.match(/^Formation\s+groupée\s+DPS\s+(\d+)\.(\d+)(?:\s*\|.*)?$/i);
        if (match) return `DPS-${match[1]}`;
      }

      if (safeDomain === "DAP") {
        match = safeTemplate.match(/^Formation\s+groupée\s+DAP\s+(\d+)\.(\d+)(?:\s*\|.*)?$/i);
        if (match) return `DAP-${match[1]}`;
      }

      if (safeDomain === "PR") {
        match = safeTemplate.match(/^Exercice\s+PR\s+([1-4])\.(\d+)(?:\s*\|.*)?$/i);
        if (match) return `PR-${match[1]}`;
      }

      if (safeDomain === "AUTO") {
        match = safeTemplate.match(/^Exercice\s+Truck\s+1\.(\d+)(?:\s*\|.*)?$/i);
        if (match) return `TRUCK-1`;
        match = safeTemplate.match(/^Exercice\s+Car\s+1\.(\d+)(?:\s*\|.*)?$/i);
        if (match) return `CAR-1`;
      }

      return "";
    }

    function supportsMutualizedRoles(domain, template) {
      return !!getMutualizedSeriesKey(domain, template);
    }

    function createDefaultMutualRoles() {
      return {
        formateurs: { count: 0, aComptabiliser: false, mutualiser: true },
        surveillants: { count: 0, aComptabiliser: false, mutualiser: true },
        auxiliaires: { count: 0, aComptabiliser: false, mutualiser: true }
      };
    }

    function normalizeMutualRoles(raw) {
      const defaults = createDefaultMutualRoles();
      const safe = raw && typeof raw === "object" ? raw : {};
      const buildRole = key => ({
        count: toInt(safe[key]?.count),
        aComptabiliser: !!safe[key]?.aComptabiliser,
        mutualiser: safe[key]?.mutualiser !== false
      });

      return {
        formateurs: buildRole("formateurs"),
        surveillants: buildRole("surveillants"),
        auxiliaires: buildRole("auxiliaires")
      };
    }

    function getMutualRolesFromForm() {
      return normalizeMutualRoles({
        formateurs: {
          count: toInt(els.roleFormateursCount?.value),
          aComptabiliser: !!els.roleFormateursCompta?.checked,
          mutualiser: !!els.roleFormateursMutualise?.checked
        },
        surveillants: {
          count: toInt(els.roleSurveillantsCount?.value),
          aComptabiliser: !!els.roleSurveillantsCompta?.checked,
          mutualiser: !!els.roleSurveillantsMutualise?.checked
        },
        auxiliaires: {
          count: toInt(els.roleAuxiliairesCount?.value),
          aComptabiliser: !!els.roleAuxiliairesCompta?.checked,
          mutualiser: !!els.roleAuxiliairesMutualise?.checked
        }
      });
    }

    function applyMutualRolesToForm(rawRoles) {
      const roles = normalizeMutualRoles(rawRoles);
      if (els.roleFormateursCount) els.roleFormateursCount.value = String(roles.formateurs.count);
      if (els.roleFormateursCompta) els.roleFormateursCompta.checked = !!roles.formateurs.aComptabiliser;
      if (els.roleFormateursMutualise) els.roleFormateursMutualise.checked = !!roles.formateurs.mutualiser;
      if (els.roleSurveillantsCount) els.roleSurveillantsCount.value = String(roles.surveillants.count);
      if (els.roleSurveillantsCompta) els.roleSurveillantsCompta.checked = !!roles.surveillants.aComptabiliser;
      if (els.roleSurveillantsMutualise) els.roleSurveillantsMutualise.checked = !!roles.surveillants.mutualiser;
      if (els.roleAuxiliairesCount) els.roleAuxiliairesCount.value = String(roles.auxiliaires.count);
      if (els.roleAuxiliairesCompta) els.roleAuxiliairesCompta.checked = !!roles.auxiliaires.aComptabiliser;
      if (els.roleAuxiliairesMutualise) els.roleAuxiliairesMutualise.checked = !!roles.auxiliaires.mutualiser;
      refreshMutualRolesVisualState();
      updateTargetVisibilitySummary();
    }


    function createDefaultTargetExclusions() {
      return {
        dispenses: { count: 0, retirerCible: true, mutualiser: true }
      };
    }

    function normalizeTargetExclusions(raw) {
      const safe = raw && typeof raw === "object" ? raw : {};
      return {
        dispenses: {
          count: toInt(safe.dispenses?.count),
          retirerCible: safe.dispenses?.retirerCible !== false,
          mutualiser: safe.dispenses?.mutualiser !== false
        }
      };
    }

    function getTargetExclusionsFromForm() {
      return normalizeTargetExclusions({
        dispenses: {
          count: toInt(els.roleDispensesCount?.value),
          retirerCible: !!els.roleDispensesDeduct?.checked,
          mutualiser: !!els.roleDispensesMutualise?.checked
        }
      });
    }

    function applyTargetExclusionsToForm(raw) {
      const exclusions = normalizeTargetExclusions(raw);
      if (els.roleDispensesCount) els.roleDispensesCount.value = String(exclusions.dispenses.count);
      if (els.roleDispensesDeduct) els.roleDispensesDeduct.checked = !!exclusions.dispenses.retirerCible;
      if (els.roleDispensesMutualise) els.roleDispensesMutualise.checked = !!exclusions.dispenses.mutualiser;
      updateTargetExclusionsUI();
      updateTargetVisibilitySummary();
    }

    function updateTargetExclusionsUI() {
      if (!els.targetExclusionsBlock) return;
      const visible = supportsMutualizedRoles(els.domain?.value, els.template?.value);
      els.targetExclusionsBlock.style.display = visible ? "block" : "none";
    }

    function refreshMutualRolesVisualState() {
      const visible = supportsMutualizedRoles(els.domain?.value, els.template?.value);
      const seriesKey = getMutualizedSeriesKey(els.domain?.value, els.template?.value);
      const roles = getMutualRolesFromForm();
      const config = [
        ["formateurs", els.mutualRolesVisualFormateurs, els.mutualRoleRowFormateurs, "Formateurs"],
        ["surveillants", els.mutualRolesVisualSurveillants, els.mutualRoleRowSurveillants, "Surveillants"],
        ["auxiliaires", els.mutualRolesVisualAuxiliaires, els.mutualRoleRowAuxiliaires, "Auxiliaires"]
      ];

      if (els.mutualRolesSeriesBadge) {
        if (visible && seriesKey) {
          els.mutualRolesSeriesBadge.textContent = `Série active : ${seriesKey}`;
          els.mutualRolesSeriesBadge.classList.remove("hidden");
        } else {
          els.mutualRolesSeriesBadge.textContent = "";
          els.mutualRolesSeriesBadge.classList.add("hidden");
        }
      }

      config.forEach(([key, badge, row, label]) => {
        const role = roles[key];
        const counted = !!role.aComptabiliser && toInt(role.count) > 0;
        const series = counted && !!role.mutualiser && !!seriesKey;
        if (badge) {
          badge.className = `mutual-role-badge ${series ? 'series' : counted ? 'active' : 'neutral'}`;
          badge.textContent = !counted
            ? `${label} non mutualisés`
            : series
              ? `${label} mutualisés sur la série`
              : `${label} comptés sur la séance`;
        }
        if (row) {
          row.classList.toggle('mutual-role-row-active', counted);
          row.classList.toggle('mutual-role-row-counted', counted && !series);
          row.classList.toggle('mutual-role-row-series', series);
        }
      });
    }

    function updateMutualRolesUI() {
      if (!els.mutualRolesBlock) return;
      const visible = supportsMutualizedRoles(els.domain?.value, els.template?.value);
      els.mutualRolesBlock.style.display = visible ? "block" : "none";
      refreshMutualRolesVisualState();
      updateTargetExclusionsUI();
    }

    
function updateTargetVisibilitySummary() {
  if (!els.targetVisibilityCard) return;

  const domain = String(els.domain?.value || "").trim();
  const template = String(els.template?.value || "").trim();
  const brute = domain === "DAP"
    ? (
        toInt(els.nbConvoques?.value) +
        toInt(els.nbExtDapY1?.value) +
        toInt(els.nbExtDapY2?.value) +
        toInt(els.nbExtDapY3?.value) +
        toInt(els.nbExtDapY4?.value)
      )
    : toInt(els.nbConvoques?.value);

  const fakeRecord = {
    id: editingId || "__draft__",
    importedEventId: null,
    domain,
    template,
    nbConvoques: toInt(els.nbConvoques?.value),
    nbExtDapY1: toInt(els.nbExtDapY1?.value),
    nbExtDapY2: toInt(els.nbExtDapY2?.value),
    nbExtDapY3: toInt(els.nbExtDapY3?.value),
    nbExtDapY4: toInt(els.nbExtDapY4?.value),
    nbPresents: toInt(els.nbPresents?.value),
    mutualRoles: getMutualRolesFromForm(),
    targetExclusions: getTargetExclusionsFromForm()
  };

  const visible = !!domain && !!template;
  const seriesKey = getMutualizedSeriesKey(domain, template);
  const roles = normalizeMutualRoles(fakeRecord.mutualRoles);
  const exclusions = normalizeTargetExclusions(fakeRecord.targetExclusions);

  const seriesFormateurs = roles.formateurs?.mutualiser ? toInt(roles.formateurs?.count) : 0;
  const seriesDispenses = exclusions.dispenses?.retirerCible && exclusions.dispenses?.mutualiser ? toInt(exclusions.dispenses?.count) : 0;
  const directFormateurs = !roles.formateurs?.mutualiser ? toInt(roles.formateurs?.count) : 0;
  const directDispenses = exclusions.dispenses?.retirerCible && !exclusions.dispenses?.mutualiser ? toInt(exclusions.dispenses?.count) : 0;
  const deduction = directFormateurs + directDispenses + seriesFormateurs + seriesDispenses;
  const nette = Math.max(0, brute - deduction);
  const supportPresent = getSessionSupportPresence(fakeRecord);
  const metierPresents = getSessionMetierPresents(fakeRecord);

  els.targetVisibilityCard.classList.toggle('active', visible);
  els.targetBruteValue.textContent = String(brute);
  els.targetFormateursValue.textContent = String(deduction);
  els.targetNetteValue.textContent = String(nette);

  if (!visible) {
    els.targetVisibilityFoot.textContent = 'Renseigne un domaine et un événement pour visualiser la cible nette.';
  } else {
    const detailParts = [];
    if (directFormateurs > 0 || seriesFormateurs > 0) detailParts.push(`formateurs ${directFormateurs + seriesFormateurs}`);
    if (directDispenses > 0 || seriesDispenses > 0) detailParts.push(`dispensés ${directDispenses + seriesDispenses}`);
    const detailText = detailParts.length ? detailParts.join(' • ') : 'aucun retrait';
    const scopeText = seriesKey && (seriesFormateurs > 0 || seriesDispenses > 0) ? `série ${seriesKey}` : 'séance';
    els.targetVisibilityFoot.textContent = `Retraits ${scopeText} : ${detailText}. Présents bruts : ${toInt(fakeRecord.nbPresents)} • Encadrement présent : ${supportPresent} • Présents métier : ${metierPresents} • Personnel dispensé (visuel série/séance) : ${getDispensesVisualCount(fakeRecord)}.`;
  }
}



    function getNonMutualizedRolePresence(rawRoles) {
      const roles = normalizeMutualRoles(rawRoles);
      return ["formateurs", "surveillants", "auxiliaires"].reduce((acc, key) => {
        const role = roles[key];
        if (role.aComptabiliser && !role.mutualiser) acc += toInt(role.count);
        return acc;
      }, 0);
    }

    function buildMutualizedRoleAllocation() {
      const mutualAllocationMap = new Map();
      const grouped = new Map();
      const rows = getDisplayRows().filter(record => record && record.aComptabiliser);

      rows.forEach(record => {
        const seriesKey = getMutualizedSeriesKey(record.domain, record.template);
        if (!seriesKey) return;
        const roles = normalizeMutualRoles(record.mutualRoles);

        ["formateurs", "surveillants", "auxiliaires"].forEach(roleKey => {
          const role = roles[roleKey];
          if (!(role.aComptabiliser && role.mutualiser && toInt(role.count) > 0)) return;
          const groupKey = `${seriesKey}::${roleKey}`;
          if (!grouped.has(groupKey)) grouped.set(groupKey, []);
          grouped.get(groupKey).push(record);
        });
      });

      grouped.forEach((items, groupKey) => {
        const sorted = [...items].sort((a, b) => {
          const da = normalizeIsoDate(a.dateExercice) || "9999-12-31";
          const db = normalizeIsoDate(b.dateExercice) || "9999-12-31";
          if (da !== db) return da.localeCompare(db);
          const ca = String(a.createdAt || "");
          const cb = String(b.createdAt || "");
          if (ca !== cb) return ca.localeCompare(cb);
          return String(a.id || "").localeCompare(String(b.id || ""));
        });
        const winner = sorted[0];
        const roleKey = groupKey.split("::")[1];
        const count = Math.max(...items.map(item => toInt(normalizeMutualRoles(item.mutualRoles)[roleKey].count)), 0);
        const allocationKey = winner.importedEventId ? `imported:${winner.importedEventId}` : `record:${winner.id}`;
        if (!mutualAllocationMap.has(allocationKey)) mutualAllocationMap.set(allocationKey, 0);
        mutualAllocationMap.set(allocationKey, mutualAllocationMap.get(allocationKey) + count);
      });

      return mutualAllocationMap;
    }

    function getDirectTargetDeduction(record) {
      const roles = normalizeMutualRoles(record?.mutualRoles);
      const exclusions = normalizeTargetExclusions(record?.targetExclusions);
      let total = 0;
      if (roles.formateurs?.aComptabiliser) total += toInt(roles.formateurs?.count);
      if (exclusions.dispenses?.retirerCible) total += toInt(exclusions.dispenses?.count);
      return total;
    }

    
function buildTrainerTargetDeductionAllocationMap() {
  const trainerDeductionMap = new Map();
  const grouped = new Map();
  const rows = getDisplayRows().filter(record => record && record.aComptabiliser);

  rows.forEach(record => {
    const roles = normalizeMutualRoles(record.mutualRoles);
    const exclusions = normalizeTargetExclusions(record.targetExclusions);
    const seriesKey = getMutualizedSeriesKey(record.domain, record.template);
    if (!seriesKey) return;

    const trainerCount = roles.formateurs?.mutualiser ? toInt(roles.formateurs?.count) : 0;
    const dispensesCount = exclusions.dispenses?.retirerCible && exclusions.dispenses?.mutualiser ? toInt(exclusions.dispenses?.count) : 0;
    if ((trainerCount + dispensesCount) <= 0) return;

    const groupKey = `${seriesKey}::target-deduction`;
    if (!grouped.has(groupKey)) grouped.set(groupKey, []);
    grouped.get(groupKey).push(record);
  });

  grouped.forEach(items => {
    const sorted = [...items].sort((a, b) => {
      const da = normalizeIsoDate(a.dateExercice) || "9999-12-31";
      const db = normalizeIsoDate(b.dateExercice) || "9999-12-31";
      if (da !== db) return da.localeCompare(db);
      const ca = String(a.createdAt || "");
      const cb = String(b.createdAt || "");
      if (ca !== cb) return ca.localeCompare(cb);
      return String(a.id || "").localeCompare(String(b.id || ""));
    });

    const winner = sorted[0];
    const count = Math.max(...items.map(item => {
      const roles = normalizeMutualRoles(item.mutualRoles);
      const exclusions = normalizeTargetExclusions(item.targetExclusions);
      const trainerCount = roles.formateurs?.mutualiser ? toInt(roles.formateurs?.count) : 0;
      const dispensesCount = exclusions.dispenses?.retirerCible && exclusions.dispenses?.mutualiser ? toInt(exclusions.dispenses?.count) : 0;
      return trainerCount + dispensesCount;
    }), 0);

    const rowKey = winner.importedEventId ? `imported:${winner.importedEventId}` : `record:${winner.id}`;
    trainerDeductionMap.set(rowKey, count);
  });

  return trainerDeductionMap;
}


    
function getSessionSupportPresence(record) {
  // Seuls les rôles marqués "à comptabiliser" (aComptabiliser=true) sont physiquement
  // déduits des présents métier. Les rôles non comptabilisés ne modifient pas la saisie brute.
  const roles = normalizeMutualRoles(record?.mutualRoles);
  return ["formateurs", "surveillants", "auxiliaires"].reduce((acc, key) => {
    const role = roles[key];
    if (role.aComptabiliser) acc += toInt(role.count);
    return acc;
  }, 0);
}

function getSessionMetierPresents(record) {
  return Math.max(0, toInt(record?.nbPresents) - getSessionSupportPresence(record));
}

function getPresenceRateNumerator(record) {
  return getSessionMetierPresents(record);
}

function shouldCapRateForDomain(domain) {
  return domain === "DAP" || domain === "PR";
}

function capRateForDomain(domain, rate) {
  if (rate == null || !Number.isFinite(rate)) return rate;
  return shouldCapRateForDomain(domain) ? Math.min(rate, 100) : rate;
}

function capRateForRecord(record, rate) {
  return capRateForDomain(record?.domain, rate);
}

function getSessionCountedPresents(record, mutualAllocationMap = null) {
  return getEffectivePresents(record, mutualAllocationMap);
}

function getCountedPresenceRate(record, mutualAllocationMap = null, trainerDeductionMap = null) {
  const convoques = getEffectiveConvoques(record, trainerDeductionMap);
  const presents = getSessionCountedPresents(record, mutualAllocationMap);
  const rawRate = convoques > 0 ? (100 * presents / convoques) : 0;
  return capRateForRecord(record, rawRate);
}

function getDispensesVisualCount(record) {
  const exclusions = normalizeTargetExclusions(record?.targetExclusions);
  return toInt(exclusions.dispenses?.count);
}


function getTargetDeductionBreakdown(record, trainerDeductionMap = null) {
  const roles = normalizeMutualRoles(record?.mutualRoles);
  const exclusions = normalizeTargetExclusions(record?.targetExclusions);

  const directFormateurs = !roles.formateurs?.mutualiser ? toInt(roles.formateurs?.count) : 0;
  const directDispenses = exclusions.dispenses?.retirerCible && !exclusions.dispenses?.mutualiser ? toInt(exclusions.dispenses?.count) : 0;

  let seriesFormateurs = 0;
  let seriesDispenses = 0;
  const seriesKey = getMutualizedSeriesKey(record?.domain, record?.template);

  if (seriesKey) {
    const rowKey = record?.importedEventId ? `imported:${record.importedEventId}` : `record:${record?.id}`;
    const allocationMap = trainerDeductionMap instanceof Map ? trainerDeductionMap : buildTrainerTargetDeductionAllocationMap();
    const allocated = allocationMap.get(rowKey) || 0;
    const rawSeriesFormateurs = roles.formateurs?.mutualiser ? toInt(roles.formateurs?.count) : 0;
    if (allocated > 0 && rawSeriesFormateurs > 0) seriesFormateurs = Math.min(allocated, rawSeriesFormateurs);
    seriesDispenses = 0;
  }

  return {
    directFormateurs,
    directDispenses,
    seriesFormateurs,
    seriesDispenses,
    totalFormateurs: directFormateurs + seriesFormateurs,
    totalDispenses: directDispenses + seriesDispenses,
    total: directFormateurs + directDispenses + seriesFormateurs + seriesDispenses
  };
}

function getSeriesReferenceTarget(sessions) {
  const safeSessions = Array.isArray(sessions) ? sessions.filter(Boolean) : [];
  if (!safeSessions.length) return 0;
  return Math.max(...safeSessions.map(session => getReferenceValueForRecordLike(session)), 0);
}

function getSeriesUniqueSupportCounts(sessions) {
  const safeSessions = Array.isArray(sessions) ? sessions.filter(Boolean) : [];
  let formateurs = 0;
  let dispenses = 0;

  safeSessions.forEach(session => {
    const roles = normalizeMutualRoles(session?.mutualRoles);
    const exclusions = normalizeTargetExclusions(session?.targetExclusions);

    formateurs = Math.max(formateurs, toInt(roles.formateurs?.count));

    if (exclusions.dispenses?.retirerCible) {
      dispenses = Math.max(dispenses, toInt(exclusions.dispenses?.count));
    }
  });

  return {
    formateurs,
    dispenses,
    total: formateurs + dispenses
  };
}

function getTargetDeduction(record, trainerDeductionMap = null) {
  const breakdown = getTargetDeductionBreakdown(record, trainerDeductionMap);
  return breakdown.total;
}


    function getTrainerTargetDeduction(record, trainerDeductionMap = null) {
      return getTargetDeduction(record, trainerDeductionMap);
    }

    function getEffectivePresents(record, mutualAllocationMap = null) {
      const rowKey = record?.importedEventId ? `imported:${record.importedEventId}` : `record:${record?.id}`;
      const allocationMap = mutualAllocationMap instanceof Map ? mutualAllocationMap : buildMutualizedRoleAllocation();
      const mutualized = allocationMap.get(rowKey) || 0;
      return toInt(record?.nbPresents) + getNonMutualizedRolePresence(record?.mutualRoles) + mutualized;
    }

    function getMutualRolesSummaryText(record, mutualAllocationMap = null) {
      const roles = normalizeMutualRoles(record?.mutualRoles);
      const seriesKey = getMutualizedSeriesKey(record?.domain, record?.template);
      const parts = [];
      const labels = { formateurs: 'Formateurs', surveillants: 'Surveillants', auxiliaires: 'Personnel auxiliaire' };
      ["formateurs", "surveillants", "auxiliaires"].forEach(key => {
        const role = roles[key];
        if (!toInt(role.count)) return;
        if (role.aComptabiliser) {
          parts.push(`${labels[key]}: ${role.count}${role.mutualiser && seriesKey ? `, mutualisés sur ${seriesKey}` : ', comptés sur la séance'}`);
        } else {
          parts.push(`${labels[key]}: ${role.count}, non comptés`);
        }
      });
      return parts.join(' | ');
    }

    function getOrganeListForGroupedExercise(domain) {
      if (domain === "DPS") return ["G1", "C1", "B1", "B2"];
      if (domain === "DAP") return ["Y1", "Y2", "Y3", "Y4"];
      return [];
    }

    function getReferenceValueForOrganeAtDate(domain, organe, dateValue) {
      const ref = getReferenceSnapshotForDate(dateValue);

      if (domain === "DPS") {
        if (organe === "G1") return ref.organes.dpsG1;
        if (organe === "C1") return ref.organes.dpsC1;
        if (organe === "B1") return ref.organes.dpsB1;
        if (organe === "B2") return ref.organes.dpsB2;
      }

      if (domain === "DAP") {
        if (organe === "Y1") return ref.organes.dapY1;
        if (organe === "Y2") return ref.organes.dapY2;
        if (organe === "Y3") return ref.organes.dapY3;
        if (organe === "Y4") return ref.organes.dapY4;
      }

      return 0;
    }

    function createDefaultGroupExerciseDetails(domain, dateValue) {
      return getOrganeListForGroupedExercise(domain).map(organe => ({
        organe,
        nbConvoques: getReferenceValueForOrganeAtDate(domain, organe, dateValue),
        nbPresents: 0,
        nbMaladie: 0,
        nbAccident: 0,
        nbArmee: 0,
        nbProfessionnel: 0,
        nbPrive: 0,
        nbAbsents: 0
      }));
    }

    function getCurrentGroupExerciseDetailsFromUI() {
      if (!els.groupExerciseTableBody) return [];

      return [...els.groupExerciseTableBody.querySelectorAll("tr[data-organe]")].map(tr => {
        const organe = tr.dataset.organe;
        return {
          organe,
          nbConvoques: toInt(tr.querySelector('[data-field="nbConvoques"]')?.value),
          nbPresents: toInt(tr.querySelector('[data-field="nbPresents"]')?.value),
          nbMaladie: toInt(tr.querySelector('[data-field="nbMaladie"]')?.value),
          nbAccident: toInt(tr.querySelector('[data-field="nbAccident"]')?.value),
          nbArmee: toInt(tr.querySelector('[data-field="nbArmee"]')?.value),
          nbProfessionnel: toInt(tr.querySelector('[data-field="nbProfessionnel"]')?.value),
          nbPrive: toInt(tr.querySelector('[data-field="nbPrive"]')?.value),
          nbAbsents: toInt(tr.querySelector('[data-field="nbAbsents"]')?.value)
        };
      });
    }

    function recalcGroupExerciseTable() {
      if (!els.groupExerciseBlock || els.groupExerciseBlock.style.display === "none") return;

      let totalConvoques = 0;
      let totalPresents = 0;
      let totalMaladie = 0;
      let totalAccident = 0;
      let totalArmee = 0;
      let totalProfessionnel = 0;
      let totalPrive = 0;
      let totalAbsents = 0;

      [...els.groupExerciseTableBody.querySelectorAll("tr[data-organe]")].forEach(tr => {
        const nbConvoques = toInt(tr.querySelector('[data-field="nbConvoques"]')?.value);
        const nbPresents = toInt(tr.querySelector('[data-field="nbPresents"]')?.value);
        const nbMaladie = toInt(tr.querySelector('[data-field="nbMaladie"]')?.value);
        const nbAccident = toInt(tr.querySelector('[data-field="nbAccident"]')?.value);
        const nbArmee = toInt(tr.querySelector('[data-field="nbArmee"]')?.value);
        const nbProfessionnel = toInt(tr.querySelector('[data-field="nbProfessionnel"]')?.value);
        const nbPrive = toInt(tr.querySelector('[data-field="nbPrive"]')?.value);
        const nbAbsents = toInt(tr.querySelector('[data-field="nbAbsents"]')?.value);

        const rowTotal =
          nbPresents +
          nbMaladie +
          nbAccident +
          nbArmee +
          nbProfessionnel +
          nbPrive +
          nbAbsents;

        const rowRate = nbConvoques > 0 ? (100 * nbPresents / nbConvoques) : 0;

        const totalInput = tr.querySelector('[data-field="rowTotal"]');
        const rateInput = tr.querySelector('[data-field="rowRate"]');

        if (totalInput) totalInput.value = String(rowTotal);
        if (rateInput) rateInput.value = fmtPercent(rowRate);

        totalConvoques += nbConvoques;
        totalPresents += nbPresents;
        totalMaladie += nbMaladie;
        totalAccident += nbAccident;
        totalArmee += nbArmee;
        totalProfessionnel += nbProfessionnel;
        totalPrive += nbPrive;
        totalAbsents += nbAbsents;
      });

      els.nbConvoques.value = String(totalConvoques);
      els.nbPresents.value = String(totalPresents);
      els.nbMaladie.value = String(totalMaladie);
      els.nbAccident.value = String(totalAccident);
      els.nbArmee.value = String(totalArmee);
      els.nbProfessionnel.value = String(totalProfessionnel);
      els.nbPrive.value = String(totalPrive);
      els.nbAbsents.value = String(totalAbsents);

      els.nbPermutation.value = "0";
      els.nbExtDapY1.value = "0";
      els.nbExtDapY2.value = "0";
      els.nbExtDapY3.value = "0";
      els.nbExtDapY4.value = "0";
      updateDapExternalTotal();

      const globalRate = totalConvoques > 0 ? (100 * totalPresents / totalConvoques) : 0;

      els.groupGlobalConvoques.textContent = totalConvoques;
      els.groupGlobalPresents.textContent = totalPresents;
      els.groupGlobalRate.textContent = fmtPercent(globalRate);

      validateExerciseForm();
    }

    function renderGroupExerciseRows(details) {
      if (!els.groupExerciseTableBody) return;

      els.groupExerciseTableBody.innerHTML = "";

      details.forEach(item => {
        const tr = document.createElement("tr");
        tr.dataset.organe = item.organe;

        tr.innerHTML = `
          <td><strong>${item.organe}</strong></td>
          <td><input data-field="nbConvoques" type="number" min="0" max="999" value="${toInt(item.nbConvoques)}" /></td>
          <td><input data-field="nbPresents" type="number" min="0" max="999" value="${toInt(item.nbPresents)}" /></td>
          <td><input data-field="nbMaladie" type="number" min="0" max="999" value="${toInt(item.nbMaladie)}" /></td>
          <td><input data-field="nbAccident" type="number" min="0" max="999" value="${toInt(item.nbAccident)}" /></td>
          <td><input data-field="nbArmee" type="number" min="0" max="999" value="${toInt(item.nbArmee)}" /></td>
          <td><input data-field="nbProfessionnel" type="number" min="0" max="999" value="${toInt(item.nbProfessionnel)}" /></td>
          <td><input data-field="nbPrive" type="number" min="0" max="999" value="${toInt(item.nbPrive)}" /></td>
          <td><input data-field="nbAbsents" type="number" min="0" max="999" value="${toInt(item.nbAbsents)}" /></td>
          <td><input data-field="rowTotal" type="text" readonly value="0" /></td>
          <td><input data-field="rowRate" type="text" readonly value="0.0%" /></td>
        `;

        els.groupExerciseTableBody.appendChild(tr);
      });

      els.groupExerciseTableBody.querySelectorAll("input[type='number']").forEach(input => {
        input.addEventListener("input", recalcGroupExerciseTable);
        input.addEventListener("change", recalcGroupExerciseTable);
      });

      recalcGroupExerciseTable();
    }

    function updateGroupedExerciseUI(forceDetails = null) {
  const grouped = isGroupedOrganExercise(els.domain.value, els.template.value);

  if (!els.groupExerciseBlock) return;

  if (!grouped) {
    els.groupExerciseBlock.style.display = "none";
    return;
  }

  els.groupExerciseBlock.style.display = "block";
  els.dapPermutationBlock.style.display = "none";

  const dateValue = els.dateExercice.value || new Date().toISOString().slice(0, 10);

  const currentUiDetails = getCurrentGroupExerciseDetailsFromUI();
  const hasCurrentUiDetails = Array.isArray(currentUiDetails) && currentUiDetails.length > 0;

  const details =
    Array.isArray(forceDetails) && forceDetails.length
      ? forceDetails
      : hasCurrentUiDetails
        ? currentUiDetails
        : createDefaultGroupExerciseDetails(els.domain.value, dateValue);

  renderGroupExerciseRows(details);
}

    function getExercisePresenceRate(record, mutualAllocationMap = null, trainerDeductionMap = null) {
  const convoques = getEffectiveConvoques(record, trainerDeductionMap);
  const presents = getPresenceRateNumerator(record);
  const rawRate = convoques > 0 ? (100 * presents / convoques) : 0;
  return capRateForRecord(record, rawRate);
}

    
function buildTargetBlockHtml(record, trainerDeductionMap) {
  const brute = record?.domain === "DAP"
    ? (toInt(record?.nbConvoques) + toInt(record?.nbExtDapY1) + toInt(record?.nbExtDapY2) + toInt(record?.nbExtDapY3) + toInt(record?.nbExtDapY4))
    : toInt(record?.nbConvoques);
  const breakdown = getTargetDeductionBreakdown(record, trainerDeductionMap);
  const nette = Math.max(0, brute - breakdown.total);
  const dispensesVisual = getDispensesVisualCount(record);
  const seriesKey = getMutualizedSeriesKey(record?.domain, record?.template);
  const pieces = [];
  if (breakdown.totalFormateurs > 0) pieces.push(`Formateurs ${breakdown.totalFormateurs}`);
  if (breakdown.totalDispenses > 0) pieces.push(`Dispensés séance ${breakdown.totalDispenses}`);
  const deductionLabel = breakdown.total > 0 ? `Retrait cible${seriesKey ? ` (${seriesKey})` : ""} — ${pieces.join(" / ")}` : `Retrait cible`;
  const noteParts = [breakdown.total > 0 ? `La cible nette de séance exclut ${breakdown.totalFormateurs} formateur(s)${breakdown.totalDispenses > 0 ? ` et ${breakdown.totalDispenses} dispensé(s) de séance` : ''}.` : `Aucun retrait de séance actif — cible brute = cible nette.`];
  if (dispensesVisual > 0) noteParts.push(`Personnel dispensé de la série d'exercice : ${dispensesVisual}.`);
  return `<div class="target-block-inline">
    <div class="target-block-row"><span class="target-block-label">Cible brute</span><span class="target-block-value">${brute}</span></div>
    <div class="target-block-row target-block-deduction"><span class="target-block-label">${deductionLabel}</span><span class="target-block-value">&minus;${breakdown.total}</span></div>
    <div class="target-block-row target-block-nette"><span class="target-block-label">Cible nette (PAPR)</span><span class="target-block-value">${nette}</span></div>
    <div class="target-block-note">${noteParts.join(' ')}</div>
  </div>`;
}


    
function openExercisePreview(record) {
  if (!els.previewModal || !els.previewBody) return;

  const mutualAllocationMap = buildMutualizedRoleAllocation();
  const trainerDeductionMap = buildTrainerTargetDeductionAllocationMap();
  const taux = fmtPercent(getExercisePresenceRate(record, mutualAllocationMap, trainerDeductionMap));
  const tauxCompte = fmtPercent(getCountedPresenceRate(record, mutualAllocationMap, trainerDeductionMap));
  const effectivePresents = getEffectivePresents(record, mutualAllocationMap);
  const effectiveConvoques = getEffectiveConvoques(record, trainerDeductionMap);
  const metierPresents = getSessionMetierPresents(record);
  const supportPresent = getSessionSupportPresence(record);
  const mutualRolesSummary = getMutualRolesSummaryText(record, mutualAllocationMap);
  const details = Array.isArray(record.groupExerciseDetails) ? record.groupExerciseDetails : [];
  const targetBlockHtml = buildTargetBlockHtml(record, trainerDeductionMap);

  let detailsHtml = "";
  if (details.length) {
    detailsHtml = `
      <div class="preview-box">
        <div class="preview-box-label">Détail par organe</div>
        <div class="table-wrap" style="max-height:260px;">
          <table>
            <thead>
              <tr>
                <th>Organe</th>
                <th class="right">Convoqués</th>
                <th class="right">Présents</th>
                <th class="right">Excusés</th>
                <th class="right">Absents</th>
                <th class="right">Taux</th>
              </tr>
            </thead>
            <tbody>
              ${details.map(item => {
                const excuses =
                  toInt(item.nbMaladie) +
                  toInt(item.nbAccident) +
                  toInt(item.nbArmee) +
                  toInt(item.nbProfessionnel) +
                  toInt(item.nbPrive);
                const rate = toInt(item.nbConvoques) > 0
                  ? (100 * toInt(item.nbPresents) / toInt(item.nbConvoques))
                  : 0;

                return `
                  <tr>
                    <td>${item.organe}</td>
                    <td class="right">${toInt(item.nbConvoques)}</td>
                    <td class="right">${toInt(item.nbPresents)}</td>
                    <td class="right">${excuses}</td>
                    <td class="right">${toInt(item.nbAbsents)}</td>
                    <td class="right">${fmtPercent(rate)}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  const multiSessionNote = (() => {
    const seriesKey = getMutualizedSeriesKey(record.domain, record.template);
    if (!seriesKey) return "";
    const analysis = getSeriesAnalysis(seriesKey);
    if (!analysis || analysis.sessionCount <= 1) return "";
    const toneCls = analysis.globalTaux == null ? 'warning' : analysis.globalTaux >= 80 ? '' : analysis.globalTaux >= 60 ? 'warning' : 'danger';
    const seriesTargetText = analysis.seriesTarget == null ? '—' : analysis.seriesTarget;
    const rateText = analysis.globalTaux == null ? '—' : fmtPercent(analysis.globalTaux);
    const rateCountedText = analysis.globalCountedTaux == null ? '—' : fmtPercent(analysis.globalCountedTaux);
    return `<div class="series-summary-banner ${toneCls}"><div class="line-1">Série ${seriesKey} — ${analysis.sessionCount} session(s) • Cible série nette : ${seriesTargetText} • Présents comptés cumulés : ${analysis.totalPresents} • Présents métier cumulés : ${analysis.totalMetierPresents} • Taux métier : ${rateText} • Taux compté : ${rateCountedText}</div><div class="line-2">Référence série : ${analysis.referenceTargetText} • Formateurs uniques : ${analysis.uniqueSupport.formateurs} • Personnel dispensé de la série d'exercice : ${analysis.uniqueSupport.dispenses} • Excusés cumulés : ${analysis.totalExcuses} • Absents non excusés cumulés : ${analysis.totalAbsents} • Écart de couverture métier : ${analysis.coverageGap}</div></div>`;
  })();

  els.previewBody.innerHTML = `
    <div class="preview-grid">
      <div class="preview-box">
        <div class="preview-box-label">Date</div>
        <div class="preview-box-value">${fmtDate(record.dateExercice)}</div>
      </div>
      <div class="preview-box">
        <div class="preview-box-label">Domaine</div>
        <div class="preview-box-value">${escapeHtml(record.domain || "")}</div>
      </div>
      <div class="preview-box">
        <div class="preview-box-label">Public cible</div>
        <div class="preview-box-value">${escapeHtml(getSubLabel(record.domain, record.subStructure))}</div>
      </div>
      <div class="preview-box">
        <div class="preview-box-label">Événement</div>
        <div class="preview-box-value">${escapeHtml(record.template || "")}</div>
      </div>
      <div class="preview-box">
        <div class="preview-box-label">Stat.Com</div>
        <div class="preview-box-value">${escapeHtml(record.statCom || "—")}</div>
      </div>
      <div class="preview-box">
        <div class="preview-box-label">Statut</div>
        <div class="preview-box-value">${escapeHtml(record.status || "Planifié")}</div>
      </div>
    </div>

    ${targetBlockHtml}

    <div class="preview-grid">
      <div class="preview-box">
        <div class="preview-box-label">Convoqués (cible nette)</div>
        <div class="preview-box-value">${effectiveConvoques}</div>
      </div>
      <div class="preview-box">
        <div class="preview-box-label">Présents comptés</div>
        <div class="preview-box-value">${effectivePresents}</div>
      </div>
      <div class="preview-box">
        <div class="preview-box-label">Présents métier</div>
        <div class="preview-box-value">${metierPresents}</div>
      </div>
      <div class="preview-box">
        <div class="preview-box-label">Encadrement présent</div>
        <div class="preview-box-value">${supportPresent}</div>
      </div>
      <div class="preview-box">
        <div class="preview-box-label">Taux métier</div>
        <div class="preview-box-value">${taux}</div>
      </div>
      <div class="preview-box">
        <div class="preview-box-label">Taux compté</div>
        <div class="preview-box-value">${tauxCompte}</div>
      </div>
      <div class="preview-box">
        <div class="preview-box-label">Excusés</div>
        <div class="preview-box-value">${sumExcuses(record)}</div>
      </div>
      <div class="preview-box">
        <div class="preview-box-label">Personnel dispensé (visuel série/séance)</div>
        <div class="preview-box-value">${getDispensesVisualCount(record)}</div>
      </div>
      <div class="preview-box">
        <div class="preview-box-label">Absents non excusés</div>
        <div class="preview-box-value">${toInt(record.nbAbsents)}</div>
      </div>
    </div>

    ${multiSessionNote}

    <div class="preview-box">
      <div class="preview-box-label">Informations complémentaires</div>
      <div class="preview-box-value">${escapeHtml(record.remarque || "—")}</div>
    </div>

    ${mutualRolesSummary ? `<div class="preview-box"><div class="preview-box-label">Rôles mutualisés / comptabilisation</div><div class="preview-box-value">${escapeHtml(mutualRolesSummary)}</div></div>` : ""}

    ${detailsHtml}
  `;

  els.previewModal.classList.add("open");
}


    function closeExercisePreview() {
      if (!els.previewModal) return;
      els.previewModal.classList.remove("open");
    }

    function isDAPSelection() {
      return els.domain.value === "DAP";
    }

   function getCurrentDapReferenceForSelectedSection() {
    if (els.domain.value !== "DAP") return 0;

    return getReferenceValueForRecordLike({
      domain: "DAP",
      subStructure: els.subStructure.value,
      dateExercice: parseFlexibleDateToIso(els.dateExercice?.value || "")
    });
  }


    function getDapExternalTotal() {
      return (
        toInt(els.nbExtDapY1?.value) +
        toInt(els.nbExtDapY2?.value) +
        toInt(els.nbExtDapY3?.value) +
        toInt(els.nbExtDapY4?.value)
      );
    }

    function updateDapExternalTotal() {
      if (!els.nbExtDapTotal) return;
      els.nbExtDapTotal.value = String(getDapExternalTotal());
    }

    function updateDapSpecificUI() {
      const isDAP = isDAPSelection();
      const grouped = isGroupedOrganExercise(els.domain.value, els.template.value);

      if (grouped) {
  const currentDetails = getCurrentGroupExerciseDetailsFromUI();

  els.nbPermutation.value = "0";
  els.nbExtDapY1.value = "0";
  els.nbExtDapY2.value = "0";
  els.nbExtDapY3.value = "0";
  els.nbExtDapY4.value = "0";
  updateDapExternalTotal();
  updateGroupedExerciseUI(currentDetails);
  return;
}

      if (els.groupExerciseBlock) {
        els.groupExerciseBlock.style.display = "none";
      }

      if (els.dapPermutationBlock) {
        els.dapPermutationBlock.style.display = isDAP ? "flex" : "none";
        els.dapPermutationBlock.style.flexDirection = "column";
      }

      if (!isDAP) {
        els.nbPermutation.value = "0";
        els.nbExtDapY1.value = "0";
        els.nbExtDapY2.value = "0";
        els.nbExtDapY3.value = "0";
        els.nbExtDapY4.value = "0";
        updateDapExternalTotal();
        applyReferenceConvoquesToForm();
        return;
      }

      const reference = getCurrentDapReferenceForSelectedSection();
      if (reference > 0 && !editingId && toInt(els.nbConvoques.value) === 0) {
        els.nbConvoques.value = String(reference);
      }

      const selected = els.subStructure.value;

      const fields = {
        Y1: els.nbExtDapY1,
        Y2: els.nbExtDapY2,
        Y3: els.nbExtDapY3,
        Y4: els.nbExtDapY4
      };

      Object.entries(fields).forEach(([section, field]) => {
        if (!field) return;
        if (section === selected) {
          field.value = "0";
          field.disabled = true;
        } else {
          field.disabled = false;
        }
      });

      updateDapExternalTotal();
      applyReferenceConvoquesToForm();
    }

    function getSaveButtonDefaultHTML() {
      return `
        <span class="btn-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6M6 8V5h8v3z"/>
          </svg>
        </span>
        <span>Enregistrer la saisie</span>
      `;
    }

    function getSaveButtonUpdateHTML() {
      return `
        <span class="btn-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zm14.71-9.04a1.003 1.003 0 0 0 0-1.42l-2.5-2.5a1.003 1.003 0 0 0-1.42 0l-1.96 1.96 3.75 3.75 2.13-1.79z"/>
          </svg>
        </span>
        <span>Mettre à jour la sélection</span>
      `;
    }

    function setImportStatus(message, kind = "info") {
      if (!els.importStatus) return;
      const cls = kind === "error" ? "danger" : kind === "ok" ? "ok" : "muted";
      els.importStatus.textContent = message;
      els.importStatus.className = cls;
    }

    /* ========================================================= */
    /* 5. CHARGEMENT / SAUVEGARDE                                */
    /* ========================================================= */

    function loadRecords() {
      try {
        const parsed = window.MonitoringStorage?.getJSON ? window.MonitoringStorage.getJSON(STORAGE_KEY, []) : (localStorage.getItem(STORAGE_KEY) ? JSON.parse(localStorage.getItem(STORAGE_KEY)) : []);
        return Array.isArray(parsed) ? parsed.map(normalizeMonitoringRecord) : [];
      } catch {
        return [];
      }
    }

    function saveRecords() {
      if (window.MonitoringStorage?.setJSON) window.MonitoringStorage.setJSON(STORAGE_KEY, records); else localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      scheduleOnlineCollectionWrite("records", records);
    }

    function normalizeDomainValue(value) {
      const raw = String(value || "").trim().toUpperCase();
      if (!raw) return "";
      return DOMAIN_ORDER.find(domain => domain.toUpperCase() === raw) || raw;
    }

    function normalizeSubStructureValue(domain, value) {
      const raw = String(value || "").trim();
      if (!raw) return "";

      const cfg = DOMAIN_CONFIG[domain];
      if (!cfg) return raw;

      const lowered = raw.toLowerCase();
      const exact = cfg.subs.find(sub => sub.toLowerCase() === lowered);
      if (exact) return exact;

      const labelMatch = cfg.subs.find(sub => String(cfg.subsLabels?.[sub] || sub).toLowerCase() === lowered);
      return labelMatch || raw;
    }

    function normalizeImportedEvent(raw) {
      const safe = raw && typeof raw === "object" ? raw : {};
      const domain = normalizeDomainValue(safe.domain);
      const subStructure = normalizeSubStructureValue(domain, safe.subStructure || safe.publicCible);
      return {
        id: String(safe.id || uid()),
        dateExercice: parseFlexibleDateToIso(safe.dateExercice || safe.dateEvenement || ""),
        template: String(safe.template || safe.evenement || "").trim(),
        domain,
        statCom: String(safe.statCom || "").trim(),
        subStructure,
        status: String(safe.status || safe.statut || 'Planifié').trim() || 'Planifié',
        createdAt: String(safe.createdAt || new Date().toISOString())
      };
    }


    function normalizeMonitoringRecord(raw) {
      const safe = raw && typeof raw === "object" ? raw : {};
      const domain = normalizeDomainValue(safe.domain);
      const subStructure = normalizeSubStructureValue(domain, safe.subStructure);
      const grouped = !!safe.isGroupedOrganExercise;
      const groupDetails = Array.isArray(safe.groupExerciseDetails)
        ? safe.groupExerciseDetails.map(item => ({
            organe: String(item?.organe || "").trim(),
            nbConvoques: toInt(item?.nbConvoques),
            nbPresents: toInt(item?.nbPresents),
            nbMaladie: toInt(item?.nbMaladie),
            nbAccident: toInt(item?.nbAccident),
            nbArmee: toInt(item?.nbArmee),
            nbProfessionnel: toInt(item?.nbProfessionnel),
            nbPrive: toInt(item?.nbPrive),
            nbAbsents: toInt(item?.nbAbsents)
          }))
        : [];

      return {
        id: String(safe.id || uid()),
        importedEventId: safe.importedEventId ? String(safe.importedEventId) : null,
        domain,
        subStructure,
        template: String(safe.template || "").trim(),
        dateExercice: parseFlexibleDateToIso(safe.dateExercice || ""),
        statCom: String(safe.statCom || "").trim(),
        status: String(safe.status || "Planifié").trim() || "Planifié",
        nbConvoques: toInt(safe.nbConvoques),
        nbPermutation: grouped ? 0 : toInt(safe.nbPermutation),
        nbExtDapY1: grouped ? 0 : toInt(safe.nbExtDapY1),
        nbExtDapY2: grouped ? 0 : toInt(safe.nbExtDapY2),
        nbExtDapY3: grouped ? 0 : toInt(safe.nbExtDapY3),
        nbExtDapY4: grouped ? 0 : toInt(safe.nbExtDapY4),
        nbPresents: toInt(safe.nbPresents),
        nbMaladie: toInt(safe.nbMaladie),
        nbAccident: toInt(safe.nbAccident),
        nbArmee: toInt(safe.nbArmee),
        nbProfessionnel: toInt(safe.nbProfessionnel),
        nbPrive: toInt(safe.nbPrive),
        nbAbsents: toInt(safe.nbAbsents),
        aComptabiliser: !!safe.aComptabiliser,
        remarque: String(safe.remarque || "").trim(),
        mutualRoles: normalizeMutualRoles(safe.mutualRoles),
        targetExclusions: normalizeTargetExclusions(safe.targetExclusions),
        mutualRolesSeriesKey: String(safe.mutualRolesSeriesKey || getMutualizedSeriesKey(domain, String(safe.template || "")) || ""),
        isGroupedOrganExercise: grouped,
        groupExerciseDetails: groupDetails,
        createdAt: safe.createdAt ? String(safe.createdAt) : undefined,
        updatedAt: safe.updatedAt ? String(safe.updatedAt) : undefined
      };
    }

    function loadImportedEvents() {
      try {
        const parsed = window.MonitoringStorage?.getJSON ? window.MonitoringStorage.getJSON(STORAGE_KEY_IMPORTED_EVENTS, []) : (localStorage.getItem(STORAGE_KEY_IMPORTED_EVENTS) ? JSON.parse(localStorage.getItem(STORAGE_KEY_IMPORTED_EVENTS)) : []);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(normalizeImportedEvent).sort((a, b) => {
          const da = a.dateExercice || "";
          const db = b.dateExercice || "";
          if (da !== db) return db.localeCompare(da);
          return a.template.localeCompare(b.template, "fr", { sensitivity: "base" });
        });
      } catch {
        return [];
      }
    }

    function saveImportedEvents() {
      const normalized = (Array.isArray(importedEvents) ? importedEvents : [])
        .map(normalizeImportedEvent);

      const dedupedMap = new Map();
      normalized.forEach(item => {
        const key = [
          item.dateExercice || "",
          item.domain || "",
          item.subStructure || "",
          item.template || "",
          item.statCom || ""
        ].join("|");

        if (!dedupedMap.has(key)) {
          dedupedMap.set(key, item);
        }
      });

      importedEvents = [...dedupedMap.values()].sort((a, b) => {
        const da = a.dateExercice || "";
        const db = b.dateExercice || "";
        if (da !== db) return db.localeCompare(da);
        return a.template.localeCompare(b.template, "fr", { sensitivity: "base" });
      });

      if (window.MonitoringStorage?.setJSON) window.MonitoringStorage.setJSON(STORAGE_KEY_IMPORTED_EVENTS, importedEvents); else localStorage.setItem(STORAGE_KEY_IMPORTED_EVENTS, JSON.stringify(importedEvents));
      scheduleOnlineCollectionWrite("importedEvents", importedEvents);
    }

    function loadObjectives() {
      try {
        const parsed = window.MonitoringStorage?.getJSON ? window.MonitoringStorage.getJSON(STORAGE_KEY_OBJECTIVES, {}) : (localStorage.getItem(STORAGE_KEY_OBJECTIVES) ? JSON.parse(localStorage.getItem(STORAGE_KEY_OBJECTIVES)) : {});
        return { ...DEFAULT_OBJECTIVES, ...(parsed || {}) };
      } catch {
        return { ...DEFAULT_OBJECTIVES };
      }
    }

    function saveObjectives(data = objectives) {
      objectives = { ...DEFAULT_OBJECTIVES, ...(data || {}) };
      if (window.MonitoringStorage?.setJSON) window.MonitoringStorage.setJSON(STORAGE_KEY_OBJECTIVES, objectives); else localStorage.setItem(STORAGE_KEY_OBJECTIVES, JSON.stringify(objectives));
      scheduleOnlineCollectionWrite("objectives", objectives);
      return objectives;
    }

    function applyObjectivesToForm() {
      Object.keys(DEFAULT_OBJECTIVES).forEach(key => {
        if (els[key]) els[key].value = objectives[key];
      });
    }

    function getObjectivesFromForm() {
      const out = {};
      Object.keys(DEFAULT_OBJECTIVES).forEach(key => {
        out[key] = Math.max(0, parseFloat(els[key]?.value || DEFAULT_OBJECTIVES[key]) || 0);
      });
      return out;
    }

    function bindObjectiveEvents() {
      Object.keys(DEFAULT_OBJECTIVES).forEach(key => {
        if (!els[key]) return;
        const handler = () => {
          saveObjectives(getObjectivesFromForm());
          renderMonitoring();
        };
        els[key].addEventListener('input', handler);
        els[key].addEventListener('change', handler);
      });
    }


    function getImportedEventById(eventId) {
      return importedEvents.find(item => item.id === eventId) || null;
    }

    function findRecordByImportedEventId(eventId) {
      if (!eventId) return null;
      return records.find(record => record.importedEventId === eventId) || null;
    }

    function renderTemplateSuggestions() {
      if (!els.templateSuggestions) return;

      const values = new Set();
      DOMAIN_ORDER.forEach(domain => {
        (DOMAIN_CONFIG[domain]?.templates || []).forEach(item => values.add(item));
      });
      importedEvents.forEach(item => {
        if (item.template) values.add(item.template);
      });

      els.templateSuggestions.innerHTML = [...values]
        .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }))
        .map(value => `<option value="${escapeHtml(value)}"></option>`)
        .join("");
    }

    function renderImportedEventOptions(selectedId = "") {
      if (!els.eventSelect) return;

      const previous = selectedId || selectedImportedEventId || "";
      const selectedDomain = String(els.domain?.value || "").trim();
      const filteredImportedEvents = importedEvents.filter(item => {
        if (!selectedDomain) return true;
        return item.domain === selectedDomain;
      });

      els.eventSelect.innerHTML = `<option value="">Sélectionner un événement importé…</option>`;

      filteredImportedEvents.forEach(item => {
        const label = item.template || "Sans événement";

        els.eventSelect.add(new Option(label, item.id));
      });

      if (previous && filteredImportedEvents.some(item => item.id === previous)) {
        els.eventSelect.value = previous;
        selectedImportedEventId = previous;
      } else {
        els.eventSelect.value = "";
        if (!editingId) {
          selectedImportedEventId = null;
        }
      }
    }

    function updateImportedEventInfo(message = "") {
      if (!els.importedEventInfo) return;

      if (message) {
        els.importedEventInfo.textContent = message;
        return;
      }

      if (selectedImportedEventId) {
        const item = getImportedEventById(selectedImportedEventId);
        if (item) {
          els.importedEventInfo.textContent = `Événement sélectionné : ${item.template}${item.dateExercice ? ` • ${fmtDate(item.dateExercice)}` : ""}${item.domain ? ` • ${item.domain}` : ""}${item.subStructure ? ` • ${getSubLabel(item.domain, item.subStructure)}` : ""}`;
          return;
        }
      }

      els.importedEventInfo.textContent = "Sélectionne un événement importé ou active la saisie manuelle.";
    }

    function clearImportedEventSelection() {
      selectedImportedEventId = null;
      if (els.eventSelect) {
        els.eventSelect.value = "";
      }
      updateImportedEventInfo();
    }

    function populateManualEventFieldsFromImported(item) {
      if (!item) return;
      if (item.domain) {
        els.domain.value = item.domain;
        updateDomainDependentFields();
      }
      if (item.subStructure) {
        els.subStructure.value = item.subStructure;
        updateDomainDependentFields();
      }
      els.template.value = item.template || "";
      els.dateExercice.value = fmtDateInputValue(item.dateExercice || "");
      els.statCom.value = item.statCom || "";
      if (els.eventStatus) els.eventStatus.value = item.status || 'Planifié';
      updateDapSpecificUI();
      updateMutualRolesUI();
      applyReferenceConvoquesToForm(true);
      validateExerciseForm();
    }

    function selectImportedEvent(eventId) {
      const item = getImportedEventById(eventId);

      if (!item) {
        clearImportedEventSelection();
        return;
      }

      selectedImportedEventId = item.id;
      if (item.domain && els.domain.value !== item.domain) {
        els.domain.value = item.domain;
        updateDomainDependentFields();
      }
      renderImportedEventOptions(item.id);

      const existing = findRecordByImportedEventId(item.id);
      if (existing) {
        setExerciseFormRecord(existing);
        updateImportedEventInfo("Événement chargé avec sa saisie existante.");
        return;
      }

      resetExerciseForm();
      selectedImportedEventId = item.id;
      if (els.eventSelect) {
        els.eventSelect.value = item.id;
      }
      populateManualEventFieldsFromImported(item);
      updateImportedEventInfo("Événement chargé. Tu peux maintenant renseigner les présences.");
    }

    function detectCsvDelimiter(line) {
      const semicolons = (line.match(/;/g) || []).length;
      const commas = (line.match(/,/g) || []).length;
      return semicolons >= commas ? ";" : ",";
    }

    function parseCsvLine(line, delimiter) {
      const out = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        const next = line[i + 1];

        if (ch === '"') {
          if (inQuotes && next === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
          continue;
        }

        if (ch === delimiter && !inQuotes) {
          out.push(current);
          current = "";
          continue;
        }

        current += ch;
      }

      out.push(current);
      return out.map(cell => cell.trim());
    }

    function normalizeHeaderKey(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
    }

    function importAnnualEventsFromCsvText(csvText) {
      csvText = validateCsvTextForAnnualImport(csvText);
      const lines = String(csvText || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .filter(line => line.trim() !== "");

      if (lines.length < 2) {
        throw new Error("Le fichier doit contenir un en-tête et au moins une ligne.");
      }

      const delimiter = detectCsvDelimiter(lines[0]);
      const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeaderKey);

      const indexOf = variants => {
        const found = variants.find(key => headers.includes(key));
        return found ? headers.indexOf(found) : -1;
      };

      const idxDate = indexOf(["dateevenement", "date"]);
      const idxEvent = indexOf(["evenement", "event"]);
      const idxDomain = indexOf(["domaine", "domain"]);
      const idxStatCom = indexOf(["statcom", "statutcom", "statcompta"]);
      const idxSub = indexOf(["publiccible", "public", "publicvise", "publiccibler"]);

      if ([idxDate, idxEvent, idxDomain, idxStatCom, idxSub].some(idx => idx < 0)) {
        throw new Error("Colonnes attendues: Date, Événement, Domaine, Stat.Com, Public cible.");
      }

      const imported = [];
      const ignored = [];
      const duplicates = [];

      lines.slice(1).forEach((line, lineIndex) => {
        const sourceLineNumber = lineIndex + 2;
        const cells = parseCsvLine(line, delimiter);
        const candidate = normalizeImportedEvent({
          dateEvenement: cells[idxDate] || "",
          evenement: cells[idxEvent] || "",
          domain: cells[idxDomain] || "",
          statCom: cells[idxStatCom] || "",
          publicCible: cells[idxSub] || ""
        });

        const missing = [];
        if (!candidate.dateExercice) missing.push("Date");
        if (!candidate.template) missing.push("Événement");
        if (!candidate.domain) missing.push("Domaine");
        if (!candidate.subStructure) missing.push("Public cible");

        if (missing.length) {
          ignored.push(`Ligne ${sourceLineNumber}: champ(s) manquant(s) → ${missing.join(", ")}`);
          return;
        }

        imported.push({ ...candidate, __lineNumber: sourceLineNumber });
      });

      if (!imported.length) {
        const detail = ignored.length ? ` Détail: ${ignored.join(" | ")}` : "";
        throw new Error("Aucun événement importable trouvé." + detail);
      }

      const existingMap = new Map(
        importedEvents.map(item => [
          `${item.dateExercice}|${item.domain}|${item.subStructure}|${item.template}|${item.statCom}`,
          item
        ])
      );

      let addedCount = 0;

      imported.forEach(item => {
        const key = `${item.dateExercice}|${item.domain}|${item.subStructure}|${item.template}|${item.statCom}`;
        if (existingMap.has(key)) {
          duplicates.push(`Ligne ${item.__lineNumber}: doublon ignoré → ${item.dateExercice} | ${item.domain} | ${item.subStructure} | ${item.template} | ${item.statCom || "—"}`);
          return;
        }
        const clean = { ...item };
        delete clean.__lineNumber;
        existingMap.set(key, clean);
        addedCount += 1;
      });

      importedEvents = [...existingMap.values()];
      saveImportedEvents();
      renderImportedEventOptions();
      renderTemplateSuggestions();
      renderMonitoring();

      const summaryParts = [
        `${lines.length - 1} ligne(s) lue(s)`,
        `${addedCount} événement(s) ajouté(s)`,
        `${duplicates.length} doublon(s) ignoré(s)`,
        `${ignored.length} ligne(s) non prise(s) en compte`
      ];

      return {
        summary: summaryParts.join(" • "),
        duplicates,
        ignored
      };
    }

    function loadReferenceData() {
      try {
        const parsed = window.MonitoringStorage?.getJSON ? window.MonitoringStorage.getJSON(STORAGE_KEY_REFERENCES, {}) : (localStorage.getItem(STORAGE_KEY_REFERENCES) ? JSON.parse(localStorage.getItem(STORAGE_KEY_REFERENCES)) : {});
        return { ...DEFAULT_REFERENCE_DATA, ...parsed };
      } catch {
        return { ...DEFAULT_REFERENCE_DATA };
      }
    }

    function saveReferenceData(data) {
      if (window.MonitoringStorage?.setJSON) window.MonitoringStorage.setJSON(STORAGE_KEY_REFERENCES, data); else localStorage.setItem(STORAGE_KEY_REFERENCES, JSON.stringify(data));
    }

    /* ========================================================= */
    /* 6. EFFECTIFS DE RÉFÉRENCE                                 */
    /* ========================================================= */

    function formatReferencePeriodLabel(period) {
      if (!period) return "Période sans date";

      const date = period.dateEffective
        ? fmtDate(period.dateEffective)
        : "Date non définie";

      const by = period.suivi?.updatedBy
        ? ` — ${period.suivi.updatedBy}`
        : "";

      return `${date}${by}`;
    }

    function populateReferencePeriodOptions() {
      if (!els.referencePeriodSelect) return;

      els.referencePeriodSelect.innerHTML = `<option value="">Sélectionner…</option>`;

      referencePeriods.forEach(period => {
        els.referencePeriodSelect.add(
          new Option(formatReferencePeriodLabel(period), period.id)
        );
      });

      if (selectedReferencePeriodId) {
        els.referencePeriodSelect.value = selectedReferencePeriodId;
      }
    }

    function readElementNumber(element) {
      if (!element) return 0;
      return toInt(element.tagName === "INPUT" ? element.value : element.textContent);
    }

    function writeElementNumber(element, value) {
      if (!element) return;
      const next = String(toInt(value));
      if (element.tagName === "INPUT") element.value = next;
      else element.textContent = next;
    }

    const REFERENCE_UPDATE_DOMAINS = ["foba", "pr", "auto", "dps", "dap", "jsp"];
    const REFERENCE_DOMAIN_INPUT_IDS = {
      foba: ["effectifFoba1", "effectifFoba2", "effectifFoba3"],
      pr: ["effectifPrG1", "effectifPrC1", "effectifPrB1", "effectifPrB2"],
      auto: ["effectifAutoVl", "effectifAutoPl"],
      dps: ["effectifDpsG1", "effectifDpsC1", "effectifDpsB1", "effectifDpsB2"],
      dap: ["effectifDapY1", "effectifDapY2", "effectifDapY3", "effectifDapY4"],
      jsp: ["effectifJspG1", "effectifJspC1", "effectifJspB1", "effectifJspCadets"]
    };

    function getSelectedReferenceUpdateDomains() {
      const checked = Array.from(els.effectifUpdateDomains?.querySelectorAll("input[data-reference-domain]:checked") || [])
        .map(input => String(input.dataset.referenceDomain || "").trim())
        .filter(domain => REFERENCE_UPDATE_DOMAINS.includes(domain));
      return checked.length ? checked : [...REFERENCE_UPDATE_DOMAINS];
    }

    function setReferenceUpdateDomainsSelection(domains) {
      const selected = new Set(
        (Array.isArray(domains) && domains.length ? domains : REFERENCE_UPDATE_DOMAINS)
          .map(String)
          .filter(domain => REFERENCE_UPDATE_DOMAINS.includes(domain))
      );
      Array.from(els.effectifUpdateDomains?.querySelectorAll("input[data-reference-domain]") || []).forEach(input => {
        input.checked = selected.has(input.dataset.referenceDomain);
      });
    }

    function setReferenceDomainInputsEnabled() {
      const scoped = els.effectifUpdateScope?.value === "domains";
      const selected = new Set(getSelectedReferenceUpdateDomains());

      Object.entries(REFERENCE_DOMAIN_INPUT_IDS).forEach(([domain, ids]) => {
        const enabled = !scoped || selected.has(domain);
        ids.forEach(id => {
          if (!els[id]) return;
          els[id].disabled = !enabled;
          els[id].closest(".compact-field")?.classList.toggle("reference-field-disabled", !enabled);
        });
      });
    }

    async function ensurePersonnelSdisDirectoryLoaded() {
      if (personnelSdisDirectory.length) return personnelSdisDirectory;
      return loadPersonnelSdisDirectory();
    }

    async function applyResponsibleFromNip() {
      await ensurePersonnelSdisDirectoryLoaded();
      const person = findPersonnelSdisByNip(els.effectifUpdatedByNip?.value || "");
      if (!person || !els.effectifUpdatedBy) return false;
      els.effectifUpdatedBy.value = person.displayName;
      return true;
    }

    function currentUserNip() {
      const user = window.CurrentUser || window.MonitoringAuth?.user || {};
      const profile = window.MonitoringSessionManager?.getProfile?.() || {};
      return normalizePersonnelNip(user.nip || profile.nip || user.sub || profile.sub || "");
    }

    function escapeReferenceAttribute(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    function populatePersonnelSdisNipOptions() {
      const list = document.getElementById("personnelSdisNipOptions");
      if (!list) return;
      list.innerHTML = personnelSdisDirectory
        .map(person => `<option value="${escapeReferenceAttribute(person.nip)}" label="${escapeReferenceAttribute(person.displayName)}"></option>`)
        .join("");
    }

    async function autofillGeneratedBy(force = false) {
      if (!els.effectifGeneratedBy) return;
      const current = String(els.effectifGeneratedBy.value || "").trim();
      await ensurePersonnelSdisDirectoryLoaded();
      const authDisplayName = connectedUserDisplayName();
      const person = findPersonnelSdisByNip(currentUserNip()) || findPersonnelSdisByDisplayName(authDisplayName);
      const displayName = person?.displayName || authDisplayName;
      const shouldReplace =
        force ||
        !current ||
        (displayName && current === connectedUserDisplayName() && current !== displayName);
      if (!shouldReplace) return;
      if (displayName) els.effectifGeneratedBy.value = displayName;
    }

    function scheduleGeneratedByAutofill() {
      [0, 250, 800, 1600, 3000].forEach(delay => {
        setTimeout(() => {
          autofillGeneratedBy().then(() => {
            if (String(els.effectifGeneratedBy?.value || "").trim()) persistReferenceData();
          });
        }, delay);
      });
    }

    function getReferenceDataFromForm() {
      return {
        dateEffective: parseFlexibleDateToIso(els.effectifUpdatedAt?.value || ""),

        foba: {
          foba1: toInt(els.effectifFoba1?.value),
          foba2: toInt(els.effectifFoba2?.value),
          foba3: toInt(els.effectifFoba3?.value)
        },

        domaines: {
          pr: (toInt(els.effectifPrG1?.value) + toInt(els.effectifPrC1?.value) + toInt(els.effectifPrB1?.value) + toInt(els.effectifPrB2?.value)) || readElementNumber(els.effectifPrGlobal),
          prG1: toInt(els.effectifPrG1?.value),
          prC1: toInt(els.effectifPrC1?.value),
          prB1: toInt(els.effectifPrB1?.value),
          prB2: toInt(els.effectifPrB2?.value),
          autoVl: toInt(els.effectifAutoVl?.value),
          autoPl: toInt(els.effectifAutoPl?.value)
        },

        organes: {
          dpsG1: toInt(els.effectifDpsG1?.value),
          dpsC1: toInt(els.effectifDpsC1?.value),
          dpsB1: toInt(els.effectifDpsB1?.value),
          dpsB2: toInt(els.effectifDpsB2?.value),
          dapY1: toInt(els.effectifDapY1?.value),
          dapY2: toInt(els.effectifDapY2?.value),
          dapY3: toInt(els.effectifDapY3?.value),
          dapY4: toInt(els.effectifDapY4?.value),
          jspG1: toInt(els.effectifJspG1?.value),
          jspC1: toInt(els.effectifJspC1?.value),
          jspB1: toInt(els.effectifJspB1?.value),
          jspCadets: toInt(els.effectifJspCadets?.value)
        },

        suivi: {
          updatedByNip: (els.effectifUpdatedByNip?.value || "").trim(),
          updatedBy: (els.effectifUpdatedBy?.value || "").trim(),
          generatedByNip: "",
          generatedBy: (els.effectifGeneratedBy?.value || "").trim(),
          updateScope: els.effectifUpdateScope?.value === "domains" ? "domains" : "all",
          updateDomains: getSelectedReferenceUpdateDomains(),
          commentaire: (els.effectifCommentaire?.value || "").trim()
        }
      };
    }

    function applyReferenceDataToForm(period) {
      const safe = period || createEmptyReferencePeriod();

      els.effectifFoba1.value = toInt(safe.foba?.foba1);
      els.effectifFoba2.value = toInt(safe.foba?.foba2);
      els.effectifFoba3.value = toInt(safe.foba?.foba3);

      writeElementNumber(els.effectifPrGlobal, safe.domaines?.pr);
      els.effectifPrG1.value = toInt(safe.domaines?.prG1);
      els.effectifPrC1.value = toInt(safe.domaines?.prC1);
      els.effectifPrB1.value = toInt(safe.domaines?.prB1);
      els.effectifPrB2.value = toInt(safe.domaines?.prB2);
      // Mettre à jour le badge total PAPR
      {
        const subSum = toInt(safe.domaines?.prG1) + toInt(safe.domaines?.prC1) + toInt(safe.domaines?.prB1) + toInt(safe.domaines?.prB2);
        const prTotal = subSum > 0 ? subSum : toInt(safe.domaines?.pr);
        writeElementNumber(els.effectifPrGlobal, prTotal);
      }
      els.effectifAutoVl.value = toInt(safe.domaines?.autoVl);
      els.effectifAutoPl.value = toInt(safe.domaines?.autoPl);

      els.effectifDpsG1.value = toInt(safe.organes?.dpsG1);
      els.effectifDpsC1.value = toInt(safe.organes?.dpsC1);
      els.effectifDpsB1.value = toInt(safe.organes?.dpsB1);
      els.effectifDpsB2.value = toInt(safe.organes?.dpsB2);

      els.effectifDapY1.value = toInt(safe.organes?.dapY1);
      els.effectifDapY2.value = toInt(safe.organes?.dapY2);
      els.effectifDapY3.value = toInt(safe.organes?.dapY3);
      els.effectifDapY4.value = toInt(safe.organes?.dapY4);

      els.effectifJspG1.value = toInt(safe.organes?.jspG1);
      els.effectifJspC1.value = toInt(safe.organes?.jspC1);
      els.effectifJspB1.value = toInt(safe.organes?.jspB1);
      els.effectifJspCadets.value = toInt(safe.organes?.jspCadets);

      els.effectifUpdatedAt.value = fmtDateInputValue(safe.dateEffective || "");
      if (els.effectifUpdatedByNip) els.effectifUpdatedByNip.value = safe.suivi?.updatedByNip || "";
      els.effectifUpdatedBy.value = safe.suivi?.updatedBy || "";
      els.effectifGeneratedBy.value = safe.suivi?.generatedBy || "";
      if (els.effectifUpdateScope) els.effectifUpdateScope.value = safe.suivi?.updateScope === "domains" ? "domains" : "all";
      setReferenceUpdateDomainsSelection(safe.suivi?.updateDomains);
      setReferenceDomainInputsEnabled();
      autofillGeneratedBy();
      els.effectifCommentaire.value = safe.suivi?.commentaire || "";
    }

    function calculateReferenceGlobals() {
      const data = getReferenceDataFromForm();
      // PAPR: si les 4 sous-champs sont saisis, on les somme.
      // Si tous à 0 (données legacy), on conserve la valeur pr déjà chargée dans le badge.

      const fobaGlobal =
        data.foba.foba1 +
        data.foba.foba2 +
        data.foba.foba3;

      const autoGlobal =
        data.domaines.autoVl +
        data.domaines.autoPl;

      const dpsGlobal =
        data.organes.dpsG1 +
        data.organes.dpsC1 +
        data.organes.dpsB1 +
        data.organes.dpsB2;

      const dapGlobal =
        data.organes.dapY1 +
        data.organes.dapY2 +
        data.organes.dapY3 +
        data.organes.dapY4;

      const jspGlobal =
        data.organes.jspG1 +
        data.organes.jspC1 +
        data.organes.jspB1;

      const paprSubSum = data.domaines.prG1 + data.domaines.prC1 + data.domaines.prB1 + data.domaines.prB2;
      // Si au moins un sous-champ est renseigné, utiliser la somme; sinon conserver pr existant (legacy)
      const paprGlobal = paprSubSum > 0 ? paprSubSum : data.domaines.pr;
      writeElementNumber(els.effectifPrGlobal, paprGlobal);

      els.effectifFobaGlobal.value = String(fobaGlobal);
      els.effectifAutoGlobal.value = String(autoGlobal);
      els.effectifDpsGlobal.value = String(dpsGlobal);
      els.effectifDapGlobal.value = String(dapGlobal);
      els.effectifJspGlobal.value = String(jspGlobal);
    }

    function migrateLegacyReferenceDataIfNeeded() {
      if (referencePeriods.length > 0) return;

      const legacy = loadReferenceData();
      const hasLegacyData =
        legacy.effectifFoba1 ||
        legacy.effectifFoba2 ||
        legacy.effectifFoba3 ||
        legacy.effectifPrGlobal ||
        legacy.effectifAutoVl ||
        legacy.effectifAutoPl ||
        legacy.effectifDpsG1 ||
        legacy.effectifDpsC1 ||
        legacy.effectifDpsB1 ||
        legacy.effectifDpsB2 ||
        legacy.effectifDapY1 ||
        legacy.effectifDapY2 ||
        legacy.effectifDapY3 ||
        legacy.effectifDapY4 ||
        legacy.effectifJspG1 ||
        legacy.effectifJspC1 ||
        legacy.effectifJspB1 ||
        legacy.effectifJspCadets ||
        legacy.effectifUpdatedAt ||
        legacy.effectifUpdatedBy ||
        legacy.effectifCommentaire;

      if (!hasLegacyData) {
        ensureAtLeastOneReferencePeriod();
        return;
      }

      const migrated = createReferencePeriod({
        dateEffective: legacy.effectifUpdatedAt || new Date().toISOString().slice(0, 10),
        foba: {
          foba1: toInt(legacy.effectifFoba1),
          foba2: toInt(legacy.effectifFoba2),
          foba3: toInt(legacy.effectifFoba3)
        },
        domaines: {
          pr: toInt(legacy.effectifPrGlobal),
          autoVl: toInt(legacy.effectifAutoVl),
          autoPl: toInt(legacy.effectifAutoPl)
        },
        organes: {
          dpsG1: toInt(legacy.effectifDpsG1),
          dpsC1: toInt(legacy.effectifDpsC1),
          dpsB1: toInt(legacy.effectifDpsB1),
          dpsB2: toInt(legacy.effectifDpsB2),
          dapY1: toInt(legacy.effectifDapY1),
          dapY2: toInt(legacy.effectifDapY2),
          dapY3: toInt(legacy.effectifDapY3),
          dapY4: toInt(legacy.effectifDapY4),
          jspG1: toInt(legacy.effectifJspG1),
          jspC1: toInt(legacy.effectifJspC1),
          jspB1: toInt(legacy.effectifJspB1),
          jspCadets: toInt(legacy.effectifJspCadets)
        },
        suivi: {
          updatedByNip: "",
          updatedBy: legacy.effectifUpdatedBy || "",
          generatedByNip: "",
          generatedBy: connectedUserDisplayName(),
          updateScope: "all",
          updateDomains: [...REFERENCE_UPDATE_DOMAINS],
          commentaire: legacy.effectifCommentaire || "Migration ancienne structure"
        }
      });

      selectedReferencePeriodId = migrated.id;
    }

    function persistReferenceData() {
      const selected = getSelectedReferencePeriod();
      if (!selected) return null;

      const patch = getReferenceDataFromForm();
      const updated = updateReferencePeriod(selected.id, patch);

      populateReferencePeriodOptions();

      if (updated) {
        els.referencePeriodSelect.value = updated.id;
        if (els.referenceSaveStatus) {
          els.referenceSaveStatus.innerHTML = `<span class="ok">Période enregistrée automatiquement.</span>`;
        }
      } else {
        if (els.referenceSaveStatus) {
          els.referenceSaveStatus.innerHTML = `<span class="danger">Erreur lors de l’enregistrement de la période.</span>`;
        }
      }

      return updated;
    }

    function refreshReferenceData() {
      calculateReferenceGlobals();
      persistReferenceData();
      applyReferenceConvoquesToForm(true);
      renderMonitoring();
    }

    function initializeReferenceData() {
      loadPersonnelSdisDirectory().then(() => {
        populatePersonnelSdisNipOptions();
        applyResponsibleFromNip().then(applied => {
          autofillGeneratedBy();
          if (applied) refreshReferenceData();
        });
      });
      migrateLegacyReferenceDataIfNeeded();
      ensureAtLeastOneReferencePeriod();
      populateReferencePeriodOptions();

      const selected = getSelectedReferencePeriod() || referencePeriods[0] || null;
      if (selected) {
        selectedReferencePeriodId = selected.id;
      }

      applyReferenceDataToForm(selected);
      scheduleGeneratedByAutofill();
      calculateReferenceGlobals();
    }

   function handleCreateReferencePeriod() {
      const created = createReferencePeriod({
        dateEffective: "",
        foba: {},
        domaines: {},
        organes: {},
        suivi: {
          updatedByNip: "",
          updatedBy: "",
          generatedByNip: "",
          generatedBy: connectedUserDisplayName() || "",
          updateScope: "all",
          updateDomains: [...REFERENCE_UPDATE_DOMAINS],
          commentaire: ""
        }
      });

      populateReferencePeriodOptions();
      applyReferenceDataToForm(created);
      calculateReferenceGlobals();

      if (els.referenceSaveStatus) {
        els.referenceSaveStatus.innerHTML = `<span class="ok">Nouvelle période créée.</span>`;
      }
    }

    function handleDuplicateReferencePeriod() {
      const selected = getSelectedReferencePeriod();
      if (!selected) return;

      const duplicated = duplicateReferencePeriod(selected.id, {
        dateEffective: "",
        suivi: {
          updatedByNip: selected.suivi?.updatedByNip || "",
          updatedBy: selected.suivi?.updatedBy || "",
          generatedByNip: "",
          generatedBy: connectedUserDisplayName() || selected.suivi?.generatedBy || "",
          updateScope: selected.suivi?.updateScope || "domains",
          updateDomains: selected.suivi?.updateDomains || [...REFERENCE_UPDATE_DOMAINS],
          commentaire: selected.suivi?.commentaire || ""
        }
      });

      populateReferencePeriodOptions();
      applyReferenceDataToForm(duplicated);
      calculateReferenceGlobals();

      if (els.referenceSaveStatus) {
        els.referenceSaveStatus.innerHTML = `<span class="ok">Période dupliquée.</span>`;
      }
    }

    function handleDeleteReferencePeriod() {
      const selected = getSelectedReferencePeriod();
      if (!selected) return;
      if (referencePeriods.length <= 1) {
        alert("Impossible de supprimer la dernière période d’effectif.");
        return;
      }
      const label = formatReferencePeriodLabel(selected);
      if (!confirm(`Supprimer la période d’effectif « ${label} » ?`)) return;
      deleteReferencePeriod(selected.id);
      ensureAtLeastOneReferencePeriod();
      populateReferencePeriodOptions();
      const next = getSelectedReferencePeriod() || referencePeriods[0] || null;
      if (next) {
        selectedReferencePeriodId = next.id;
        applyReferenceDataToForm(next);
      }
      calculateReferenceGlobals();
      applyReferenceConvoquesToForm(true);
      if (els.referenceSaveStatus) {
        els.referenceSaveStatus.innerHTML = `<span class="ok">Période supprimée.</span>`;
      }
      renderMonitoring();
    }

    function bindReferenceEvents() {
      const ids = [
        "effectifFoba1",
        "effectifFoba2",
        "effectifFoba3",
        "effectifPrG1",
        "effectifPrC1",
        "effectifPrB1",
        "effectifPrB2",
        "effectifAutoVl",
        "effectifAutoPl",
        "effectifDpsG1",
        "effectifDpsC1",
        "effectifDpsB1",
        "effectifDpsB2",
        "effectifDapY1",
        "effectifDapY2",
        "effectifDapY3",
        "effectifDapY4",
        "effectifJspG1",
        "effectifJspC1",
        "effectifJspB1",
        "effectifJspCadets",
        "effectifUpdatedAt",
        "effectifUpdatedByNip",
        "effectifUpdatedBy",
        "effectifGeneratedBy",
        "effectifUpdateScope",
        "effectifCommentaire"
      ];

      ids.forEach(id => {
        if (!els[id]) return;
        const handler = () => {
          if (id === "effectifUpdatedByNip") applyResponsibleFromNip().then(applied => { if (applied) refreshReferenceData(); });
          if (id === "effectifUpdateScope") setReferenceDomainInputsEnabled();
          refreshReferenceData();
        };
        els[id].addEventListener("input", handler);
        els[id].addEventListener("change", handler);
      });

      Array.from(els.effectifUpdateDomains?.querySelectorAll("input[data-reference-domain]") || []).forEach(input => {
        input.addEventListener("change", () => {
          setReferenceDomainInputsEnabled();
          refreshReferenceData();
        });
      });

      document.addEventListener("monitoring-f7-auth-session-changed", () => {
        autofillGeneratedBy(true);
        refreshReferenceData();
      });

      if (els.saveReferencePeriodBtn) {
        els.saveReferencePeriodBtn.addEventListener("click", () => {
          refreshReferenceData();
          if (els.referenceSaveStatus) {
            els.referenceSaveStatus.innerHTML = `<span class="ok">Période enregistrée.</span>`;
          }
        });
      }

      if (els.referencePeriodSelect) {
        els.referencePeriodSelect.addEventListener("change", () => {
          setSelectedReferencePeriod(els.referencePeriodSelect.value);
          const selected = getSelectedReferencePeriod();
          applyReferenceDataToForm(selected);
          calculateReferenceGlobals();
          applyReferenceConvoquesToForm(true);
          renderMonitoring();
        });
      }

      if (els.createReferencePeriodBtn) {
        els.createReferencePeriodBtn.addEventListener("click", handleCreateReferencePeriod);
      }

      if (els.duplicateReferencePeriodBtn) {
        els.duplicateReferencePeriodBtn.addEventListener("click", handleDuplicateReferencePeriod);
      }

      if (els.deleteReferencePeriodBtn) {
        els.deleteReferencePeriodBtn.addEventListener("click", handleDeleteReferencePeriod);
      }
    }

    /* ========================================================= */
    /* 7. GESTION FORMULAIRE EXERCICE                            */
    /* ========================================================= */

    function sumExcuses(recordOrForm) {
      return (
        toInt(recordOrForm.nbMaladie) +
        toInt(recordOrForm.nbAccident) +
        toInt(recordOrForm.nbArmee) +
        toInt(recordOrForm.nbProfessionnel) +
        toInt(recordOrForm.nbPrive)
      );
    }

    function detailTotal() {
      return (
        toInt(els.nbPresents.value) +
        toInt(els.nbMaladie.value) +
        toInt(els.nbAccident.value) +
        toInt(els.nbArmee.value) +
        toInt(els.nbProfessionnel.value) +
        toInt(els.nbPrive.value) +
        toInt(els.nbAbsents.value)
      );
    }

    function validateExerciseForm() {
  const total = detailTotal();
  const totalExcuses =
    toInt(els.nbMaladie.value) +
    toInt(els.nbAccident.value) +
    toInt(els.nbArmee.value) +
    toInt(els.nbProfessionnel.value) +
    toInt(els.nbPrive.value);

  const conv = toInt(els.nbConvoques.value);
  const permutation = toInt(els.nbPermutation?.value);
  const extTotal = getDapExternalTotal();

  els.detailTotal.value = String(total);
  els.totalExcuses.value = String(totalExcuses);
  updateTargetVisibilitySummary();

  if (!els.domain.value) {
    els.validationMessage.innerHTML = `<span class="danger">Domaine obligatoire.</span>`;
    return false;
  }
  if (!els.subStructure.value) {
    els.validationMessage.innerHTML = `<span class="danger">Public cible obligatoire.</span>`;
    return false;
  }
  if (!els.template.value.trim()) {
    els.validationMessage.innerHTML = `<span class="danger">Événement obligatoire.</span>`;
    return false;
  }
  if (!els.dateExercice.value) {
    els.validationMessage.innerHTML = `<span class="danger">Date obligatoire.</span>`;
    return false;
  }


  const status = String(els.eventStatus?.value || "Planifié");
  const isPlanifie = status === "Planifié";
  const isAnnule = status === "Annulé";
  const isReporte = status === "Reporté";

  if (isAnnule || isReporte) {
    els.aComptabiliser.value = "false";
    els.validationMessage.innerHTML = isAnnule
      ? `<span class="ok">Exercice annulé : aucun contrôle de présence appliqué.</span>`
      : `<span class="ok">Exercice reporté : aucun contrôle de présence appliqué.</span>`;
    return true;
  }

  if (isGroupedOrganExercise(els.domain.value, els.template.value)) {
    const details = getCurrentGroupExerciseDetailsFromUI();
    for (const item of details) {
      const totalItem =
        toInt(item.nbPresents) +
        toInt(item.nbMaladie) +
        toInt(item.nbAccident) +
        toInt(item.nbArmee) +
        toInt(item.nbProfessionnel) +
        toInt(item.nbPrive) +
        toInt(item.nbAbsents);
      if (totalItem > toInt(item.nbConvoques)) {
        els.validationMessage.innerHTML = `<span class="danger">Incohérence ${item.organe} : le total détaillé ne peut pas dépasser les convoqués.</span>`;
        return false;
      }
    }
    els.validationMessage.innerHTML = isPlanifie
      ? `<span class="ok">Planification correcte.</span>`
      : `<span class="ok">Cohérence correcte.</span>`;
    return true;
  }

  if (isDAPSelection()) {
    const expectedTotal = conv + extTotal;
    const totalWithPermutation = total + permutation;

    if (permutation > conv) {
      els.validationMessage.innerHTML = `<span class="danger">Incohérence : la permutation (${permutation}) ne peut pas dépasser les convoqués de la section (${conv}).</span>`;
      return false;
    }
    if (totalWithPermutation > expectedTotal) {
      els.validationMessage.innerHTML = `<span class="danger">Incohérence DAP : total détaillé + permutation (${totalWithPermutation}) ne peut pas être supérieur aux convoqués + extérieurs (${expectedTotal}).</span>`;
      return false;
    }
    if (!isPlanifie && totalWithPermutation !== expectedTotal) {
      els.validationMessage.innerHTML = `<span class="danger">Incohérence DAP : détail + permutation ${totalWithPermutation} ≠ convoqués + extérieurs ${expectedTotal}.</span>`;
      return false;
    }
  } else {
    if (total > conv) {
      els.validationMessage.innerHTML = `<span class="danger">Incohérence : le total détaillé (${total}) ne peut pas être supérieur aux convoqués (${conv}).</span>`;
      return false;
    }
    if (!isPlanifie && total !== conv) {
      els.validationMessage.innerHTML = `<span class="danger">Incohérence : détail ${total} ≠ convoqués ${conv}.</span>`;
      return false;
    }
  }

  els.validationMessage.innerHTML = isPlanifie
    ? `<span class="ok">Planification correcte.</span>`
    : `<span class="ok">Cohérence correcte.</span>`;
  return true;
}

    function resetExerciseForm() {
      editingId = null;

      els.domain.value = "";
      els.subStructure.innerHTML = `<option value="">Sélectionner…</option>`;
      if (els.templateSuggestions) {
        els.templateSuggestions.innerHTML = "";
      }
      els.template.value = "";
      els.dateExercice.value = "";
      els.statCom.value = "";
      if (els.eventStatus) els.eventStatus.value = 'Planifié';
      clearImportedEventSelection();

      [
        "nbConvoques",
        "nbPresents",
        "nbMaladie",
        "nbAccident",
        "nbArmee",
        "nbProfessionnel",
        "nbPrive",
        "nbAbsents",
        "nbPermutation",
        "nbExtDapY1",
        "nbExtDapY2",
        "nbExtDapY3",
        "nbExtDapY4"
      ].forEach(id => {
        els[id].value = 0;
      });

      updateDapExternalTotal();
      updateDapSpecificUI();

      els.aComptabiliser.value = "false";
      els.remarque.value = "";
      els.detailTotal.value = "0";
      els.totalExcuses.value = "0";
      els.saveBtn.innerHTML = getSaveButtonDefaultHTML();
      if (els.groupExerciseBlock) {
        els.groupExerciseBlock.style.display = "none";
      }
      if (els.groupExerciseTableBody) {
        els.groupExerciseTableBody.innerHTML = "";
      }
      if (els.groupGlobalConvoques) els.groupGlobalConvoques.textContent = "0";
      if (els.groupGlobalPresents) els.groupGlobalPresents.textContent = "0";
      if (els.groupGlobalRate) els.groupGlobalRate.textContent = "0.0%";
      applyMutualRolesToForm(createDefaultMutualRoles());
      applyTargetExclusionsToForm(createDefaultTargetExclusions());
      updateMutualRolesUI();
      renderTemplateSuggestions();
      els.validationMessage.innerHTML = "Prêt à enregistrer.";
      updateTargetVisibilitySummary();
    }

    function getExerciseFormRecord() {
      const grouped = isGroupedOrganExercise(els.domain.value, els.template.value);
      const linkedImportedEventId = selectedImportedEventId || null;
      const existingLinkedRecord = !editingId && linkedImportedEventId
        ? findRecordByImportedEventId(linkedImportedEventId)
        : null;

      return {
        id: existingLinkedRecord?.id || editingId || uid(),
        importedEventId: linkedImportedEventId,
        domain: els.domain.value,
        subStructure: els.subStructure.value,
        template: els.template.value.trim(),
        dateExercice: els.dateExercice.value,
        statCom: (els.statCom.value || "").trim(),
        status: els.eventStatus?.value || 'Planifié',
        nbConvoques: toInt(els.nbConvoques.value),
        nbPermutation: grouped ? 0 : toInt(els.nbPermutation.value),
        nbExtDapY1: grouped ? 0 : toInt(els.nbExtDapY1.value),
        nbExtDapY2: grouped ? 0 : toInt(els.nbExtDapY2.value),
        nbExtDapY3: grouped ? 0 : toInt(els.nbExtDapY3.value),
        nbExtDapY4: grouped ? 0 : toInt(els.nbExtDapY4.value),
        nbPresents: toInt(els.nbPresents.value),
        nbMaladie: toInt(els.nbMaladie.value),
        nbAccident: toInt(els.nbAccident.value),
        nbArmee: toInt(els.nbArmee.value),
        nbProfessionnel: toInt(els.nbProfessionnel.value),
        nbPrive: toInt(els.nbPrive.value),
        nbAbsents: toInt(els.nbAbsents.value),
        aComptabiliser: els.aComptabiliser.value === "true",
        remarque: els.remarque.value.trim(),
        mutualRoles: getMutualRolesFromForm(),
        targetExclusions: getTargetExclusionsFromForm(),
        mutualRolesSeriesKey: getMutualizedSeriesKey(els.domain.value, els.template.value),
        isGroupedOrganExercise: grouped,
        groupExerciseDetails: grouped ? getCurrentGroupExerciseDetailsFromUI() : [],
        createdAt: existingLinkedRecord?.createdAt || (editingId ? undefined : new Date().toISOString()),
        updatedAt: new Date().toISOString()
      };
    }

    function setExerciseFormRecord(record) {
      editingId = record.id;
      selectedImportedEventId = record.importedEventId || null;

      els.domain.value = record.domain;
      updateDomainDependentFields();

      els.subStructure.value = record.subStructure;
      updateDomainDependentFields();

      els.template.value = record.template || "";
      els.dateExercice.value = fmtDateInputValue(record.dateExercice || "");
      els.statCom.value = record.statCom || "";
      if (els.eventStatus) els.eventStatus.value = record.status || 'Planifié';
      els.nbConvoques.value = record.nbConvoques;
      els.nbPermutation.value = record.nbPermutation || 0;
      els.nbExtDapY1.value = record.nbExtDapY1 || 0;
      els.nbExtDapY2.value = record.nbExtDapY2 || 0;
      els.nbExtDapY3.value = record.nbExtDapY3 || 0;
      els.nbExtDapY4.value = record.nbExtDapY4 || 0;
      updateDapExternalTotal();
      updateDapSpecificUI();
      els.nbPresents.value = record.nbPresents;
      els.nbMaladie.value = toInt(record.nbMaladie);
      els.nbAccident.value = toInt(record.nbAccident);
      els.nbArmee.value = record.nbArmee || 0;
      els.nbProfessionnel.value = record.nbProfessionnel;
      els.nbPrive.value = record.nbPrive;
      els.nbAbsents.value = record.nbAbsents;
      els.aComptabiliser.value = String(record.aComptabiliser);
      els.remarque.value = record.remarque || "";
      applyMutualRolesToForm(record.mutualRoles || createDefaultMutualRoles());
      applyTargetExclusionsToForm(record.targetExclusions || createDefaultTargetExclusions());
      updateMutualRolesUI();
      els.saveBtn.innerHTML = getSaveButtonUpdateHTML();

      renderImportedEventOptions(selectedImportedEventId || "");
      updateImportedEventInfo();

      if (record.isGroupedOrganExercise && Array.isArray(record.groupExerciseDetails) && record.groupExerciseDetails.length) {
        updateGroupedExerciseUI(record.groupExerciseDetails);
      } else if (els.groupExerciseBlock) {
        els.groupExerciseBlock.style.display = "none";
      }

      validateExerciseForm();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    /* ========================================================= */
    /* 8. DOMAINES / LISTES DÉPENDANTES                          */
    /* ========================================================= */

    function populateDomainOptions() {
      els.domain.innerHTML = `<option value="">Sélectionner…</option>`;
      els.filterDomain.innerHTML = `<option value="">Tous</option>`;

      DOMAIN_ORDER.forEach(domain => {
        els.domain.add(new Option(domain, domain));
        els.filterDomain.add(new Option(domain, domain));
      });

      els.subStructure.innerHTML = `<option value="">Sélectionner…</option>`;
      els.template.value = "";
      if (els.templateSuggestions) {
        els.templateSuggestions.innerHTML = "";
      }

      updateFilterSubOptions();
    }

    function updateDomainDependentFields() {
      const domain = els.domain.value;

      if (!domain || !DOMAIN_CONFIG[domain]) {
        els.subStructure.innerHTML = `<option value="">Sélectionner…</option>`;
        if (els.templateSuggestions) {
          els.templateSuggestions.innerHTML = "";
        }
        updateMutualRolesUI();
        return;
      }

      const cfg = DOMAIN_CONFIG[domain];
      const previousSub = els.subStructure.value;
      const previousTemplate = els.template.value;

      els.subStructure.innerHTML = `<option value="">Sélectionner…</option>`;
      cfg.subs.forEach(sub => {
        els.subStructure.add(new Option(cfg.subsLabels?.[sub] || sub, sub));
      });

      if (cfg.subs.includes(previousSub)) {
        els.subStructure.value = previousSub;
      }

      const selectedPublic = els.subStructure.value;
      let templates = [...cfg.templates];

      if (domain === "FOBA" && selectedPublic === "FOBA 3") {
        templates = ["Exercice FOBA 1", "Exercice FOBA 2", "Exercice FOBA 3"];
      }

      if (domain === "AUTO") {
        if (selectedPublic === "Cond VL" || selectedPublic === "Cond VL DPS") {
          templates = [
            "Exercice Car 1.1",
            "Exercice Car 1.2",
            "Exercice Car 1.3",
            "Exercice Car 1.4",
            "Exercice Car 1.5"
          ];
        } else if (selectedPublic === "Cond PL") {
          templates = [
            "Exercice Truck 1.1",
            "Exercice Truck 1.2",
            "Exercice Truck 1.3",
            "Exercice Truck 1.4"
          ];
        }
      }

      importedEvents
        .filter(item =>
          item.domain === domain &&
          (!selectedPublic || item.subStructure === selectedPublic)
        )
        .forEach(item => {
          if (item.template) templates.push(item.template);
        });

      const uniqueTemplates = [...new Set(templates)];

      if (els.templateSuggestions) {
        els.templateSuggestions.innerHTML = uniqueTemplates
          .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }))
          .map(template => `<option value="${escapeHtml(template)}"></option>`)
          .join("");
      }

      els.template.value = previousTemplate || els.template.value || "";
      updateDapSpecificUI();
      updateMutualRolesUI();
      applyReferenceConvoquesToForm();
    }

    function updateFilterSubOptions() {
      const selectedDomain = els.filterDomain.value;
      const domains = selectedDomain ? [selectedDomain] : DOMAIN_ORDER;

      els.filterSub.innerHTML = `<option value="">Tous</option>`;

      const subs = [];
      domains.forEach(domain => {
        DOMAIN_CONFIG[domain].subs.forEach(sub => subs.push(sub));
      });

      [...new Set(subs)].forEach(sub => {
        let label = sub;

        for (const domain of domains) {
          const cfg = DOMAIN_CONFIG[domain];
          if (cfg?.subs.includes(sub)) {
            label = cfg?.subsLabels?.[sub] || sub;
            break;
          }
        }

        els.filterSub.add(new Option(label, sub));
      });
    }

    /* ========================================================= */
    /* 9. CALCULS / STATISTIQUES                                 */
    /* ========================================================= */

    function normalizeIsoDate(value) {
      if (!value) return "";
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      return d.toISOString().slice(0, 10);
    }

    function getReferencePeriodForDate(dateValue) {
      const targetDate = normalizeIsoDate(dateValue);
      const periods = getSafeReferencePeriods();

      if (!targetDate || !periods.length) return null;

      const sorted = [...periods]
        .filter(period => normalizeIsoDate(period.dateEffective))
        .sort((a, b) => normalizeIsoDate(a.dateEffective).localeCompare(normalizeIsoDate(b.dateEffective)));

      let matched = null;

      sorted.forEach(period => {
        const periodDate = normalizeIsoDate(period.dateEffective);
        if (periodDate && periodDate <= targetDate) {
          matched = period;
        }
      });

      return matched || sorted[0] || null;
    }

    function getReferenceSnapshotForDate(dateValue) {
      const period = getReferencePeriodForDate(dateValue);

      if (!period) {
        return {
          foba: { foba1: 0, foba2: 0, foba3: 0 },
          domaines: { pr: 0, autoVl: 0, autoPl: 0 },
          organes: {
            dpsG1: 0, dpsC1: 0, dpsB1: 0, dpsB2: 0,
            dapY1: 0, dapY2: 0, dapY3: 0, dapY4: 0,
            jspG1: 0, jspC1: 0, jspB1: 0, jspCadets: 0
          }
        };
      }

      return {
        foba: {
          foba1: toInt(period.foba?.foba1),
          foba2: toInt(period.foba?.foba2),
          foba3: toInt(period.foba?.foba3)
        },
        domaines: {
          pr: toInt(period.domaines?.pr),
          autoVl: toInt(period.domaines?.autoVl),
          autoPl: toInt(period.domaines?.autoPl)
        },
        organes: {
          dpsG1: toInt(period.organes?.dpsG1),
          dpsC1: toInt(period.organes?.dpsC1),
          dpsB1: toInt(period.organes?.dpsB1),
          dpsB2: toInt(period.organes?.dpsB2),
          dapY1: toInt(period.organes?.dapY1),
          dapY2: toInt(period.organes?.dapY2),
          dapY3: toInt(period.organes?.dapY3),
          dapY4: toInt(period.organes?.dapY4),
          jspG1: toInt(period.organes?.jspG1),
          jspC1: toInt(period.organes?.jspC1),
          jspB1: toInt(period.organes?.jspB1),
          jspCadets: toInt(period.organes?.jspCadets)
        }
      };
    }

    function getReferenceLabelForRecord(record) {
      const period = getReferencePeriodForDate(record?.dateExercice);
      return period?.dateEffective ? fmtDate(period.dateEffective) : "—";
    }

    function getSortComparableValue(record, key) {
      switch (key) {
        case "dateExercice": return String(record.dateExercice || "");
        case "domain": return String(record.domain || "");
        case "subStructure": return String(getSubLabel(record.domain, record.subStructure) || record.subStructure || "");
        case "template": return String(record.template || "");
        case "statCom": return String(record.statCom || "");
        case "status": return String(record.status || "");
        case "aComptabiliser": return record.aComptabiliser ? "1" : "0";
        default: return String(record[key] || "");
      }
    }

    function applyRecordsSort(rows) {
      const state = recordsSortState || { key: "dateExercice", direction: "asc" };
      const sorted = [...rows].sort((a, b) => {
        const av = getSortComparableValue(a, state.key);
        const bv = getSortComparableValue(b, state.key);
        const cmp = av.localeCompare(bv, 'fr', { numeric: true, sensitivity: 'base' });
        return state.direction === 'asc' ? cmp : -cmp;
      });
      return sorted;
    }

    function updateRecordsSortHeaders() {
      document.querySelectorAll('#recordsTable thead th.sortable-header').forEach(th => {
        th.classList.remove('sort-asc','sort-desc');
        if (th.dataset.sort === recordsSortState.key) {
          th.classList.add(recordsSortState.direction === 'asc' ? 'sort-asc' : 'sort-desc');
        }
      });
    }

    function bindRecordsSortHeaders() {
      document.querySelectorAll('#recordsTable thead th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
          const key = th.dataset.sort;
          if (recordsSortState.key === key) {
            recordsSortState.direction = recordsSortState.direction === 'asc' ? 'desc' : 'asc';
          } else {
            recordsSortState.key = key;
            recordsSortState.direction = key === 'dateExercice' ? 'asc' : 'asc';
          }
          updateRecordsSortHeaders();
          renderMonitoring();
        });
      });
      updateRecordsSortHeaders();
    }

    function filteredRecords() {
      let out = getDisplayRows();

      const fd = els.filterDomain?.value || "";
      const fs = els.filterSub?.value || "";
      const fc = els.filterCompta?.value || "";

      if (fd) out = out.filter(record => record.domain === fd);
      if (fs) out = out.filter(record => record.subStructure === fs);
      if (fc) out = out.filter(record => String(record.aComptabiliser) === fc);

      const q = String(els.recordsSearch?.value || "").trim().toLowerCase();
      if (q) {
        out = out.filter(record => {
          const haystack = [
            record.domain,
            getSubLabel(record.domain, record.subStructure),
            record.subStructure,
            record.template,
            record.statCom,
            record.status,
            record.remarque,
            fmtDate(record.dateExercice)
          ].join(" ").toLowerCase();
          return haystack.includes(q);
        });
      }

      return applyRecordsSort(out);
    }

    function getEffectiveConvoques(record, trainerDeductionMap = null) {
    const baseConvoques = record?.domain === "DAP"
      ? (
          toInt(record?.nbConvoques) +
          toInt(record?.nbExtDapY1) +
          toInt(record?.nbExtDapY2) +
          toInt(record?.nbExtDapY3) +
          toInt(record?.nbExtDapY4)
        )
      : toInt(record?.nbConvoques);

    const trainerDeduction = getTrainerTargetDeduction(record, trainerDeductionMap);
    return Math.max(0, baseConvoques - trainerDeduction);
  }

      function summarizeRecords(input) {
  const source = Array.isArray(input) ? input : [];
  const compta = source.filter(record => record.aComptabiliser);
  const nonComptabilises = source.length - compta.length;
  const mutualAllocationMap = buildMutualizedRoleAllocation();
  const trainerDeductionMap = buildTrainerTargetDeductionAllocationMap();

  const uniqueDomains = [...new Set(compta.map(record => record?.domain).filter(Boolean))];
  const summaryDomain = uniqueDomains.length === 1 ? uniqueDomains[0] : "";

  const total = compta.reduce((acc, record) => {
    acc.exercices += 1;
    acc.convoques += getEffectiveConvoques(record, trainerDeductionMap);
    acc.presents += getEffectivePresents(record, mutualAllocationMap);
    acc.metierPresents += getPresenceRateNumerator(record);
    acc.excuses += sumExcuses(record);
    acc.absents += toInt(record.nbAbsents);
    acc.permutations += toInt(record.nbPermutation);
    return acc;
  }, {
    exercices: 0,
    nonComptabilises,
    convoques: 0,
    presents: 0,
    metierPresents: 0,
    excuses: 0,
    absents: 0,
    permutations: 0,
    tauxBrut: 0,
    tauxAjuste: 0,
    tauxAbsenceNonExcusee: 0,
    tauxExcuses: 0
  });

  const rawTauxBrut = total.convoques > 0
    ? (100 * total.metierPresents / total.convoques)
    : 0;

  const rawTauxAjuste = (total.convoques - total.excuses) > 0
    ? (100 * total.metierPresents / (total.convoques - total.excuses))
    : 0;

  total.tauxBrut = summaryDomain
    ? capRateForDomain(summaryDomain, rawTauxBrut)
    : rawTauxBrut;

  total.tauxAjuste = summaryDomain
    ? capRateForDomain(summaryDomain, rawTauxAjuste)
    : rawTauxAjuste;

  total.tauxAbsenceNonExcusee = total.convoques > 0
    ? (100 * total.absents / total.convoques)
    : 0;

  total.tauxExcuses = total.convoques > 0
    ? (100 * total.excuses / total.convoques)
    : 0;

  return total;
}

    /* ===== v47 : ANALYSE MULTI-SESSIONS (série) ===== */
    
function getSeriesAnalysis(seriesKey) {
  if (!seriesKey) return null;
  const mutualAllocationMap = buildMutualizedRoleAllocation();
  const trainerDeductionMap = buildTrainerTargetDeductionAllocationMap();
  const sessions = getDisplayRows()
    .filter(r => r.aComptabiliser && getMutualizedSeriesKey(r.domain, r.template) === seriesKey)
    .sort((a, b) => String(a.dateExercice || '').localeCompare(String(b.dateExercice || '')));
  if (!sessions.length) return null;

  // Domaine de la série — déclaré UNE SEULE FOIS ici pour le plafonnement
  const seriesDomain = sessions[0]?.domain || '';

  // ── Couche 1 : métriques par session (avec plafonnement intégré) ────────────
  const mappedSessions = sessions.map(r => {
    const brute = r.domain === 'DAP'
      ? (toInt(r.nbConvoques) + toInt(r.nbExtDapY1) + toInt(r.nbExtDapY2) + toInt(r.nbExtDapY3) + toInt(r.nbExtDapY4))
      : toInt(r.nbConvoques);
    const breakdown = getTargetDeductionBreakdown(r, trainerDeductionMap);
    const nette = Math.max(0, brute - breakdown.total);
    const presents = getEffectivePresents(r, mutualAllocationMap);
    const metierPresents = getSessionMetierPresents(r);
    const supportPresent = getSessionSupportPresence(r);
    const dispensesVisual = getDispensesVisualCount(r);
    // Plafonnement appliqué directement : pas de 2e passe sur mapped
    const rawTaux = nette > 0 ? (100 * metierPresents / nette) : 0;
    const rawTauxCompte = nette > 0 ? (100 * presents / nette) : 0;
    const taux = capRateForDomain(seriesDomain, rawTaux);
    const tauxCompte = capRateForDomain(seriesDomain, rawTauxCompte);
    return {
      id: r.id, date: r.dateExercice, template: r.template,
      domain: r.domain || seriesDomain,
      brute, ded: breakdown.total,
      dedFormateurs: breakdown.totalFormateurs,
      dedDispenses: breakdown.totalDispenses,
      dispensesVisual, nette, presents, metierPresents, supportPresent,
      excuses: sumExcuses(r), absents: toInt(r.nbAbsents),
      taux, tauxCompte
    };
  });

  // ── Couche 2 : agrégats série ────────────────────────────────────────────────
  const referenceTarget = getSeriesReferenceTarget(sessions);
  const hasReferenceTarget = referenceTarget > 0;

  const uniqueSupport = getSeriesUniqueSupportCounts(sessions);
  const formateursUniquesRetires = uniqueSupport.formateurs;
  const dispensesVisuels = uniqueSupport.dispenses;
  const dispensesRellementDeduits = uniqueSupport.dispenses > 0 ? uniqueSupport.dispenses : 0;

  // Référence nette unique : métrique INFORMATIVE uniquement, ne sert PAS de dénominateur
  const refNetteUnique = hasReferenceTarget ? Math.max(0, referenceTarget - uniqueSupport.total) : null;

  // Cible nette cumulée des sessions = DÉNOMINATEUR PRINCIPAL des taux de série
  const totalNette = mappedSessions.reduce((a, s) => a + s.nette, 0);
  const avgNette = sessions.length > 0 ? totalNette / sessions.length : 0;

  const totalPresents = mappedSessions.reduce((a, s) => a + s.presents, 0);
  const totalMetierPresents = mappedSessions.reduce((a, s) => a + s.metierPresents, 0);
  const totalSupportCumule = mappedSessions.reduce((a, s) => a + s.supportPresent, 0);
  const totalExcuses = mappedSessions.reduce((a, s) => a + s.excuses, 0);
  const totalAbsents = mappedSessions.reduce((a, s) => a + s.absents, 0);

  // ── Taux de série sur cible nette CUMULÉE ────────────────────────────────────
  // tauxMetierSerie = min(présents métier, cible nette cumulée) / cible nette cumulée × 100
  // tauxCompteSerie = présents comptés / cible nette cumulée × 100 (peut dépasser 100 %)
  const tauxMetierSerie = totalNette > 0
    ? capRateForDomain(seriesDomain, (100 * Math.min(totalMetierPresents, totalNette) / totalNette))
    : null;
  const tauxCompteSerie = totalNette > 0
    ? capRateForDomain(seriesDomain, (100 * totalPresents / totalNette))
    : null;

  // ── Couverture unique plafonnée (lecture commandement complémentaire) ─────────
  const couvertureUniquePlafonnee = (refNetteUnique != null && refNetteUnique > 0)
    ? (100 * Math.min(totalMetierPresents, refNetteUnique) / refNetteUnique)
    : null;

  const coverageGap = totalNette > 0 ? Math.max(0, totalNette - totalMetierPresents) : null;

  return {
    seriesKey,
    sessionCount: sessions.length,
    referenceTarget,
    referenceTargetText: hasReferenceTarget ? String(referenceTarget) : 'non renseignée',
    hasReferenceTarget,
    uniqueSupport,
    formateursUniquesRetires,
    dispensesVisuels,
    dispensesRellementDeduits,
    refNetteUnique,
    totalNette,
    avgNette,
    totalPresents,
    totalMetierPresents,
    totalSupportCumule,
    totalExcuses,
    totalAbsents,
    tauxMetierSerie,
    tauxCompteSerie,
    couvertureUniquePlafonnee,
    coverageGap,
    // Compat backward
    seriesTarget: refNetteUnique,
    globalTaux: tauxMetierSerie,
    globalCountedTaux: tauxCompteSerie,
    cappedMetier: totalNette > 0 ? Math.min(totalMetierPresents, totalNette) : null,
    cappedCounted: totalPresents,
    sessions: mappedSessions
  };
}


    function getParticipationUtileForCoverage(record, mutualAllocationMap = null) {
      if (!record) return 0;

      const metierPresents = getPresenceRateNumerator(record);

      if (record.domain === "DAP") {
        return metierPresents + toInt(record.nbPermutation);
      }

      return metierPresents;
    }

    function summarizeCoverageByDomain(rows) {
      const result = {};

      DOMAIN_ORDER.forEach(domain => {
        result[domain] = {
          domain,
          exercices: 0,
          effectifReferenceCumule: 0,
          participationUtile: 0,
          excuses: 0,
          absents: 0,
          tauxCouverture: 0
        };
      });

      const mutualAllocationMap = buildMutualizedRoleAllocation();
      const trainerDeductionMap = buildTrainerTargetDeductionAllocationMap();

      rows
        .filter(record => record.aComptabiliser)
        .forEach(record => {
          if (!result[record.domain]) return;

          const refValue = getEffectiveConvoques(record, trainerDeductionMap);
          const participationUtile = getParticipationUtileForCoverage(record, mutualAllocationMap);

          result[record.domain].exercices += 1;
          result[record.domain].effectifReferenceCumule += refValue;
          result[record.domain].participationUtile += participationUtile;
          result[record.domain].excuses += sumExcuses(record);
          result[record.domain].absents += toInt(record.nbAbsents);
        });

      DOMAIN_ORDER.forEach(domain => {
        const item = result[domain];
        item.tauxCouverture = item.effectifReferenceCumule > 0
          ? (100 * item.participationUtile / item.effectifReferenceCumule)
          : 0;
      });

      return result;
    }

    function renderCoverageDomainTable(rows) {
      if (!els.coverageDomainTableBody) return;

      const summary = summarizeCoverageByDomain(rows);
      els.coverageDomainTableBody.innerHTML = "";

      DOMAIN_ORDER.forEach(domain => {
        const item = summary[domain];
        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td><strong>${item.domain}</strong></td>
          <td class="right">${item.exercices}</td>
          <td class="right">${item.effectifReferenceCumule}</td>
          <td class="right">${item.participationUtile}</td>
          <td class="right">${item.excuses}</td>
          <td class="right">${item.absents}</td>
          <td class="right">${fmtPercent(item.tauxCouverture)}</td>
        `;

        els.coverageDomainTableBody.appendChild(tr);
      });

      const total = DOMAIN_ORDER.reduce((acc, domain) => {
        const item = summary[domain];
        acc.exercices += item.exercices;
        acc.effectifReferenceCumule += item.effectifReferenceCumule;
        acc.participationUtile += item.participationUtile;
        acc.excuses += item.excuses;
        acc.absents += item.absents;
        return acc;
      }, {
        exercices: 0,
        effectifReferenceCumule: 0,
        participationUtile: 0,
        excuses: 0,
        absents: 0
      });

      const tauxCouverture = total.effectifReferenceCumule > 0
        ? (100 * total.participationUtile / total.effectifReferenceCumule)
        : 0;

      const trTotal = document.createElement("tr");
      trTotal.innerHTML = `
        <td><strong>Global total</strong></td>
        <td class="right"><strong>${total.exercices}</strong></td>
        <td class="right"><strong>${total.effectifReferenceCumule}</strong></td>
        <td class="right"><strong>${total.participationUtile}</strong></td>
        <td class="right"><strong>${total.excuses}</strong></td>
        <td class="right"><strong>${total.absents}</strong></td>
        <td class="right"><strong>${fmtPercent(tauxCouverture)}</strong></td>
      `;

      els.coverageDomainTableBody.appendChild(trTotal);
    }

    function getDapReferenceBySectionForDate(section, dateValue) {
      const ref = getReferenceSnapshotForDate(dateValue);

      switch (section) {
        case "Y1": return ref.organes.dapY1;
        case "Y2": return ref.organes.dapY2;
        case "Y3": return ref.organes.dapY3;
        case "Y4": return ref.organes.dapY4;
        default: return 0;
      }
    }

    function summarizeDapBusiness(rows) {
      const sections = ["Y1", "Y2", "Y3", "Y4"];
      const result = {};
      const mutualAllocationMap = buildMutualizedRoleAllocation();

      sections.forEach(section => {
        result[section] = {
          section,
          effectifReferenceSum: 0,
          effectifReferenceAvg: 0,
          effectifReferenceCount: 0,
          exercices: 0,
          presentsSection: 0,
          permutationsMoins: 0,
          permutationsPlus: 0,
          excuses: 0,
          absents: 0,
          suiviCumule: 0,
          tauxRecoursPermutationMoins: 0
        };
      });

      rows
        .filter(record => record.domain === "DAP" && record.aComptabiliser)
        .forEach(record => {
          const section = record.subStructure;
          if (!result[section]) return;

          const presents = getEffectivePresents(record, mutualAllocationMap);
          const permutationMoins = toInt(record.nbPermutation);
          const excuses = sumExcuses(record);
          const absents = toInt(record.nbAbsents);

          const permutationPlus =
            toInt(record.nbExtDapY1) +
            toInt(record.nbExtDapY2) +
            toInt(record.nbExtDapY3) +
            toInt(record.nbExtDapY4);

          const refValue = getDapReferenceBySectionForDate(section, record.dateExercice);

          result[section].effectifReferenceSum += refValue;
          result[section].effectifReferenceCount += 1;
          result[section].exercices += 1;
          result[section].presentsSection += presents;
          result[section].permutationsMoins += permutationMoins;
          result[section].permutationsPlus += permutationPlus;
          result[section].excuses += excuses;
          result[section].absents += absents;
          result[section].suiviCumule += (presents + permutationMoins);
        });

      sections.forEach(section => {
        const item = result[section];
        item.effectifReferenceAvg = item.effectifReferenceCount > 0
          ? (item.effectifReferenceSum / item.effectifReferenceCount)
          : 0;
        item.tauxRecoursPermutationMoins = item.presentsSection > 0
          ? (100 * item.permutationsMoins / item.presentsSection)
          : 0;
      });

      return result;
    }

    function getObjectiveStatus(actual, target) {
      const gap = actual - target;
      if (gap >= 0) return 'good';
      if (gap >= -5) return 'warn';
      return 'bad';
    }

    function getObjectiveStatusBadge(status) {
      const label = status === 'good' ? 'Atteint' : status === 'warn' ? 'À surveiller' : 'Non atteint';
      return `<span class="objective-status-badge objective-status-${status}">${label}</span>`;
    }

    function getJspReferenceGlobal() {
      return toInt(els.effectifJspGlobal?.value) || 0;
    }

    function summarizeObjectivePerformance(rows) {
      const metrics = [];
      const orgSummary = summarizeOrganeRates(rows);
      const domainBuckets = {};
      DOMAIN_ORDER.forEach(domain => domainBuckets[domain] = []);
      rows.filter(record => record.aComptabiliser).forEach(record => {
        if (domainBuckets[record.domain]) domainBuckets[record.domain].push(record);
      });

      const oiTargets = {
        'DPS G1': objectives.objDpsG1, 'DPS C1': objectives.objDpsC1, 'DPS B1': objectives.objDpsB1, 'DPS B2': objectives.objDpsB2,
        'DAP Y1': objectives.objDapY1, 'DAP Y2': objectives.objDapY2, 'DAP Y3': objectives.objDapY3, 'DAP Y4': objectives.objDapY4
      };
      OI_ORDER.forEach(label => {
        const target = oiTargets[label];
        const actual = orgSummary[label]?.taux || 0;
        metrics.push({ key:`oi-${label}`, label, target, actual, gap: actual-target, status:getObjectiveStatus(actual,target), kind:'oi' });
      });

      const domainTargets = { FOBA: objectives.objFOBA, PR: objectives.objPR, AUTO: objectives.objAUTO, JSP: objectives.objJSP };
      ['FOBA', 'PR', 'AUTO', 'JSP'].forEach(domain => {
        const target = domainTargets[domain];
        const summary = summarizeRecords(domainBuckets[domain] || []);
        const actual = summary.tauxAjuste || 0;
        metrics.push({ key:`domain-${domain}`, label:`${domain}`, target, actual, gap: actual-target, status:getObjectiveStatus(actual,target), kind:'domain' });
      });

      const coverageSummary = summarizeCoverageByDomain(rows);
      const totalCoverageBase = DOMAIN_ORDER.reduce((acc, domain) => acc + (coverageSummary[domain]?.effectifReferenceCumule || 0), 0);
      const totalCoverageUseful = DOMAIN_ORDER.reduce((acc, domain) => acc + (coverageSummary[domain]?.participationUtile || 0), 0);
      const coverageRate = totalCoverageBase > 0 ? (100 * totalCoverageUseful / totalCoverageBase) : 0;

      const jspRows = (domainBuckets['JSP'] || []);
      const jspSummary = summarizeRecords(jspRows);
      const jspActual = jspSummary.tauxAjuste || 0; // Harmonisé avec FOBA/PR/AUTO (tauxAjuste)
      const jspReference = getJspReferenceGlobal();
      const estimatedMissingCoverage = Math.max(0, 1 - (jspActual / 100));
      const jspCostEstimate = Math.round(jspReference * estimatedMissingCoverage * Math.max(0, objectives.objJspCost - objectives.objJspCotisation));

      return { metrics, coverageRate, jspCostEstimate, jspActual, jspSummary };
    }

    function summarizeOrganeRates(rows) {
      const organeMap = {
        "DPS G1": { domain: "DPS", sub: "G1" },
        "DPS C1": { domain: "DPS", sub: "C1" },
        "DPS B1": { domain: "DPS", sub: "B1" },
        "DPS B2": { domain: "DPS", sub: "B2" },
        "DAP Y1": { domain: "DAP", sub: "Y1" },
        "DAP Y2": { domain: "DAP", sub: "Y2" },
        "DAP Y3": { domain: "DAP", sub: "Y3" },
        "DAP Y4": { domain: "DAP", sub: "Y4" }
      };

      const result = {};
      const mutualAllocationMap = buildMutualizedRoleAllocation();

      Object.keys(organeMap).forEach(key => {
        result[key] = {
          label: key,
          exercices: 0,
          convoques: 0,
          presents: 0,
          excuses: 0,
          absents: 0,
          taux: 0
        };
      });

      rows
        .filter(record => record && record.aComptabiliser)
        .forEach(record => {
          if (record.isGroupedOrganExercise && Array.isArray(record.groupExerciseDetails)) {
            record.groupExerciseDetails.forEach(item => {
              const label = `${record.domain} ${item.organe}`;
              if (!result[label]) return;

              const excuses =
                toInt(item.nbMaladie) +
                toInt(item.nbAccident) +
                toInt(item.nbArmee) +
                toInt(item.nbProfessionnel) +
                toInt(item.nbPrive);

              result[label].exercices += 1;
              result[label].convoques += toInt(item.nbConvoques);

              const groupedDetailRecord = {
                ...record,
                nbPresents: toInt(item.nbPresents),
                importedEventId: record.importedEventId,
                id: record.id,
                mutualRoles: createDefaultMutualRoles()
              };

              result[label].presents += getEffectivePresents(groupedDetailRecord, mutualAllocationMap);
              result[label].excuses += excuses;
              result[label].absents += toInt(item.nbAbsents);
            });
            return;
          }

          const label = `${record.domain} ${record.subStructure}`;
          if (!result[label]) return;

          result[label].exercices += 1;
          result[label].convoques += getEffectiveConvoques(record);
          result[label].presents += getEffectivePresents(record, mutualAllocationMap);
          result[label].excuses += sumExcuses(record);
          result[label].absents += toInt(record.nbAbsents);
        });

      Object.keys(result).forEach(key => {
  const r = result[key];
  const domain = key.startsWith("DAP ") ? "DAP" : key.startsWith("DPS ") ? "DPS" : "";

  const rawTaux = r.convoques > 0 ? (100 * r.presents / r.convoques) : 0;
  const rawTauxAjuste = (r.convoques - r.excuses) > 0
    ? (100 * r.presents / Math.max(1, (r.convoques - r.excuses)))
    : 0;

  r.taux = domain ? capRateForDomain(domain, rawTaux) : rawTaux;
  r.tauxAjuste = domain ? capRateForDomain(domain, rawTauxAjuste) : rawTauxAjuste;
});

      return result;
    }

    function renderOrganeRateTable(rows) {
      if (!els.organeRateTableBody) return;

      const summary = summarizeOrganeRates(rows);
      els.organeRateTableBody.innerHTML = "";

      OI_ORDER.forEach(label => {
        const item = summary[label];
        const tr = document.createElement("tr");
        if (label.startsWith("DAP")) tr.classList.add("dap-row");
        tr.innerHTML = `
          <td><strong>${item.label}</strong></td>
          <td class="right">${item.exercices}</td>
          <td class="right">${item.convoques}</td>
          <td class="right">${item.presents}</td>
          <td class="right">${item.excuses}</td>
          <td class="right">${item.absents}</td>
          <td class="right">${fmtPercent(item.taux)}</td>
          <td class="right">${fmtPercent(item.tauxAjuste)}</td>
        `;
        els.organeRateTableBody.appendChild(tr);
      });
    }

    function renderDapBusinessTable(rows) {
      if (!els.dapBusinessTableBody) return;

      const summary = summarizeDapBusiness(rows);
      const sections = ["Y1", "Y2", "Y3", "Y4"];

      els.dapBusinessTableBody.innerHTML = "";

      sections.forEach(section => {
        const item = summary[section];
        const tr = document.createElement("tr");
        const avgDisplay = item.effectifReferenceCount > 0 ? item.effectifReferenceAvg.toFixed(1) : '—';

        tr.innerHTML = `
          <td><strong>${item.section}</strong></td>
          <td class="right">${avgDisplay}</td>
          <td class="right">${item.exercices}</td>
          <td class="right">${item.presentsSection}</td>
          <td class="right">${item.permutationsMoins}</td>
          <td class="right">${item.permutationsPlus}</td>
          <td class="right">${item.excuses}</td>
          <td class="right">${item.absents}</td>
          <td class="right">${item.suiviCumule}</td>
          <td class="right">${fmtPercent(item.tauxRecoursPermutationMoins)}</td>
        `;

        els.dapBusinessTableBody.appendChild(tr);
      });

      const total = sections.reduce((acc, section) => {
        const item = summary[section];
        acc.effectifReferenceSum += item.effectifReferenceSum;
        acc.effectifReferenceCount += item.effectifReferenceCount;
        acc.exercices += item.exercices;
        acc.presentsSection += item.presentsSection;
        acc.permutationsMoins += item.permutationsMoins;
        acc.permutationsPlus += item.permutationsPlus;
        acc.excuses += item.excuses;
        acc.absents += item.absents;
        acc.suiviCumule += item.suiviCumule;
        return acc;
      }, {
        effectifReferenceSum: 0,
        effectifReferenceCount: 0,
        exercices: 0,
        presentsSection: 0,
        permutationsMoins: 0,
        permutationsPlus: 0,
        excuses: 0,
        absents: 0,
        suiviCumule: 0,
        tauxRecoursPermutationMoins: 0
      });

      const effectifReferenceAvg = total.effectifReferenceCount > 0
        ? (total.effectifReferenceSum / total.effectifReferenceCount)
        : 0;

      total.tauxRecoursPermutationMoins = total.presentsSection > 0
        ? (100 * total.permutationsMoins / total.presentsSection)
        : 0;

      const trTotal = document.createElement("tr");
      trTotal.innerHTML = `
        <td><strong>Global DAP</strong></td>
        <td class="right"><strong>${effectifReferenceAvg.toFixed(1)}</strong></td>
        <td class="right"><strong>${total.exercices}</strong></td>
        <td class="right"><strong>${total.presentsSection}</strong></td>
        <td class="right"><strong>${total.permutationsMoins}</strong></td>
        <td class="right"><strong>${total.permutationsPlus}</strong></td>
        <td class="right"><strong>${total.excuses}</strong></td>
        <td class="right"><strong>${total.absents}</strong></td>
        <td class="right"><strong>${total.suiviCumule}</strong></td>
        <td class="right"><strong>${fmtPercent(total.tauxRecoursPermutationMoins)}</strong></td>
      `;

      els.dapBusinessTableBody.appendChild(trTotal);
    }

    function hasActionTaken(record) {
      if (!record) return false;
      return (
        String(record.status || "Planifié") !== "Planifié" ||
        !!record.aComptabiliser ||
        toInt(record.nbPresents) > 0 ||
        toInt(record.nbMaladie) > 0 ||
        toInt(record.nbAccident) > 0 ||
        toInt(record.nbArmee) > 0 ||
        toInt(record.nbProfessionnel) > 0 ||
        toInt(record.nbPrive) > 0 ||
        toInt(record.nbAbsents) > 0 ||
        toInt(record.nbPermutation) > 0 ||
        String(record.remarque || "").trim() !== ""
      );
    }

    function getOverdueRows() {
      return getDisplayRows().filter(record => {
        if (window.MonitoringEventRules?.isEventToProcess) return window.MonitoringEventRules.isEventToProcess(record);
        const iso = parseFlexibleDateToIso(record.dateExercice || record.dateEvenement || record.date || "");
        const closedStatuses = ["traité", "traite", "effectué", "effectue", "clôturé", "cloture", "annulé", "annule", "ignoré / non comptabilisé", "ignore / non comptabilise"];
        const status = String(record.status || record.statutTraitement || "").trim().toLowerCase();
        const closed = !!record.aComptabiliser || closedStatuses.includes(status);
        const today = new Date();
        const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        return /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso <= todayIso && !closed;
      }).sort((a,b) => {
        const ad = parseFlexibleDateToIso(a.dateExercice || a.dateEvenement || a.date || "");
        const bd = parseFlexibleDateToIso(b.dateExercice || b.dateEvenement || b.date || "");
        return ad.localeCompare(bd) || String(a.domain || "").localeCompare(String(b.domain || ""), "fr") || String(a.template || "").localeCompare(String(b.template || ""), "fr");
      });
    }

    function renderOverdueTable() {
      if (!els.overdueTableBody) return;
      const rows = getOverdueRows();
      const trainerDeductionMap = buildTrainerTargetDeductionAllocationMap();
      els.overdueTableBody.innerHTML = "";
      if (els.overdueCount) {
        els.overdueCount.textContent = `${rows.length} à traiter`;
      }
      if (!rows.length) {
        els.overdueTableBody.innerHTML = `<tr><td colspan="7" class="ok">Aucun événement non traité à afficher.</td></tr>`;
        return;
      }
      rows.forEach(record => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${fmtDate(record.dateExercice)}</td>
          <td><strong>${escapeHtml(record.domain || "")}</strong></td>
          <td>${escapeHtml(getSubLabel(record.domain, record.subStructure))}</td>
          <td>
            <div>${escapeHtml(record.template || "")}</div>
            ${(()=>{
              const brute = record.domain === "DAP"
                ? (toInt(record.nbConvoques) + toInt(record.nbExtDapY1) + toInt(record.nbExtDapY2) + toInt(record.nbExtDapY3) + toInt(record.nbExtDapY4))
                : toInt(record.nbConvoques);
              const ded = getTrainerTargetDeduction(record, trainerDeductionMap);
              const nette = Math.max(0, brute - ded);
              if (ded <= 0) return `<div class="record-target-block"><span class="record-target-pill nette" title="Cible nette (= brute, pas de déduction formateurs)">Cible : ${nette}</span></div>`;
              return `<div class="record-target-block"><span class="record-target-pill brute" title="Cible brute">B: ${brute}</span><span class="record-target-pill deduction" title="Formateurs retirés">&minus;${ded}</span><span class="record-target-pill nette" title="Cible nette">N: ${nette}</span></div>`;
            })()}
          </td>
          <td>${escapeHtml(record.statCom || "")}</td>
          <td>${getStatusBadge(record.status || 'Planifié')}</td>
          <td><button type="button" class="compact-btn secondary" data-overdue-handle="${escapeHtml(String(record.importedEventId || record.id))}">Traiter</button></td>
        `;
        els.overdueTableBody.appendChild(tr);
      });
      els.overdueTableBody.querySelectorAll('[data-overdue-handle]').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.overdueHandle;
          const row = getOverdueRows().find(item => String(item.importedEventId || item.id) === key);
          if (!row) return;
          if (row.sourceType === 'imported' || row.importedEventId) {
            selectImportedEvent(row.importedEventId || row.id);
          } else {
            setExerciseFormRecord(row);
          }
          switchTab('events');
          setTimeout(() => {
            const status = document.getElementById('eventStatus');
            if (status && !['Effectué','Annulé'].includes(status.value)) status.value = 'Effectué';
            document.getElementById('f7SaisieEventsMount')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 0);
        });
      });
    }

    const CHART_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

    function setupHiDPICanvas(canvas, fallbackHeight = null) {
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const dpr = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      const cssWidth = Math.max(1, Math.round(rect.width || canvas.clientWidth || canvas.width || 1));
      const cssHeight = Math.max(1, Math.round((fallbackHeight || rect.height || canvas.clientHeight || canvas.height || 320)));
      const pixelWidth = Math.round(cssWidth * dpr);
      const pixelHeight = Math.round(cssHeight * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      ctx.textBaseline = 'alphabetic';
      ctx.imageSmoothingEnabled = true;
      return { ctx, w: cssWidth, h: cssHeight, dpr };
    }

    function drawEmptyChart(canvas, message = 'Aucune donnée') {
      return window.MonitoringRenderCharts?.drawEmptyChart
        ? window.MonitoringRenderCharts.drawEmptyChart(canvas, message)
        : undefined;
    }

    const CHART_COLORS = ['#de000a', '#171c8f', '#ffa300', '#54585a', '#e5333b', '#4549a5', '#ffb733', '#76797b', '#b20008', '#121672', '#cc8200', '#3f4244', '#f0666d', '#7477bc', '#ffc966', '#989b9c'];

    function getChartColor(index) {
      return window.MonitoringRenderCharts?.getChartColor
        ? window.MonitoringRenderCharts.getChartColor(index)
        : CHART_COLORS[index % CHART_COLORS.length];
    }

    function getDomainColor(domain) {
      return window.MonitoringRenderCharts?.getDomainColor
        ? window.MonitoringRenderCharts.getDomainColor(domain)
        : (DOMAIN_COLOR_MAP[String(domain || "").toUpperCase()] || getChartColor(0));
    }

    function getDomainColorFromLabel(label) {
      return window.MonitoringRenderCharts?.getDomainColorFromLabel
        ? window.MonitoringRenderCharts.getDomainColorFromLabel(label)
        : getChartColor(0);
    }

    function getSubStructureSortIndex(label) {
      const normalized = String(label || "").trim();
      const idx = SUB_STRUCTURE_ORDER.indexOf(normalized);
      return idx >= 0 ? idx : 999;
    }

    function wrapCanvasLabel(ctx, text, maxWidth, maxLines = 4) {
      return window.MonitoringRenderCharts?.wrapCanvasLabel
        ? window.MonitoringRenderCharts.wrapCanvasLabel(ctx, text, maxWidth, maxLines)
        : [String(text || '')];
    }

    function drawBarChart(canvas, labels, values, title, colors = null) {
      return window.MonitoringRenderCharts?.drawBarChart
        ? window.MonitoringRenderCharts.drawBarChart(canvas, labels, values, title, colors)
        : drawEmptyChart(canvas);
    }

    function drawHorizontalBarChart(canvas, labels, values, title, colors = null) {
      return window.MonitoringRenderCharts?.drawHorizontalBarChart
        ? window.MonitoringRenderCharts.drawHorizontalBarChart(canvas, labels, values, title, colors)
        : drawEmptyChart(canvas);
    }

    function drawHorizontalDualBarChart(canvas, labels, targetValues, actualValues, title, colors = []) {
      return window.MonitoringRenderCharts?.drawHorizontalDualBarChart
        ? window.MonitoringRenderCharts.drawHorizontalDualBarChart(canvas, labels, targetValues, actualValues, title, colors)
        : drawEmptyChart(canvas);
    }

    function drawPieChart(canvas, labels, values, title, colors = null) {
      return window.MonitoringRenderCharts?.drawPieChart
        ? window.MonitoringRenderCharts.drawPieChart(canvas, labels, values, title, colors)
        : drawEmptyChart(canvas);
    }

    function renderCommandObjectives(rows) {
      const objectiveData = summarizeObjectivePerformance(rows);
      const metrics = objectiveData.metrics;
      if (els.objectiveTableBody) {
        els.objectiveTableBody.innerHTML = '';
        metrics.forEach(item => {
          const tr = document.createElement('tr');
          if (String(item.label).startsWith('DAP')) tr.classList.add('dap-row');
          tr.innerHTML = `
            <td><strong>${escapeHtml(item.label)}</strong></td>
            <td class="right">${fmtPercent(item.target)}</td>
            <td class="right">${fmtPercent(item.actual)}</td>
            <td class="right ${item.gap >= 0 ? 'objective-table-good' : item.gap >= -5 ? 'objective-table-warn' : 'objective-table-bad'}">${item.gap >= 0 ? '+' : ''}${item.gap.toFixed(1)} pt</td>
            <td>${getObjectiveStatusBadge(item.status)}</td>`;
          els.objectiveTableBody.appendChild(tr);
        });
      }
      if (els.commandHeatmapBody) {
        els.commandHeatmapBody.innerHTML = '';
        metrics.forEach(item => {
          const tr = document.createElement('tr');
          const cls = item.status === 'good' ? 'heat-good' : item.status === 'warn' ? 'heat-warn' : 'heat-bad';
          tr.innerHTML = `<td>${escapeHtml(item.label)}</td><td>${fmtPercent(item.target)}</td><td>${fmtPercent(item.actual)}</td><td class="${cls}">${item.gap >= 0 ? '+' : ''}${item.gap.toFixed(1)} pt</td><td class="${cls}">${item.status === 'good' ? 'Atteint' : item.status === 'warn' ? 'À surveiller' : 'Non atteint'}</td>`;
          els.commandHeatmapBody.appendChild(tr);
        });
      }
      const complianceCount = metrics.filter(item => item.status === 'good').length;
      const coverageRate = objectiveData.coverageRate || 0;
      const total = metrics.length || 1;
      const complianceRate = 100 * complianceCount / total;
      if (els.kpiCoverageCommand) els.kpiCoverageCommand.textContent = fmtPercent(coverageRate);
      if (els.kpiObjectiveCompliance) els.kpiObjectiveCompliance.textContent = `${Math.round(complianceRate)}%`;
      if (els.kpiAbsenceDiscipline) {
        const global = summarizeRecords(rows);
        els.kpiAbsenceDiscipline.textContent = fmtPercent(global.tauxAbsenceNonExcusee);
      }
      if (els.kpiJspCostEstimate) els.kpiJspCostEstimate.textContent = `~CHF ${objectiveData.jspCostEstimate.toLocaleString('fr-CH')} (est.)`;
      return objectiveData;
    }


    function getDomainCommandStatus(summary) {
      if (!summary || summary.exercices <= 0) return { level: 'info', label: 'Aucune donnée' };
      if (summary.convoques <= 0) return { level: 'warn', label: 'Convoqués manquants' };
      if (summary.tauxBrut < 60) return { level: 'bad', label: 'Priorité de suivi' };
      if (summary.tauxBrut < 75) return { level: 'warn', label: 'À surveiller' };
      if (summary.absents > 0 && summary.tauxAbsenceNonExcusee >= 15) return { level: 'warn', label: 'Absences élevées' };
      return { level: 'ok', label: 'Situation maîtrisée' };
    }

    function renderCommandDashboard(rows) {
      const source = Array.isArray(rows) ? rows : [];
      const domainSummaries = {};
      COMMAND_DOMAIN_ORDER.forEach(domain => {
        domainSummaries[domain] = summarizeRecords(source.filter(record => record.domain === domain));
      });

      if (els.commandDomainTableBody) {
        els.commandDomainTableBody.innerHTML = '';
        COMMAND_DOMAIN_ORDER.forEach(domain => {
          const summary = domainSummaries[domain];
          const status = getDomainCommandStatus(summary);
          const tr = document.createElement('tr');
          tr.className = `command-domain-row command-domain-${status.level}`;
          tr.innerHTML = `
            <td><strong>${escapeHtml(domain)}</strong><br><span class="muted small">${escapeHtml(DOMAIN_CONFIG[domain]?.globalLabel || '')}</span></td>
            <td class="right">${summary.convoques}</td>
            <td class="right">${summary.presents}</td>
            <td class="right">${summary.excuses}</td>
            <td class="right">${summary.absents}</td>
            <td class="right"><strong>${fmtPercent(summary.tauxBrut)}</strong></td>
            <td><span class="command-status-pill command-status-${status.level}">${escapeHtml(status.label)}</span></td>
          `;
          els.commandDomainTableBody.appendChild(tr);
        });
      }

      const labels = [...COMMAND_DOMAIN_ORDER];
      const rates = labels.map(domain => Number((domainSummaries[domain]?.tauxBrut || 0).toFixed(1)));
      const colors = labels.map(domain => getDomainColor(domain));
      drawBarChart(els.commandPresenceChart, labels, rates, 'Taux de présence brut par domaine (%)', colors);
    }

    function renderKpiBusinessAlerts(rows, global) {
      if (!els.kpiBusinessAlerts) return;
      const alerts = [];
      const safeGlobal = global || summarizeRecords(rows || []);
      const comptaRows = (Array.isArray(rows) ? rows : []).filter(record => record.aComptabiliser);
      if (!comptaRows.length) {
        alerts.push({ level: 'info', text: 'Aucun exercice comptabilisé dans la sélection active.' });
      }
      if (safeGlobal.convoques <= 0 && comptaRows.length) {
        alerts.push({ level: 'warn', text: 'Aucun convoqué exploitable pour les exercices comptabilisés.' });
      }
      if (safeGlobal.convoques > 0 && safeGlobal.tauxBrut < 60) {
        alerts.push({ level: 'warn', text: `Taux de présence brut faible : ${fmtPercent(safeGlobal.tauxBrut)}.` });
      }
      if (safeGlobal.absents > 0 && safeGlobal.tauxAbsenceNonExcusee >= 15) {
        alerts.push({ level: 'warn', text: `Absences non excusées élevées : ${fmtPercent(safeGlobal.tauxAbsenceNonExcusee)}.` });
      }
      const inconsistent = comptaRows.filter(record => {
        const convoques = getEffectiveConvoques(record);
        const presents = getEffectivePresents(record);
        const excuses = sumExcuses(record);
        const absents = toInt(record.nbAbsents);
        return convoques > 0 && (presents + excuses + absents) > (convoques + 5);
      });
      if (inconsistent.length) {
        alerts.push({ level: 'warn', text: `${inconsistent.length} exercice(s) présentent une incohérence possible entre convoqués, présents, excusés et absents.` });
      }
      const domainsWithoutReference = [...new Set(comptaRows
        .map(record => record.domain)
        .filter(domain => domain && !getReferenceTotalForDomain(domain, comptaRows.find(record => record.domain === domain)?.dateExercice)))];
      if (domainsWithoutReference.length) {
        alerts.push({ level: 'info', text: `Référence absente ou nulle pour : ${domainsWithoutReference.join(', ')}.` });
      }
      els.kpiBusinessAlerts.innerHTML = alerts.length
        ? alerts.slice(0, 5).map(item => `<div class="kpi-alert kpi-alert-${item.level}">${escapeHtml(item.text)}</div>`).join('')
        : '<div class="kpi-alert kpi-alert-ok">Aucune alerte sur la sélection actuelle.</div>';
    }

    function getReferenceTotalForDomain(domain, dateValue) {
      const ref = getReferenceSnapshotForDate(dateValue);
      const d = String(domain || '').toUpperCase();
      if (d === 'FOBA') return toInt(ref.foba?.foba1) + toInt(ref.foba?.foba2) + toInt(ref.foba?.foba3);
      if (d === 'PR') return toInt(ref.domaines?.pr);
      if (d === 'AUTO') return toInt(ref.domaines?.autoVl) + toInt(ref.domaines?.autoPl);
      if (d === 'DPS') return toInt(ref.organes?.dpsG1) + toInt(ref.organes?.dpsC1) + toInt(ref.organes?.dpsB1) + toInt(ref.organes?.dpsB2);
      if (d === 'DAP') return toInt(ref.organes?.dapY1) + toInt(ref.organes?.dapY2) + toInt(ref.organes?.dapY3) + toInt(ref.organes?.dapY4);
      if (d === 'JSP') return toInt(ref.organes?.jspG1) + toInt(ref.organes?.jspC1) + toInt(ref.organes?.jspB1) + toInt(ref.organes?.jspCadets);
      return 0;
    }

    function renderCharts() {
      populateGraphFilters();
      const all = getGraphFilteredRows();
      const mutualAllocationMap = buildMutualizedRoleAllocation();
      const trainerDeductionMap = buildTrainerTargetDeductionAllocationMap();

      const byYearEvents = {};
      const byYearPresents = {};
      const byYearAbsents = {};
      all.forEach(r => {
        const y = yearOf(r.dateExercice);
        if (!Number.isFinite(y)) return;
        byYearEvents[y] = (byYearEvents[y] || 0) + 1;
        byYearPresents[y] = (byYearPresents[y] || 0) + getEffectivePresents(r, mutualAllocationMap);
        byYearAbsents[y] = (byYearAbsents[y] || 0) + toInt(r.nbAbsents);
      });
      const annualLabels = Object.keys(byYearEvents).sort();
      drawBarChart(els.annualChart, annualLabels, annualLabels.map(y => byYearEvents[y]), 'Événements comptabilisés par année');
      drawBarChart(els.presenceYearChart, annualLabels, annualLabels.map(y => byYearPresents[y] || 0), 'Présences par année', annualLabels.map((_, i) => getChartColor((i+1)%CHART_COLORS.length)));
      drawBarChart(els.absenceYearChart, annualLabels, annualLabels.map(y => byYearAbsents[y] || 0), 'Absences par année', annualLabels.map((_, i) => getChartColor((i+2)%CHART_COLORS.length)));

      const byDomainEvents = {};
      const byDomainPresents = {};
      const byDomainExcuses = {};
      const byDomainAbsents = {};
      const byDomainAdjustedRate = {};
      DOMAIN_ORDER.forEach(d => { byDomainEvents[d]=0; byDomainPresents[d]=0; byDomainExcuses[d]=0; byDomainAbsents[d]=0; byDomainAdjustedRate[d]={presents:0, adjustedBase:0}; });
      all.forEach(r => {
        const effectivePresents = getEffectivePresents(r, mutualAllocationMap);
        const effectiveConvoques = getEffectiveConvoques(r, trainerDeductionMap);
        byDomainEvents[r.domain] = (byDomainEvents[r.domain] || 0) + 1;
        byDomainPresents[r.domain] = (byDomainPresents[r.domain] || 0) + effectivePresents;
        byDomainExcuses[r.domain] = (byDomainExcuses[r.domain] || 0) + sumExcuses(r);
        byDomainAbsents[r.domain] = (byDomainAbsents[r.domain] || 0) + toInt(r.nbAbsents);
        byDomainAdjustedRate[r.domain].presents += getPresenceRateNumerator(r);
        byDomainAdjustedRate[r.domain].adjustedBase += Math.max(0, effectiveConvoques - sumExcuses(r));
      });
      const domainLabels = [...DOMAIN_ORDER];
      const domainColors = domainLabels.map(label => getDomainColor(label));
      drawPieChart(els.domainPieChart, domainLabels, domainLabels.map(k => byDomainEvents[k]), 'Répartition des événements par domaine', domainColors);
      drawBarChart(els.excusesDomainChart, domainLabels, domainLabels.map(k => byDomainExcuses[k]), 'Excusés par domaine', domainColors);
      drawBarChart(els.presenceDomainChart, domainLabels, domainLabels.map(k => byDomainPresents[k]), 'Présences par domaine', domainColors);
      drawBarChart(els.absenceDomainChart, domainLabels, domainLabels.map(k => byDomainAbsents[k]), 'Absences par domaine', domainColors);
      drawBarChart(
        els.adjustedRateDomainChart,
        domainLabels,
        domainLabels.map(k => byDomainAdjustedRate[k].adjustedBase > 0 ? Number((100 * byDomainAdjustedRate[k].presents / byDomainAdjustedRate[k].adjustedBase).toFixed(1)) : 0),
        'Taux de présence ajusté par domaine',
        domainColors
      );

      const oiSummary = summarizeOrganeRates(all);
      const oiLabels = [...OI_ORDER];
      drawBarChart(els.oiChart, oiLabels, oiLabels.map(k => oiSummary[k].presents), 'Présents cumulés par OI', oiLabels.map(label => getDomainColorFromLabel(label)));

      const bySemester = {};
      all.forEach(r => {
        const y = yearOf(r.dateExercice); const s = semesterOf(r.dateExercice);
        if (!Number.isFinite(y) || !Number.isFinite(s)) return;
        const key = `${y} S${s}`;
        bySemester[key] = (bySemester[key] || 0) + 1;
      });
      const semLabels = Object.keys(bySemester).sort();
      drawBarChart(els.semesterChart, semLabels, semLabels.map(k => bySemester[k]), 'Événements par semestre');

      const topAbsRows = [...all]
        .filter(r => toInt(r.nbAbsents) > 0)
        .sort((a, b) => toInt(b.nbAbsents) - toInt(a.nbAbsents))
        .slice(0, 10);
      const paddedTopAbsRows = [...topAbsRows];
      while (paddedTopAbsRows.length < 10) {
        paddedTopAbsRows.push({ dateExercice: '', template: `Position ${paddedTopAbsRows.length + 1}`, nbAbsents: 0, isPlaceholder: true });
      }
      drawHorizontalBarChart(
        els.topAbsenceChart,
        paddedTopAbsRows.map((r, index) => r.isPlaceholder ? `Position ${index + 1}` : `${fmtDate(r.dateExercice)} • ${r.template || ''}`.trim()),
        paddedTopAbsRows.map(r => toInt(r.nbAbsents)),
        'Top 10 des événements avec le plus d’absences',
        paddedTopAbsRows.map(r => r.isPlaceholder ? 'rgba(84,88,90,0.45)' : getChartColor(0))
      );

      const objectiveData = summarizeObjectivePerformance(all);
      const metrics = objectiveData.metrics;
      const metricLabels = metrics.map(item => item.label);
      drawHorizontalDualBarChart(
        els.objectiveGapChart,
        metricLabels,
        metrics.map(item => item.target),
        metrics.map(item => Number(item.actual.toFixed(1))),
        'Objectif vs réel',
        [getChartColor(3), getChartColor(0)]
      );
      const complianceCounts = { good: 0, warn: 0, bad: 0 };
      metrics.forEach(item => { complianceCounts[item.status] = (complianceCounts[item.status] || 0) + 1; });
      drawPieChart(
        els.objectiveComplianceChart,
        ['Atteint', 'À surveiller', 'Non atteint'],
        [complianceCounts.good, complianceCounts.warn, complianceCounts.bad],
        'Conformité des objectifs',
        [getChartColor(1), getChartColor(2), getChartColor(0)]
      );
      drawBarChart(
        els.commandGapChart,
        metricLabels,
        metrics.map(item => Number(item.gap.toFixed(1))),
        'Écart aux objectifs (points)',
        metrics.map(item => item.gap >= 0 ? getChartColor(1) : item.gap >= -5 ? getChartColor(2) : getChartColor(0))
      );
      drawPieChart(
        els.jspCostChart,
        ['Coût couvert', 'Part non couverte'],
        [Math.max(0, Math.round(objectives.objJspCotisation * Math.max(0, objectiveData.jspSummary?.presents || 0))), objectiveData.jspCostEstimate],
        'Impact financier JSP',
        [getChartColor(1), getChartColor(0)]
      );
    }

    window.addEventListener('resize', () => {
      if (document.getElementById('tab-graphs')?.classList.contains('active')) {
        updateTargetVisibilitySummary();
      renderCharts();
      }
    });

    function switchTab(tabName = 'dashboard') {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tabTarget === tabName));
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === `tab-${tabName}`));
      if (tabName === 'graphs') renderCharts();
      if (tabName === 'events' || tabName === 'overdue') renderOverdueTable();
      if (tabName === 'analyses') renderAnalysesTab();
      // Appendices est statique — aucun rendu dynamique requis
    }

    function getActiveFilterSummaryText() {
      const parts = [];
      const fd = els.filterDomain?.value || "Tous les domaines";
      const fs = els.filterSub?.value ? getSubLabel(els.filterDomain?.value || '', els.filterSub.value) : "Tous les publics cibles";
      const fc = els.filterCompta?.value === "true" ? "Comptabilisés uniquement" : els.filterCompta?.value === "false" ? "Non comptabilisés uniquement" : "Compta : tous";
      const search = String(els.recordsSearch?.value || '').trim();
      parts.push(`Domaine : ${fd}`);
      parts.push(`Public cible : ${fs}`);
      parts.push(fc);
      if (search) parts.push(`Recherche : ${search}`);
      const graphYear = String(els.graphYearFilter?.value || '').trim();
      if (graphYear) parts.push(`Année graphique : ${graphYear}`);
      const graphDomains = els.graphDomainFilters
        ? [...els.graphDomainFilters.querySelectorAll('input[type="checkbox"]:checked')].map(input => input.value)
        : [];
      if (graphDomains.length) parts.push(`Domaines graphiques : ${graphDomains.join(', ')}`);
      return parts.join(' • ');
    }

    

function buildPrintCommandSummary() {
      const objectiveHtml = document.getElementById('objectiveTable')?.outerHTML || '';
      const commandSummaryText = document.querySelector('.objective-meta')?.textContent?.trim() || '';
      const coverage = els.kpiCoverageCommand?.textContent?.trim() || '0.0%';
      const compliance = els.kpiObjectiveCompliance?.textContent?.trim() || '0%';
      const discipline = els.kpiAbsenceDiscipline?.textContent?.trim() || '0.0%';
      const jspImpact = els.kpiJspCostEstimate?.textContent?.trim() || 'CHF 0';

      return `
        <section class="card print-section" style="margin-bottom:12px;">
          <h2 class="section-title"><span class="section-icon"><svg viewBox="0 0 24 24"><path d="M5 9.2h3V19H5zm5.5-4.2h3V19h-3zm5.5 7h3V19h-3z"/></svg></span><span>Pilotage commandement</span></h2>
          <div class="print-kpi-grid">
            <div class="print-kpi-card"><div class="print-kpi-value">${escapeHtml(coverage)}</div><div class="print-kpi-label">Couverture globale</div></div>
            <div class="print-kpi-card"><div class="print-kpi-value">${escapeHtml(compliance)}</div><div class="print-kpi-label">Objectifs atteints</div></div>
            <div class="print-kpi-card"><div class="print-kpi-value">${escapeHtml(discipline)}</div><div class="print-kpi-label">Absences non excusées</div></div>
            <div class="print-kpi-card"><div class="print-kpi-value">${escapeHtml(jspImpact)}</div><div class="print-kpi-label">Impact JSP estimé</div></div>
          </div>
          <div class="table-wrap print-table-wrap">${objectiveHtml}</div>
          <div class="footer-note">${escapeHtml(commandSummaryText)}</div>
        </section>
      `;
    }

    function buildPrintRecordsTable(rows) {
      const safeRows = Array.isArray(rows) ? rows : [];
      const mutualAllocationMap = buildMutualizedRoleAllocation();
      const trainerDeductionMap = buildTrainerTargetDeductionAllocationMap();
      const body = safeRows.map(row => {
        const effectiveConvoques = getEffectiveConvoques(row, trainerDeductionMap);
        const effectivePresents = getEffectivePresents(row, mutualAllocationMap);
        const brute = row.domain === 'DAP'
          ? (toInt(row.nbConvoques) + toInt(row.nbExtDapY1) + toInt(row.nbExtDapY2) + toInt(row.nbExtDapY3) + toInt(row.nbExtDapY4))
          : toInt(row.nbConvoques);
        const ded = getTrainerTargetDeduction(row, trainerDeductionMap);
        const nette = Math.max(0, brute - ded);
        const targetInfo = ded > 0
          ? `Brute: ${brute} | Formateurs: −${ded} | Nette: ${nette}`
          : `Cible: ${nette}`;
        const rate = fmtPercent(getExercisePresenceRate(row, mutualAllocationMap, trainerDeductionMap));
        const status = row.status || 'Planifié';
        const compta = row.aComptabiliser ? 'Oui' : 'Non';
        return `
          <tr>
            <td>${escapeHtml(fmtDate(row.dateExercice))}</td>
            <td>${escapeHtml(row.domain || '')}</td>
            <td>${escapeHtml(getSubLabel(row.domain, row.subStructure))}</td>
            <td>
              <div style="font-weight:600;">${escapeHtml(row.template || '')}</div>
              <div style="font-size:10px;color:#6b7280;margin-top:2px;">${escapeHtml(targetInfo)}</div>
            </td>
            <td>${escapeHtml(row.statCom || '')}</td>
            <td>${escapeHtml(status)}</td>
            <td>${escapeHtml(compta)}</td>
            <td class="right">${effectiveConvoques}</td>
            <td class="right">${effectivePresents}</td>
            <td class="right">${sumExcuses(row)}</td>
            <td class="right">${toInt(row.nbAbsents)}</td>
            <td class="right">${escapeHtml(rate)}</td>
          </tr>
        `;
      }).join('');

      return `
        <table class="print-records-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Domaine</th>
              <th>Public cible</th>
              <th>Événement</th>
              <th>Stat.Com</th>
              <th>Statut</th>
              <th>Compta</th>
              <th class="right">Convoqués</th>
              <th class="right">Présents</th>
              <th class="right">Excusés</th>
              <th class="right">Absents</th>
              <th class="right">Taux</th>
            </tr>
          </thead>
          <tbody>${body || '<tr><td colspan="12">Aucune donnée filtrée</td></tr>'}</tbody>
        </table>
      `;
    }

function buildPrintChartCard(title, subtitle, canvasId, extraClass = '') {
      const canvas = document.getElementById(canvasId);
      if (!canvas || typeof canvas.toDataURL !== 'function') return '';
      let dataUrl = '';
      try {
        dataUrl = canvas.toDataURL('image/png');
      } catch {
        dataUrl = '';
      }
      if (!dataUrl) return '';
      return `
        <section class="${("print-chart-card " + extraClass).trim()}">
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(subtitle)}</p>
          <img src="${dataUrl}" alt="${escapeHtml(title)}" />
        </section>
      `;
    }

    function getPrintableFilenameBase() {

      const title = String(document.title || 'monitoring_exercices_sdis').trim();
      const normalized = title
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .toLowerCase();
      return normalized || 'monitoring_exercices_sdis';
    }

    function exportFilteredSummaryPdf() {
      try {
        const rows = filteredRecords();
        const global = summarizeRecords(rows);
        if (!els.printArea) {
          alert("Zone d’impression introuvable.");
          return;
        }

        const domainHtml = document.getElementById('domainTable')?.outerHTML || '';
        const subHtml = document.getElementById('subTable')?.outerHTML || '';
        const coverageHtml = document.getElementById('coverageDomainTable')?.outerHTML || '';
        const oiHtml = document.getElementById('organeRateTable')?.outerHTML || '';
        const dapHtml = document.getElementById('dapBusinessTable')?.outerHTML || '';
        const filterSummary = getActiveFilterSummaryText();
        const editedAt = new Date().toLocaleString('fr-CH');
        const filenameOnly = `${getPrintableFilenameBase()}_filtre.pdf`;

        const chartCards = [
          buildPrintChartCard('Comparaison annuelle', 'Événements comptabilisés par année', 'annualChart'),
          buildPrintChartCard('Résumé par domaine', 'Répartition des événements comptabilisés par domaine', 'domainPieChart'),
          buildPrintChartCard('Présences par domaine', 'Présents cumulés par domaine', 'presenceDomainChart'),
          buildPrintChartCard('Absences par domaine', 'Absents non excusés par domaine', 'absenceDomainChart', 'print-chart-card-wide'),
          buildPrintChartCard('Objectif vs réel', 'Comparaison directe des objectifs de participation et du réalisé', 'objectiveGapChart'),
          buildPrintChartCard('Impact financier JSP', 'Vision instantanée entre coût annuel JSP, cotisations annuelles et part non couverte', 'jspCostChart')
        ].filter(Boolean).join('');

        const commandSummaryHtml = buildPrintCommandSummary();
        const recordsTableHtml = buildPrintRecordsTable(rows);

        const contentHtml = `
          <div class="print-only" style="display:block;">
            <table class="print-shell" role="presentation">
              <thead>
                <tr>
                  <td>
                    <div class="print-header-repeat">
                      <img src="LogoSDISblanc.png" alt="Logo SDIS Nord vaudois" />
                      <div>
                        <div class="print-header-title">SDIS régional du Nord vaudois</div>
                        <div class="print-header-sub">Monitoring de formations spécifiques</div>
                      </div>
                    </div>
                  </td>
                </tr>
              </thead>
              <tfoot>
                <tr>
                  <td>
                    <div class="print-footer-repeat">
                      <div>${escapeHtml(filenameOnly)}</div>
                      <div>Page <span class="print-page-counter"></span></div>
                    </div>
                  </td>
                </tr>
              </tfoot>
              <tbody>
                <tr>
                  <td>
                    <h1 class="print-report-title">Rapport filtré de commandement</h1>
                    <div class="print-filter-summary">${escapeHtml(filterSummary)}<br>Édité le ${escapeHtml(editedAt)}</div>

                    <section class="print-section" style="margin-bottom:12px;">
                      <div class="print-kpi-grid">
                        <div class="print-kpi-card"><div class="print-kpi-value">${global.nonComptabilises}</div><div class="print-kpi-label">Événements non comptabilisés</div></div>
                        <div class="print-kpi-card"><div class="print-kpi-value">${global.exercices}</div><div class="print-kpi-label">Événements comptabilisés</div></div>
                        <div class="print-kpi-card"><div class="print-kpi-value">${global.convoques}</div><div class="print-kpi-label">Convoqués</div></div>
                        <div class="print-kpi-card"><div class="print-kpi-value">${global.presents}</div><div class="print-kpi-label">Présents</div></div>
                      </div>
                      <div class="print-kpi-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));">
                        <div class="print-kpi-card"><div class="print-kpi-value">${fmtPercent(global.tauxBrut)}</div><div class="print-kpi-label">Taux de présence brut</div></div>
                        <div class="print-kpi-card"><div class="print-kpi-value">${fmtPercent(global.tauxAjuste)}</div><div class="print-kpi-label">Taux de présence ajusté</div></div>
                      </div>
                    </section>

                    ${commandSummaryHtml}

                    <section class="card print-section" style="margin-bottom:12px; page-break-before:always;"><h2 class="section-title"><span class="section-icon"><svg viewBox="0 0 24 24"><path d="M5 9.2h3V19H5zm5.5-4.2h3V19h-3zm5.5 7h3V19h-3z"/></svg></span><span>Synthèses</span></h2><div class="table-wrap print-table-wrap">${domainHtml}</div><div style="height:10px"></div><div class="table-wrap print-table-wrap">${coverageHtml}</div><div style="height:10px"></div><div class="table-wrap print-table-wrap">${oiHtml}</div><div style="height:10px"></div><div class="table-wrap print-table-wrap">${dapHtml}</div></section>

                    <section class="card print-section" style="margin-bottom:12px;"><h2 class="section-title"><span class="section-icon"><svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.98 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg></span><span>Synthèse par public cible</span></h2><div class="table-wrap print-table-wrap">${subHtml}</div></section>

                    <section class="card print-section" style="margin-bottom:12px; page-break-before:always;"><h2 class="section-title"><span class="section-icon"><svg viewBox="0 0 24 24"><path d="M5 9.2h3V19H5zm5.5-4.2h3V19h-3zm5.5 7h3V19h-3z"/></svg></span><span>Graphiques essentiels</span></h2><div class="print-charts-grid">${chartCards}</div></section>

                    <section class="card print-section" style="margin-bottom:12px; page-break-before:always;"><h2 class="section-title"><span class="section-icon"><svg viewBox="0 0 24 24"><path d="M4 6h2v2H4zm4 0h12v2H8zm-4 5h2v2H4zm4 0h12v2H8zm-4 5h2v2H4zm4 0h12v2H8z"/></svg></span><span>Liste des événements filtrés</span></h2><div class="print-table-wrap">${recordsTableHtml}</div></section>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>`;

        els.printArea.innerHTML = contentHtml;
        els.printArea.style.display = 'block';

        const cleanupPrintArea = () => {
          els.printArea.innerHTML = '';
          els.printArea.style.display = 'none';
          window.removeEventListener('afterprint', cleanupPrintArea);
        };

        window.addEventListener('afterprint', cleanupPrintArea, { once: true });

        setTimeout(() => {
          window.print();
          setTimeout(() => {
            if (els.printArea && els.printArea.innerHTML) cleanupPrintArea();
          }, 1500);
        }, 100);
      } catch (error) {
        console.error('Erreur export PDF filtré', error);
        alert(`Impossible de préparer l’export PDF filtré : ${error?.message || error}`);
      }
    }


function upsertRecordFromDisplayRow(row, patch = {}) {
      const base = {
        id: row.sourceType === 'record' && row.id && !String(row.id).startsWith('imported:') ? row.id : uid(),
        importedEventId: row.importedEventId || null,
        domain: row.domain,
        subStructure: row.subStructure,
        template: row.template || '',
        dateExercice: parseFlexibleDateToIso(row.dateExercice),
        statCom: row.statCom || '',
        status: row.status || 'Planifié',
        nbConvoques: toInt(row.nbConvoques),
        nbPermutation: toInt(row.nbPermutation),
        nbExtDapY1: toInt(row.nbExtDapY1),
        nbExtDapY2: toInt(row.nbExtDapY2),
        nbExtDapY3: toInt(row.nbExtDapY3),
        nbExtDapY4: toInt(row.nbExtDapY4),
        nbPresents: toInt(row.nbPresents),
        nbMaladie: toInt(row.nbMaladie),
        nbAccident: toInt(row.nbAccident),
        nbArmee: toInt(row.nbArmee),
        nbProfessionnel: toInt(row.nbProfessionnel),
        nbPrive: toInt(row.nbPrive),
        nbAbsents: toInt(row.nbAbsents),
        aComptabiliser: !!row.aComptabiliser,
        remarque: row.remarque || '',
        mutualRoles: normalizeMutualRoles(row.mutualRoles),
        mutualRolesSeriesKey: row.mutualRolesSeriesKey || getMutualizedSeriesKey(row.domain, row.template),
        isGroupedOrganExercise: !!row.isGroupedOrganExercise,
        groupExerciseDetails: Array.isArray(row.groupExerciseDetails) ? row.groupExerciseDetails : [],
        createdAt: row.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const record = { ...base, ...patch };
      const idx = records.findIndex(r => r.id === record.id || (record.importedEventId && r.importedEventId === record.importedEventId));
      if (idx >= 0) records[idx] = { ...records[idx], ...record };
      else records.push(record);
      if (record.importedEventId) {
        const ii = importedEvents.findIndex(item => item.id === record.importedEventId);
        if (ii >= 0) {
          importedEvents[ii] = normalizeImportedEvent({ ...importedEvents[ii], status: record.status, dateExercice: record.dateExercice, evenement: record.template, domain: record.domain, statCom: record.statCom, publicCible: record.subStructure });
        }
      }
    }

    function markSelectedAsEffectue() {
      const rows = getSelectedDisplayRows();
      if (!rows.length) {
        alert('Aucun événement sélectionné.');
        return;
      }
      rows.forEach(row => upsertRecordFromDisplayRow(row, { status: 'Effectué', aComptabiliser: true }));
      saveRecords();
      saveImportedEvents();
      renderImportedEventOptions();
      renderTemplateSuggestions();
      renderMonitoring();
      setImportStatus(`${rows.length} événement(s) marqué(s) comme effectué(s).`, 'ok');
    }

    /* ========================================================= */
    /* 10. RENDU ÉCRAN                                           */
    /* ========================================================= */

    function renderMonitoring() {
      const rows = filteredRecords();
      const global = summarizeRecords(rows);

      els.kpiExercices.textContent = global.exercices;
      els.kpiNonComptabilises.textContent = global.nonComptabilises;
      els.kpiConvoques.textContent = global.convoques;
      els.kpiPresents.textContent = global.presents;
      els.kpiTaux.textContent = fmtPercent(global.tauxBrut);
      els.kpiTauxAjuste.textContent = fmtPercent(global.tauxAjuste);
      if (els.kpiExcuses) els.kpiExcuses.textContent = global.excuses;
      if (els.kpiAbsents) els.kpiAbsents.textContent = global.absents;
      renderKpiBusinessAlerts(rows, global);
      renderCommandObjectives(rows);
      renderCommandDashboard(rows);
      window.MonitoringAuditLog?.logAction('dashboard-generation', 'Dashboard commandement recalculé.', { visibleRecords: rows.length });
      const selectedVisibleCount = rows.filter(record => selectedRowKeys.has(getRowSelectionKey(record))).length;
      els.recordCount.textContent = `${rows.length} événement${rows.length > 1 ? "s" : ""} • ${selectedVisibleCount} sélectionné${selectedVisibleCount > 1 ? "s" : ""}`;

      renderMonitoringDomainTable(rows);
      renderMonitoringSubTable(rows);
      renderCoverageDomainTable(rows);
      renderOrganeRateTable(rows);

      if (els.dapBusinessTableBody) {
        try {
          renderDapBusinessTable(rows);
        } catch (error) {
          console.error("Erreur synthèse DAP :", error);
          els.dapBusinessTableBody.innerHTML = `
            <tr>
              <td colspan="9" class="danger">
                Erreur de rendu dans la synthèse par section DAP.
              </td>
            </tr>
          `;
        }
      }

      renderMonitoringRecordsTable(rows);
      renderOverdueTable();
      populateGraphFilters();
      renderCharts();
    }

    function renderMonitoringDomainTable(rows) {
      const byDomain = {};
      DOMAIN_ORDER.forEach(domain => {
        byDomain[domain] = [];
      });

      rows.forEach(record => {
        if (!byDomain[record.domain]) {
          byDomain[record.domain] = [];
        }
        byDomain[record.domain].push(record);
      });

      els.domainTableBody.innerHTML = "";

      DOMAIN_ORDER.forEach(domain => {
        const summary = summarizeRecords(byDomain[domain] || []);
        const tr = document.createElement("tr");

        let domainLabel = DOMAIN_CONFIG[domain].globalLabel || "";

        if (domain === "DAP" && summary.permutations > 0) {
          domainLabel += ` • Permutations: ${summary.permutations}`;
        }

        tr.innerHTML = `
          <td><strong>${domain}</strong><br><span class="muted small">${domainLabel}</span></td>
          <td class="right">${summary.exercices}</td>
          <td class="right">${summary.convoques}</td>
          <td class="right">${summary.presents}</td>
          <td class="right">${summary.excuses}</td>
          <td class="right">${summary.absents}</td>
          <td class="right">${fmtPercent(summary.tauxBrut)}</td>
          <td class="right">${fmtPercent(summary.tauxAjuste)}</td>
          <td class="right">${fmtPercent(summary.tauxAbsenceNonExcusee)}</td>
        `;

        els.domainTableBody.appendChild(tr);
      });

  const global = summarizeRecords(rows);
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td><strong>Global total</strong></td>
    <td class="right"><strong>${global.exercices}</strong></td>
    <td class="right"><strong>${global.convoques}</strong></td>
    <td class="right"><strong>${global.presents}</strong></td>
    <td class="right"><strong>${global.excuses}</strong></td>
    <td class="right"><strong>${global.absents}</strong></td>
    <td class="right"><strong>${fmtPercent(global.tauxBrut)}</strong></td>
    <td class="right"><strong>${fmtPercent(global.tauxAjuste)}</strong></td>
    <td class="right"><strong>${fmtPercent(global.tauxAbsenceNonExcusee)}</strong></td>
  `;

  els.domainTableBody.appendChild(tr);
}

    function getSubLabel(domain, sub) {
      const cfg = DOMAIN_CONFIG[domain];
      const base = cfg?.subsLabels?.[sub] || sub;
      if (domain === 'DPS' && ['G1','C1','B1','B2'].includes(String(sub || ''))) return `DPS ${sub}`;
      if (domain === 'DAP' && ['Y1','Y2','Y3','Y4'].includes(String(sub || ''))) return `DAP ${sub}`;
      return base;
    }

    function isGlobalSubStructure(domain, subStructure) {
      const sub = String(subStructure || '').trim().toLowerCase();
      const globalLabel = String(DOMAIN_CONFIG[domain]?.globalLabel || '').trim().toLowerCase();
      return !sub || sub.includes('global') || (globalLabel && sub === globalLabel);
    }

    function getReferenceValueForRecordLike(recordLike) {
      const domain = recordLike?.domain || '';
      const sub = recordLike?.subStructure || '';
      const dateValue = recordLike?.dateExercice || new Date().toISOString().slice(0,10);
      const ref = getReferenceSnapshotForDate(dateValue);

      if (domain === 'FOBA') {
        if (isGlobalSubStructure(domain, sub)) return toInt(ref.foba.foba1) + toInt(ref.foba.foba2) + toInt(ref.foba.foba3);
        if (sub === 'FOBA 1') return toInt(ref.foba.foba1);
        if (sub === 'FOBA 2') return toInt(ref.foba.foba2);
        if (sub === 'FOBA 3') return toInt(ref.foba.foba3);
      }

      if (domain === 'PR') {
        return toInt(ref.domaines.pr);
      }

      if (domain === 'AUTO') {
        if (isGlobalSubStructure(domain, sub)) return toInt(ref.domaines.autoVl) + toInt(ref.domaines.autoPl);
        if (sub === 'Cond VL' || sub === 'Cond VL DPS') return toInt(ref.domaines.autoVl);
        if (sub === 'Cond PL') return toInt(ref.domaines.autoPl);
      }

      if (domain === 'DPS') {
        if (isGlobalSubStructure(domain, sub)) return toInt(ref.organes.dpsG1) + toInt(ref.organes.dpsC1) + toInt(ref.organes.dpsB1) + toInt(ref.organes.dpsB2);
        if (sub === 'G1') return toInt(ref.organes.dpsG1);
        if (sub === 'C1') return toInt(ref.organes.dpsC1);
        if (sub === 'B1') return toInt(ref.organes.dpsB1);
        if (sub === 'B2') return toInt(ref.organes.dpsB2);
      }

      if (domain === 'DAP') {
        if (isGlobalSubStructure(domain, sub)) return toInt(ref.organes.dapY1) + toInt(ref.organes.dapY2) + toInt(ref.organes.dapY3) + toInt(ref.organes.dapY4);
        if (sub === 'Y1') return toInt(ref.organes.dapY1);
        if (sub === 'Y2') return toInt(ref.organes.dapY2);
        if (sub === 'Y3') return toInt(ref.organes.dapY3);
        if (sub === 'Y4') return toInt(ref.organes.dapY4);
      }

      if (domain === 'JSP') {
        if (isGlobalSubStructure(domain, sub)) return toInt(ref.organes.jspG1) + toInt(ref.organes.jspC1) + toInt(ref.organes.jspB1);
        if (sub === 'JSP G1') return toInt(ref.organes.jspG1);
        if (sub === 'JSP C1') return toInt(ref.organes.jspC1);
        if (sub === 'JSP B1') return toInt(ref.organes.jspB1);
        if (sub === 'Cadets') return toInt(ref.organes.jspCadets);
      }

      return 0;
    }

    function getStatusBadge(status) {
      const value = String(status || 'Planifié');
      const slug = value.toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-');
      return `<span class="status-badge status-${slug}">${escapeHtml(value)}</span>`;
    }

    
function getDisplayRows() {
  const map = new Map();

  importedEvents.forEach(item => {
    map.set(`imported:${item.id}`, {
      id: `imported:${item.id}`,
      sourceType: 'imported',
      importedEventId: item.id,
      domain: item.domain,
      subStructure: item.subStructure,
      template: item.template,
      dateExercice: item.dateExercice,
      statCom: item.statCom || '',
      status: item.status || 'Planifié',
      aComptabiliser: false,
      nbConvoques: getReferenceValueForRecordLike(item),
      nbPermutation: 0,
      nbExtDapY1: 0,
      nbExtDapY2: 0,
      nbExtDapY3: 0,
      nbExtDapY4: 0,
      nbPresents: 0,
      nbMaladie: 0,
      nbAccident: 0,
      nbArmee: 0,
      nbProfessionnel: 0,
      nbPrive: 0,
      nbAbsents: 0,
      remarque: '',
      mutualRoles: createDefaultMutualRoles(),
      targetExclusions: createDefaultTargetExclusions(),
      mutualRolesSeriesKey: getMutualizedSeriesKey(item.domain, item.template),
      isGroupedOrganExercise: false,
      groupExerciseDetails: []
    });
  });

  records.forEach(record => {
    const baseConvoques = toInt(record.nbConvoques) > 0 ? toInt(record.nbConvoques) : getReferenceValueForRecordLike(record);
    const merged = {
      ...record,
      sourceType: 'record',
      status: record.status || 'Planifié',
      mutualRoles: normalizeMutualRoles(record.mutualRoles),
      targetExclusions: normalizeTargetExclusions(record.targetExclusions),
      mutualRolesSeriesKey: record.mutualRolesSeriesKey || getMutualizedSeriesKey(record.domain, record.template),
      nbConvoques: baseConvoques
    };

    if (record.importedEventId) {
      map.set(`imported:${record.importedEventId}`, merged);
    } else {
      map.set(`record:${record.id}`, merged);
    }
  });

  return [...map.values()].sort((a, b) => (b.dateExercice || '').localeCompare(a.dateExercice || ''));
}


    function renderMonitoringSubTable(rows) {
      const groups = [];
      const bySub = {};
      const byDomain = {};

      rows.forEach(record => {
        if (!bySub[record.subStructure]) {
          bySub[record.subStructure] = [];
        }
        bySub[record.subStructure].push(record);

        if (record.domain === "DPS" || record.domain === "DAP") {
          if (!byDomain[record.domain]) {
            byDomain[record.domain] = [];
          }
          byDomain[record.domain].push(record);
        }
      });

      Object.keys(bySub).forEach(sub => {
        const domain = bySub[sub][0]?.domain || "";
        groups.push({
          type: "sub",
          key: `${domain}:${sub}`,
          label: getSubLabel(domain, sub),
          rows: bySub[sub]
        });
      });

      els.subTableBody.innerHTML = "";

      groups
        .sort((a, b) => {
          return getSubStructureSortIndex(a.label) - getSubStructureSortIndex(b.label) ||
            a.label.localeCompare(b.label, "fr", { sensitivity: "base" });
        })
        .forEach(entry => {
          const summary = summarizeRecords(entry.rows);
          const tr = document.createElement("tr");

          tr.innerHTML = `
          <td>${entry.type === "domain" ? `<strong>${entry.label}</strong>` : entry.label}</td>
          <td class="right">${summary.exercices}</td>
          <td class="right">${summary.convoques}</td>
          <td class="right">${summary.presents}</td>
          <td class="right">${summary.excuses}</td>
          <td class="right">${summary.absents}</td>
          <td class="right">${fmtPercent(summary.tauxBrut)}</td>
        `;

          els.subTableBody.appendChild(tr);
      });
    }


    function getRowSelectionKey(record) {
      if (record.importedEventId) return `imported:${record.importedEventId}`;
      if (record.sourceType === "imported" && record.id) return String(record.id);
      return `record:${record.id}`;
    }

    function getSelectedDisplayRows() {
      return filteredRecords().filter(record => selectedRowKeys.has(getRowSelectionKey(record)));
    }

    function syncRecordsSelectionHeader(rows) {
      if (!els.selectAllRecordsCheckbox) return;
      if (!rows.length) {
        els.selectAllRecordsCheckbox.checked = false;
        els.selectAllRecordsCheckbox.indeterminate = false;
        return;
      }
      const selectedCount = rows.filter(record => selectedRowKeys.has(getRowSelectionKey(record))).length;
      els.selectAllRecordsCheckbox.checked = selectedCount > 0 && selectedCount === rows.length;
      els.selectAllRecordsCheckbox.indeterminate = selectedCount > 0 && selectedCount < rows.length;
    }

    function renderMonitoringRecordsTable(rows) {
      els.recordsTableBody.innerHTML = "";
      updateRecordsSortHeaders();

      const mutualAllocationMap = buildMutualizedRoleAllocation();
      const trainerDeductionMap = buildTrainerTargetDeductionAllocationMap();

      rows.forEach(record => {
        const tr = document.createElement("tr");
        const tauxExercice = fmtPercent(getExercisePresenceRate(record, mutualAllocationMap, trainerDeductionMap));
        const effectivePresents = getEffectivePresents(record, mutualAllocationMap);
        const metierPresents = getSessionMetierPresents(record);
        const effectiveConvoques = getEffectiveConvoques(record, trainerDeductionMap);
        const dispensesVisual = getDispensesVisualCount(record);
        const rolesSummary = getMutualRolesSummaryText(record, mutualAllocationMap);
        const countedRate = fmtPercent(getCountedPresenceRate(record, mutualAllocationMap, trainerDeductionMap));

        const rowKey = getRowSelectionKey(record);
        const isChecked = selectedRowKeys.has(rowKey);

        const extraInfos = [];
        if (dispensesVisual > 0) extraInfos.push(`Personnel dispensé : ${dispensesVisual}`);
        if (rolesSummary) extraInfos.push(rolesSummary);
        if (String(record.remarque || '').trim()) extraInfos.push(String(record.remarque).trim());
        const infoText = extraInfos.join(' | ');
        const hasInfo = infoText !== "";
        const infoIcon = hasInfo
          ? `<button class="icon-btn preview remark-icon-btn" data-preview="${record.id}" title="Consulter les informations" aria-label="Consulter les informations" data-tooltip="${escapeHtmlAttr(infoText || 'Informations complémentaires')}" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg></button>`
          : `<span class="remark-empty">—</span>`;
        const previewBtnIcon = hasInfo
          ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>`
          : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.47 6.47 0 0 0 4.23-1.57l.27.28v.79L20 21.5 21.5 20zM9.5 14A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/></svg>`;

        tr.innerHTML = `
          <td class="records-selection-cell"><input type="checkbox" class="records-selection-checkbox" data-select-row="${rowKey}" ${isChecked ? 'checked' : ''} aria-label="Sélectionner la ligne"></td>
          <td>${fmtDate(record.dateExercice)}</td>
          <td><span class="domain-cell-strong">${escapeHtml(record.domain || '')}</span></td>
          <td>${escapeHtml(getSubLabel(record.domain, record.subStructure))}</td>
          <td><div>${escapeHtml(record.template || "")}</div><div class="record-dual-note">Lecture explicite : cible nette ${effectiveConvoques} • présents comptés ${effectivePresents} • présents métier ${metierPresents} • taux métier ${tauxExercice} • taux compté ${countedRate}</div></td>
          <td>${escapeHtml(record.statCom || "")}</td>
          <td>${getStatusBadge(record.status || 'Planifié')}</td>
          <td>${record.aComptabiliser ? '<span class="ok">Oui</span>' : '<span class="warning">Non</span>'}</td>
          <td class="right"><div class="record-metric-stack"><span class="record-metric-main">${effectiveConvoques}</span><span class="record-metric-sub">brute ${toInt(record.nbConvoques)}</span></div></td>
          <td class="right"><div class="record-metric-stack"><span class="record-metric-main">${effectivePresents}</span><span class="record-metric-sub">taux compté ${countedRate}</span></div></td>
          <td class="right"><div class="record-metric-stack"><span class="record-metric-main">${metierPresents}</span><span class="record-metric-sub">encadrement ${getSessionSupportPresence(record)}</span></div></td>
          <td class="right">${dispensesVisual > 0 ? `<span class="record-dispense-pill">${dispensesVisual}</span>` : '—'}</td>
          <td class="right">${sumExcuses(record)}</td>
          <td class="right">${record.nbAbsents || 0}</td>
          <td class="right">${tauxExercice}</td>
          <td class="remark-icon-cell">${infoIcon}</td>
          <td>
            <div class="icon-actions">
              <button class="icon-btn edit" data-edit="${record.id}" title="Modifier" aria-label="Modifier" data-tooltip="Modifier" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zm14.71-9.04a1.003 1.003 0 0 0 0-1.42l-2.5-2.5a1.003 1.003 0 0 0-1.42 0l-1.96 1.96 3.75 3.75 2.13-1.79z"/></svg></button>
              <button class="icon-btn duplicate" data-dup="${record.id}" title="Dupliquer" aria-label="Dupliquer" data-tooltip="Dupliquer" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg></button>
              <button class="icon-btn preview" data-preview="${record.id}" title="Consulter les informations" aria-label="Consulter les informations" data-tooltip="${hasInfo ? escapeHtmlAttr(infoText) : 'Aperçu'}" type="button">${previewBtnIcon}</button>
              <button class="icon-btn delete" data-del="${record.id}" title="Supprimer" aria-label="Supprimer" data-tooltip="Supprimer" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1z"/></svg></button>
            </div>
          </td>
        `;

        els.recordsTableBody.appendChild(tr);
      });

      els.recordsTableBody.querySelectorAll("[data-select-row]").forEach(input => {
        input.onchange = () => {
          const key = input.dataset.selectRow;
          if (input.checked) selectedRowKeys.add(key);
          else selectedRowKeys.delete(key);
          syncRecordsSelectionHeader(rows);
        };
      });

      syncRecordsSelectionHeader(rows);

      els.recordsTableBody.querySelectorAll("[data-edit]").forEach(btn => {
        btn.onclick = () => {
          const record = rows.find(r => String(r.id) === btn.dataset.edit);
          if (!record) return;
          if (record.sourceType === 'imported' && record.importedEventId) {
            selectImportedEvent(record.importedEventId);
            switchTab('events');
          setTimeout(() => document.getElementById('f7SaisieEventsMount')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
            return;
          }
          setExerciseFormRecord(record);
          switchTab('events');
          setTimeout(() => document.getElementById('f7SaisieEventsMount')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
        };
      });

      els.recordsTableBody.querySelectorAll("[data-dup]").forEach(btn => {
        btn.onclick = () => {
          const record = rows.find(r => String(r.id) === btn.dataset.dup);
          if (!record) return;
          const copy = { ...record, id: uid(), importedEventId: null, aComptabiliser: false };
          setExerciseFormRecord(copy);
          switchTab('events');
          setTimeout(() => document.getElementById('f7SaisieEventsMount')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
          clearImportedEventSelection();
          editingId = null;
          els.saveBtn.innerHTML = getSaveButtonDefaultHTML();
        };
      });

      els.recordsTableBody.querySelectorAll("[data-preview]").forEach(btn => {
        btn.onclick = () => {
          const record = rows.find(r => String(r.id) === btn.dataset.preview);
          if (record) openExercisePreview(record);
        };
      });

      els.recordsTableBody.querySelectorAll("[data-del]").forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.del;
          const record = rows.find(r => String(r.id) === id);
          if (!record) return;
          if (!confirm('Supprimer cet événement ?')) return;

          if (record.sourceType === 'imported' && record.importedEventId) {
            importedEvents = importedEvents.filter(item => item.id !== record.importedEventId);
            saveImportedEvents();
            selectedRowKeys.delete(`imported:${record.importedEventId}`);
          } else {
            records = records.filter(item => item.id !== record.id);
            saveRecords();
            selectedRowKeys.delete(`record:${record.id}`);
          }
          editingId = null;
          selectedImportedEventId = null;
          selectedRowKeys = new Set();

          renderImportedEventOptions();
          renderTemplateSuggestions();
          renderMonitoring();
        };
      });
    }

    /* ========================================================= */
    /* 11. IMPORT / EXPORT                                       */
    /* ========================================================= */

    function downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    }

    function exportMonitoringJson() {
      try {
        const now = new Date();

        // format date: 2026-04-10_1635
        const datePart = now.toISOString().slice(0, 10);
        const timePart = now.toTimeString().slice(0, 5).replace(":", "");
        const timestamp = `${datePart}_${timePart}`;

        const filename = `monitoring_exercices_sdis_${currentYear()}_${timestamp}.json`;

        const payload = {
          version: 3,
          appVersion: APP_VERSION,
          storageSchemaVersion: window.MonitoringStorage?.getStorageDiagnostics ? window.MonitoringStorage.getStorageDiagnostics().storageSchemaVersion : 1,
          sourceVersion: APP_VERSION,
          exportedAt: now.toISOString(),

          records: Array.isArray(records) ? records : [],
          importedEvents: Array.isArray(importedEvents) ? importedEvents : [],
          referencePeriods: Array.isArray(referencePeriods) ? referencePeriods : [],
          selectedReferencePeriodId: selectedReferencePeriodId || null,
          objectives: { ...DEFAULT_OBJECTIVES, ...(objectives || getObjectivesFromForm() || {}) },
          storageDiagnostics: window.MonitoringStorage?.getStorageDiagnostics ? window.MonitoringStorage.getStorageDiagnostics() : null
        };

        const blob = new Blob(
          [JSON.stringify(payload, null, 2)],
          { type: "application/json" }
        );

        downloadBlob(blob, filename);
        window.MonitoringAuditLog?.logAction('export-json', 'Export JSON Monitoring F7 généré.', { records: payload.records.length, importedEvents: payload.importedEvents.length });

      } catch (err) {
        console.error("Erreur export JSON :", err);
        window.MonitoringAuditLog?.logError('export-json-error', 'Erreur lors de l’export JSON.', { error: err });
        alert("Erreur lors de l’export JSON");
      }
    }

    function exportMonitoringCsv(rowsOverride = null, filenameSuffix = "") {
  const rows = Array.isArray(rowsOverride) ? rowsOverride : filteredRecords();

  const header = [
    "date_evenement",
    "domaine",
    "public_cible",
    "evenement",
    "stat_com",
    "a_comptabiliser",
    "nb_convoques",
    "nb_permutation",
    "nb_ext_dap_y1",
    "nb_ext_dap_y2",
    "nb_ext_dap_y3",
    "nb_ext_dap_y4",
    "nb_ext_dap_total",
    "nb_presents",
    "nb_excuses_maladie",
    "nb_excuses_accident",
    "nb_excuses_armee",
    "nb_excuses_professionnel",
    "nb_excuses_prive",
    "nb_excuses_total",
    "nb_absents_non_excuses",
    "total_detail",
    "total_attendu",
    "formateurs_nb",
    "formateurs_compta",
    "formateurs_mutualises",
    "surveillants_nb",
    "surveillants_compta",
    "surveillants_mutualises",
    "auxiliaires_nb",
    "auxiliaires_compta",
    "auxiliaires_mutualises",
    "serie_mutualisee",
    "remarque"
  ];

  const lines = [header.join(";")];

  rows.forEach(record => {
    const nbExtDapY1 = toInt(record.nbExtDapY1);
    const nbExtDapY2 = toInt(record.nbExtDapY2);
    const nbExtDapY3 = toInt(record.nbExtDapY3);
    const nbExtDapY4 = toInt(record.nbExtDapY4);

    const nbExtDapTotal = nbExtDapY1 + nbExtDapY2 + nbExtDapY3 + nbExtDapY4;
    const nbExcusesTotal = sumExcuses(record);
    const mutualRoles = normalizeMutualRoles(record.mutualRoles);

    const totalDetail = toInt(record.nbPresents) + nbExcusesTotal + toInt(record.nbAbsents);

    const totalAttendu = getEffectiveConvoques(record);

    lines.push([
      record.dateExercice || "",
      record.domain || "",
      record.subStructure || "",
      record.template || "",
      record.statCom || "",
      record.aComptabiliser ? "Oui" : "Non",
      toInt(record.nbConvoques),
      toInt(record.nbPermutation),
      nbExtDapY1,
      nbExtDapY2,
      nbExtDapY3,
      nbExtDapY4,
      nbExtDapTotal,
      getEffectivePresents(record),
      toInt(record.nbMaladie),
      toInt(record.nbAccident),
      toInt(record.nbArmee),
      toInt(record.nbProfessionnel),
      toInt(record.nbPrive),
      nbExcusesTotal,
      toInt(record.nbAbsents),
      totalDetail,
      totalAttendu,
      mutualRoles.formateurs.count,
      mutualRoles.formateurs.aComptabiliser ? "Oui" : "Non",
      mutualRoles.formateurs.mutualiser ? "Oui" : "Non",
      mutualRoles.surveillants.count,
      mutualRoles.surveillants.aComptabiliser ? "Oui" : "Non",
      mutualRoles.surveillants.mutualiser ? "Oui" : "Non",
      mutualRoles.auxiliaires.count,
      mutualRoles.auxiliaires.aComptabiliser ? "Oui" : "Non",
      mutualRoles.auxiliaires.mutualiser ? "Oui" : "Non",
      getMutualizedSeriesKey(record.domain, record.template),
      `"${String(record.remarque || "").replaceAll('"', '""')}"`
    ].join(";"));
  });

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8"
  });

  downloadBlob(blob, `monitoring_evenements_sdis_${currentYear()}${filenameSuffix ? '_' + filenameSuffix : ''}.csv`);
  window.MonitoringAuditLog?.logAction('export-csv', 'Export CSV Monitoring F7 généré.', { rows: rows.length });
}

    function importMonitoringJsonFile(file) {
      try { validateImportFile(file, [".json"], MAX_IMPORT_JSON_BYTES); }
      catch (e) { window.MonitoringAuditLog?.logError('import-json-error', 'Validation fichier JSON refusée.', { error:e }); alert("Import JSON impossible : " + e.message); return; }
      if (!confirm("Importer ce fichier JSON Monitoring F7 ?\n\nEn cas d’erreur, les données locales précédentes seront restaurées.")) return;
      const reader = new FileReader();

      reader.onload = () => {
        const rollbackKeys = [STORAGE_KEY, STORAGE_KEY_IMPORTED_EVENTS, STORAGE_KEY_OBJECTIVES, STORAGE_KEY_REFERENCES, REFERENCE_PERIODS_STORAGE_KEY];
        const rollbackSnapshot = window.MonitoringStorage?.snapshot ? window.MonitoringStorage.snapshot(rollbackKeys) : null;
        const previousState = {
          records: Array.isArray(records) ? [...records] : [],
          importedEvents: Array.isArray(importedEvents) ? [...importedEvents] : [],
          referencePeriods: Array.isArray(referencePeriods) ? [...referencePeriods] : [],
          selectedReferencePeriodId,
          objectives: objectives && typeof objectives === "object" ? { ...objectives } : { ...DEFAULT_OBJECTIVES },
          editingId,
          selectedImportedEventId,
          selectedRowKeys: new Set(selectedRowKeys || [])
        };
        try {
          const rawText = String(reader.result || "").replace(/^\uFEFF/, "");
          if (!rawText.trim()) throw new Error("JSON vide.");
          if (/\u0000/.test(rawText)) throw new Error("JSON illisible ou binaire détecté.");
          const parsed = JSON.parse(rawText);
          validateMonitoringImportPayload(parsed);

          if (parsed && typeof parsed === "object" && Array.isArray(parsed.referencePeriods)) {
            records = Array.isArray(parsed.records) ? parsed.records.map(normalizeMonitoringRecord) : [];
            saveRecords();
            importedEvents = Array.isArray(parsed.importedEvents) ? parsed.importedEvents.map(normalizeImportedEvent) : loadImportedEvents();
            saveImportedEvents();
            referencePeriods = saveReferencePeriods(parsed.referencePeriods.map(normalizeReferencePeriod));
            selectedReferencePeriodId = parsed.selectedReferencePeriodId && referencePeriods.find(p => p.id === parsed.selectedReferencePeriodId) ? parsed.selectedReferencePeriodId : (referencePeriods[0]?.id || null);
            if (!referencePeriods.length) ensureAtLeastOneReferencePeriod();
            if (parsed.objectives && typeof parsed.objectives === "object") saveObjectives(parsed.objectives); else saveObjectives(objectives);
            applyObjectivesToForm();
            editingId = null;
            selectedImportedEventId = null;
            selectedRowKeys = new Set();
            populateReferencePeriodOptions();
            const selected = getSelectedReferencePeriod();
            applyReferenceDataToForm(selected);
            calculateReferenceGlobals();
            renderImportedEventOptions();
            renderTemplateSuggestions();
            renderMonitoring();
            window.MonitoringAuditLog?.logAction('import-json', 'Import JSON effectué.', { records: records.length, importedEvents: importedEvents.length });
            alert("Import JSON effectué.");
            return;
          }

          if (Array.isArray(parsed)) {
            records = parsed.map(normalizeMonitoringRecord);
            saveRecords();
            renderImportedEventOptions();
            renderTemplateSuggestions();
            renderMonitoring();
            window.MonitoringAuditLog?.logAction('import-json', 'Import JSON legacy effectué.', { records: records.length });
            alert("Import JSON effectué.");
            return;
          }

          if (!parsed || typeof parsed !== "object") throw new Error("Format JSON invalide");

          if (Array.isArray(parsed.records)) { records = parsed.records.map(normalizeMonitoringRecord); saveRecords(); }
          if (Array.isArray(parsed.importedEvents)) { importedEvents = parsed.importedEvents.map(normalizeImportedEvent); saveImportedEvents(); }
          if (parsed.objectives && typeof parsed.objectives === "object") { saveObjectives(parsed.objectives); applyObjectivesToForm(); }

          if (parsed.references && typeof parsed.references === "object") {
            const legacy = parsed.references;
            referencePeriods = saveReferencePeriods([
              normalizeReferencePeriod({
                id: uid(),
                dateEffective: legacy.dateEffective || legacy.effectifUpdatedAt || new Date().toISOString().slice(0, 10),
                foba: { foba1: toInt(legacy.foba?.foba1 ?? legacy.effectifFoba1), foba2: toInt(legacy.foba?.foba2 ?? legacy.effectifFoba2), foba3: toInt(legacy.foba?.foba3 ?? legacy.effectifFoba3) },
                domaines: { pr: toInt(legacy.domaines?.pr ?? legacy.effectifPrGlobal), autoVl: toInt(legacy.domaines?.autoVl ?? legacy.effectifAutoVl), autoPl: toInt(legacy.domaines?.autoPl ?? legacy.effectifAutoPl) },
                organes: {
                  dpsG1: toInt(legacy.organes?.dpsG1 ?? legacy.effectifDpsG1), dpsC1: toInt(legacy.organes?.dpsC1 ?? legacy.effectifDpsC1), dpsB1: toInt(legacy.organes?.dpsB1 ?? legacy.effectifDpsB1), dpsB2: toInt(legacy.organes?.dpsB2 ?? legacy.effectifDpsB2),
                  dapY1: toInt(legacy.organes?.dapY1 ?? legacy.effectifDapY1), dapY2: toInt(legacy.organes?.dapY2 ?? legacy.effectifDapY2), dapY3: toInt(legacy.organes?.dapY3 ?? legacy.effectifDapY3), dapY4: toInt(legacy.organes?.dapY4 ?? legacy.effectifDapY4),
                  jspG1: toInt(legacy.organes?.jspG1 ?? legacy.effectifJspG1), jspC1: toInt(legacy.organes?.jspC1 ?? legacy.effectifJspC1), jspB1: toInt(legacy.organes?.jspB1 ?? legacy.effectifJspB1), jspCadets: toInt(legacy.organes?.jspCadets ?? legacy.effectifJspCadets)
                },
                suivi: {
                  updatedByNip: legacy.suivi?.updatedByNip || "",
                  updatedBy: legacy.suivi?.updatedBy || legacy.effectifUpdatedBy || "",
                  generatedByNip: legacy.suivi?.generatedByNip || "",
                  generatedBy: legacy.suivi?.generatedBy || connectedUserDisplayName(),
                  updateScope: legacy.suivi?.updateScope === "domains" ? "domains" : "all",
                  updateDomains: Array.isArray(legacy.suivi?.updateDomains) ? legacy.suivi.updateDomains : [...REFERENCE_UPDATE_DOMAINS],
                  commentaire: legacy.suivi?.commentaire || legacy.effectifCommentaire || ""
                }
              })
            ]);
            selectedReferencePeriodId = referencePeriods[0]?.id || null;
            populateReferencePeriodOptions();
            const selected = getSelectedReferencePeriod();
            applyReferenceDataToForm(selected);
            calculateReferenceGlobals();
          }

          renderImportedEventOptions();
          renderTemplateSuggestions();
          renderMonitoring();
          window.MonitoringAuditLog?.logAction('import-json', 'Import JSON effectué.', { records: records.length, importedEvents: importedEvents.length });
          alert("Import JSON effectué.");
        } catch (e) {
          if (rollbackSnapshot && window.MonitoringStorage?.restore) window.MonitoringStorage.restore(rollbackSnapshot);
          records = previousState.records;
          importedEvents = previousState.importedEvents;
          referencePeriods = previousState.referencePeriods;
          selectedReferencePeriodId = previousState.selectedReferencePeriodId;
          objectives = previousState.objectives;
          editingId = previousState.editingId;
          selectedImportedEventId = previousState.selectedImportedEventId;
          selectedRowKeys = previousState.selectedRowKeys;
          try {
            populateReferencePeriodOptions();
            applyObjectivesToForm();
            const selected = getSelectedReferencePeriod();
            applyReferenceDataToForm(selected);
            calculateReferenceGlobals();
            renderImportedEventOptions();
            renderTemplateSuggestions();
            renderMonitoring();
          } catch (renderErr) { console.error("Erreur restauration UI après import JSON", renderErr); }
          console.error("Erreur import JSON", e);
          window.MonitoringAuditLog?.logError('import-json-error', 'Erreur import JSON avec rollback local.', { error:e });
          alert("Import impossible : " + (e && e.message ? e.message : "Erreur inconnue") + "\n\nLes données locales précédentes ont été conservées.");
        }
      };

      reader.onerror = () => { window.MonitoringAuditLog?.logError('import-json-error', 'Lecture fichier JSON échouée.', {}); alert("Import JSON impossible : lecture du fichier échouée."); };
      reader.readAsText(file);
    }

    /* ========================================================= */
    /* 12. GÉNÉRATION MODÈLES ANNUELS                            */
    /* ========================================================= */

    function generateAnnualTemplates() {
      const year = currentYear();
      const toCreate = [];
      const existingKeys = new Set(
        importedEvents.map(item => [
          item.domain || "",
          item.subStructure || "",
          item.template || "",
          String(yearOf(item.dateExercice || `${year}-01-01`))
        ].join("|"))
      );

      DOMAIN_ORDER.forEach(domain => {
        const cfg = DOMAIN_CONFIG[domain];

        cfg.subs.forEach((sub, subIndex) => {
          let templates = [...cfg.templates];

          if (domain === "FOBA" && sub === "FOBA 3") {
            templates = ["Exercice FOBA 1", "Exercice FOBA 2", "Exercice FOBA 3"];
          }

          if (domain === "AUTO" && sub === "Cond VL") {
            templates = [
              "Exercice Car 1.1",
              "Exercice Car 1.2",
              "Exercice Car 1.3",
              "Exercice Car 1.4",
              "Exercice Car 1.5"
            ];
          }

          if (domain === "AUTO" && sub === "Cond PL") {
            templates = [
              "Exercice Truck 1.1",
              "Exercice Truck 1.2",
              "Exercice Truck 1.3",
              "Exercice Truck 1.4"
            ];
          }

          templates.forEach((template, templateIndex) => {
            const key = [domain, sub, template, String(year)].join("|");
            if (existingKeys.has(key)) return;

            const month = String(Math.min(12, templateIndex + 1)).padStart(2, "0");
            const day = String(Math.min(28, subIndex + 1)).padStart(2, "0");

            toCreate.push({
              id: uid(),
              domain,
              subStructure: sub,
              template,
              dateExercice: `${year}-${month}-${day}`,
              statCom: 'À planifier',
              status: 'Planifié',
              createdAt: new Date().toISOString()
            });
            existingKeys.add(key);
          });
        });
      });

      if (!toCreate.length) {
        alert("Aucun nouvel événement annuel à générer pour cette année.");
        return;
      }

      importedEvents.push(...toCreate);
      saveImportedEvents();
      renderImportedEventOptions();
      renderTemplateSuggestions();
      renderMonitoring();
      alert(`${toCreate.length} événement(s) généré(s) pour ${year}.`);
    }

    /* ========================================================= */
    /* 13. EVENTS / INITIALISATION                               */
    /* ========================================================= */

    function bindExerciseFormEvents() {
      bindDateMaskInput(els.dateExercice);
      bindDateMaskInput(els.effectifUpdatedAt);

      els.domain.addEventListener("change", () => {
        clearImportedEventSelection();
        updateDomainDependentFields();
        renderImportedEventOptions();
        applyReferenceConvoquesToForm(true);
        updateMutualRolesUI();
        validateExerciseForm();
      });

      els.subStructure.addEventListener("change", () => {
        clearImportedEventSelection();
        const currentTemplate = els.template.value;
        updateDomainDependentFields();
        els.template.value = currentTemplate;
        updateDapSpecificUI();
        applyReferenceConvoquesToForm(true);
        updateMutualRolesUI();
        validateExerciseForm();
      });

      if (els.eventSelect) {
        els.eventSelect.disabled = false;
        els.eventSelect.style.pointerEvents = "auto";
        els.eventSelect.addEventListener("click", () => {
          if (!Array.isArray(importedEvents) || importedEvents.length === 0) {
            updateImportedEventInfo("Aucun événement importé disponible. Utilise d’abord le bouton « Importer les événements annuels ».");
          }
        });
        els.eventSelect.addEventListener("change", () => {
          const eventId = els.eventSelect.value;
          if (!eventId) {
            clearImportedEventSelection();
            return;
          }
          window.MonitoringAuditLog?.logAction('select-imported-event', 'Sélection d’un événement importé.', { eventId });
          selectImportedEvent(eventId);
        });
      }

      if (els.newManualEventBtn) {
        els.newManualEventBtn.addEventListener("click", () => {
          const preservedDate = els.dateExercice.value;
          resetExerciseForm();
          if (preservedDate) {
            els.dateExercice.value = fmtDateInputValue(parseFlexibleDateToIso(preservedDate));
          }
          applyReferenceConvoquesToForm(true);
          updateMutualRolesUI();
          updateImportedEventInfo("Saisie manuelle activée.");
        });
      }

      [
  "nbConvoques",
  "nbPresents",
  "nbMaladie",
  "nbAccident",
  "nbArmee",
  "nbProfessionnel",
  "nbPrive",
  "nbAbsents",
  "nbPermutation",
  "nbExtDapY1",
  "nbExtDapY2",
  "nbExtDapY3",
  "nbExtDapY4",
  "aComptabiliser",
  "dateExercice",
  "template",
  "statCom",
  "eventStatus",
  "roleFormateursCount",
  "roleSurveillantsCount",
  "roleAuxiliairesCount",
  "roleFormateursCompta",
  "roleFormateursMutualise",
  "roleSurveillantsCompta",
  "roleSurveillantsMutualise",
  "roleAuxiliairesCompta",
  "roleAuxiliairesMutualise",
  "roleDispensesCount",
  "roleDispensesDeduct",
  "roleDispensesMutualise"
].forEach(id => {
  if (!els[id]) return;

  const shouldRefreshGroupedStructure = ["template", "dateExercice"].includes(id);

  els[id].addEventListener("input", () => {
    if ([
      "nbConvoques",
      "nbPresents",
      "nbMaladie",
      "nbAccident",
      "nbArmee",
      "nbProfessionnel",
      "nbPrive",
      "nbAbsents",
      "nbPermutation",
      "nbExtDapY1",
      "nbExtDapY2",
      "nbExtDapY3",
      "nbExtDapY4",
      "roleFormateursCount",
      "roleSurveillantsCount",
      "roleAuxiliairesCount",
      "roleDispensesCount"
    ].includes(id)) {
      const current = String(els[id].value || "").replace(/\D/g, "").slice(0, 4);
      els[id].value = current === "" ? "0" : String(parseInt(current, 10));
    }

    if (id === "statCom") {
      els.statCom.value = String(els.statCom.value || "").slice(0, 6);
    }

    if (id === "dateExercice") {
      els.dateExercice.value = autoFormatDateInput(els.dateExercice.value);
    }

    updateDapExternalTotal();

    if (["template", "dateExercice", "statCom"].includes(id) && !editingId) {
      clearImportedEventSelection();
    }

    if (id === "dateExercice" || id === "template" || id === "eventStatus") {
      applyReferenceConvoquesToForm();
      updateMutualRolesUI();
    }

    if (id === "nbPresents" && toInt(els.nbPresents.value) > 0 && els.eventStatus.value === "Planifié") {
      els.eventStatus.value = "Effectué";
    }

    if (id === "eventStatus" && els.eventStatus.value === "Annulé") {
      els.aComptabiliser.value = "false";
    } else if (id === "eventStatus" && els.eventStatus.value === "Effectué" && els.aComptabiliser.value === "false") {
      els.aComptabiliser.value = "true";
    }

    if (shouldRefreshGroupedStructure) {
      updateGroupedExerciseUI(getCurrentGroupExerciseDetailsFromUI());
    }

    validateExerciseForm();
  });

  els[id].addEventListener("change", () => {
    updateDapExternalTotal();

    if (id === "nbPresents" && toInt(els.nbPresents.value) > 0 && els.eventStatus.value === "Planifié") {
      els.eventStatus.value = "Effectué";
    }

    if (id === "eventStatus" && els.eventStatus.value === "Annulé") {
      els.aComptabiliser.value = "false";
    } else if (id === "eventStatus" && els.eventStatus.value === "Effectué" && els.aComptabiliser.value === "false") {
      els.aComptabiliser.value = "true";
    }

    if (id === "dateExercice") {
      els.dateExercice.value = fmtDateInputValue(parseFlexibleDateToIso(els.dateExercice.value));
      applyReferenceConvoquesToForm(true);
    }

    updateMutualRolesUI();

    if (shouldRefreshGroupedStructure) {
      updateGroupedExerciseUI(getCurrentGroupExerciseDetailsFromUI());
    }

    validateExerciseForm();
  });
});

      els.saveBtn.addEventListener("click", () => {
        if (!validateExerciseForm()) return;

        const record = getExerciseFormRecord();
        record.dateExercice = parseFlexibleDateToIso(record.dateExercice);
        const index = records.findIndex(r => r.id === record.id);

        if (index >= 0) {
          records[index] = { ...records[index], ...record };
        } else {
          records.push(record);
        }

        saveRecords();

        if (record.importedEventId) {
          const importedIndex = importedEvents.findIndex(item => item.id === record.importedEventId);
          if (importedIndex >= 0) {
            importedEvents[importedIndex] = normalizeImportedEvent({
              ...importedEvents[importedIndex],
              dateExercice: record.dateExercice,
              evenement: record.template,
              domain: record.domain,
              statCom: record.statCom,
              publicCible: record.subStructure,
              status: record.status
            });
            saveImportedEvents();
            renderImportedEventOptions();
            renderTemplateSuggestions();
          }
        }

        renderMonitoring();
        resetExerciseForm();
      });

      els.resetBtn.addEventListener("click", resetExerciseForm);

      els.duplicateBtn.addEventListener("click", () => {
        const record = getExerciseFormRecord();
        record.dateExercice = parseFlexibleDateToIso(record.dateExercice);
        record.id = uid();
        record.importedEventId = null;
        record.aComptabiliser = false;

        editingId = null;
        setExerciseFormRecord(record);
        clearImportedEventSelection();
        editingId = null;
        els.saveBtn.innerHTML = getSaveButtonDefaultHTML();
      });

      if (els.closePreviewBtn) {
        els.closePreviewBtn.addEventListener("click", closeExercisePreview);
      }

      if (els.previewModal) {
        els.previewModal.addEventListener("click", e => {
          if (e.target === els.previewModal) {
            closeExercisePreview();
          }
        });
      }
    }

    function bindFilterEvents() {
      els.filterDomain.addEventListener("change", updateFilterSubOptions);

      els.applyFiltersBtn.addEventListener("click", renderMonitoring);

      if (els.filterCompta) {
        els.filterCompta.addEventListener("change", renderMonitoring);
      }
      if (els.recordsSearch) {
        els.recordsSearch.addEventListener("input", renderMonitoring);
      }

      els.clearFiltersBtn.addEventListener("click", () => {
        els.filterDomain.value = "";
        updateFilterSubOptions();
        els.filterSub.value = "";
        if (els.filterCompta) els.filterCompta.value = "";
        if (els.recordsSearch) els.recordsSearch.value = "";
        renderMonitoring();
      });
    }

    function bindImportExportEvents() {
      if (els.exportJsonBtn) {
        els.exportJsonBtn.onclick = exportMonitoringJson;
      }

      if (els.exportCsvBtn) {
        els.exportCsvBtn.onclick = exportMonitoringCsv;
      }

      if (els.importJsonBtn && els.jsonFileInput) {
        els.importJsonBtn.onclick = () => {
          els.jsonFileInput.click();
        };

        els.jsonFileInput.onchange = e => {
          const file = e.target.files && e.target.files[0];
          if (file) {
            importMonitoringJsonFile(file);
          }
          e.target.value = "";
        };
      }

      if (els.importEventsBtn && els.eventsFileInput) {
        els.importEventsBtn.disabled = false;
        els.importEventsBtn.style.pointerEvents = "auto";
        els.eventsFileInput.disabled = false;
        els.eventsFileInput.addEventListener("click", () => {
          window.MonitoringAuditLog?.logAction('import-events-picker-open', 'Sélecteur de fichier événements ouvert.', {});
        });
        els.importEventsBtn.onclick = () => {
          window.MonitoringAuditLog?.logAction('import-events-launch', 'Import événement lancé depuis le bouton.', {});
          try {
            els.eventsFileInput.click();
          } catch (error) {
            window.MonitoringAuditLog?.logError('import-events-picker-error', 'Ouverture du sélecteur de fichier événements impossible.', { error });
            alert("Import événements impossible : le sélecteur de fichier n’a pas pu être ouvert.");
          }
        };

        els.eventsFileInput.onchange = e => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          window.MonitoringAuditLog?.logAction('import-events-file-selected', 'Fichier événements sélectionné.', { name: file.name, size: file.size, type: file.type });
          if (!confirm("Importer les événements depuis ce CSV ?\n\nLes doublons seront ignorés selon les règles existantes.")) { e.target.value = ""; return; }

          try { validateImportFile(file, [".csv", ".txt"], MAX_IMPORT_CSV_BYTES); }
          catch (err) { window.MonitoringAuditLog?.logError('import-events-invalid-file', 'Fichier événements invalide.', { error:err, name:file.name, size:file.size, type:file.type }); setImportStatus("Import CSV impossible : " + err.message, "error"); alert("Fichier événements invalide : " + err.message); e.target.value = ""; return; }

          const reader = new FileReader();
          reader.onload = () => {
            try {
              const result = importAnnualEventsFromCsvText(reader.result);
              const details = [];
              if (result.duplicates && result.duplicates.length) {
                details.push("Doublons ignorés :\n- " + result.duplicates.join("\n- "));
              }
              if (result.ignored && result.ignored.length) {
                details.push("Lignes non prises en compte :\n- " + result.ignored.join("\n- "));
              }
              const fullMessage = result.summary + (details.length ? "\n\n" + details.join("\n\n") : "");
              setImportStatus(fullMessage, "ok");
              window.MonitoringAuditLog?.logAction('import-events-success', 'Import événements réussi.', { added: result.added, duplicates: result.duplicates?.length || 0, ignored: result.ignored?.length || 0 });
              alert(fullMessage);
            } catch (error) {
              setImportStatus("Import des événements impossible : " + error.message, "error");
              window.MonitoringAuditLog?.logError('import-events-error', 'Import événements échoué.', { error });
              alert("Import des événements impossible : " + error.message);
            } finally {
              e.target.value = "";
            }
          };
          reader.readAsText(file);
        };
      }
    }



    function deleteSelectedEvents() {
      const rows = getSelectedDisplayRows();
      if (!rows.length) {
        alert("Aucun événement sélectionné.");
        return;
      }
      if (!confirm(`Supprimer ${rows.length} événement(s) sélectionné(s) ?`)) return;

      const importedIdsToDelete = new Set();
      const recordIdsToDelete = new Set();

      rows.forEach(row => {
        if (row.sourceType === "imported" && row.importedEventId) {
          importedIdsToDelete.add(row.importedEventId);
        }
        if (row.sourceType === "record" && row.id && !String(row.id).startsWith("imported:")) {
          recordIdsToDelete.add(row.id);
        }
      });

      if (importedIdsToDelete.size) {
        importedEvents = importedEvents.filter(item => !importedIdsToDelete.has(item.id));
      }

      records = records.filter(item => !recordIdsToDelete.has(item.id));

      [...importedIdsToDelete].forEach(id => selectedRowKeys.delete(`imported:${id}`));
      [...recordIdsToDelete].forEach(id => selectedRowKeys.delete(`record:${id}`));

      saveImportedEvents();
      saveRecords();
      clearImportedEventSelection();
      renderImportedEventOptions();
      renderTemplateSuggestions();
      resetExerciseForm();
      renderMonitoring();
      setImportStatus(`${rows.length} événement(s) sélectionné(s) supprimé(s).`, "ok");
    }

    function exportSelectedEventsCsv() {
      const rows = getSelectedDisplayRows();
      if (!rows.length) {
        alert("Aucun événement sélectionné.");
        return;
      }
      exportMonitoringCsv(rows, "selection");
    }

    function toggleSelectAllVisible(forceChecked = null) {
      const rows = filteredRecords();
      const shouldCheck = forceChecked !== null ? forceChecked : !(rows.length && rows.every(record => selectedRowKeys.has(getRowSelectionKey(record))));
      rows.forEach(record => {
        const key = getRowSelectionKey(record);
        if (shouldCheck) selectedRowKeys.add(key);
        else selectedRowKeys.delete(key);
      });
      renderMonitoring();
    }

    function deleteDisplayedEvents() {
      const rows = filteredRecords();
      if (!rows.length) {
        alert("Aucun événement visible à supprimer.");
        return;
      }

      const filterDomain = String(els.filterDomain?.value || "").trim();
      const scopeLabel = filterDomain ? `du domaine ${filterDomain}` : "visibles";
      if (!confirm(`Supprimer ${rows.length} événement(s) ${scopeLabel} ?`)) return;

      const importedIdsToDelete = new Set();
      const recordIdsToDelete = new Set();

      rows.forEach(row => {
        if (row.sourceType === "imported" && row.importedEventId) {
          importedIdsToDelete.add(row.importedEventId);
        }
        if (row.sourceType === "record" && row.id && !String(row.id).startsWith("imported:")) {
          recordIdsToDelete.add(row.id);
        }
      });

      if (importedIdsToDelete.size) {
        importedEvents = importedEvents.filter(item => !importedIdsToDelete.has(item.id));
      }

      records = records.filter(item => !recordIdsToDelete.has(item.id));

      [...importedIdsToDelete].forEach(id => selectedRowKeys.delete(`imported:${id}`));
      [...recordIdsToDelete].forEach(id => selectedRowKeys.delete(`record:${id}`));

      saveImportedEvents();
      saveRecords();
      clearImportedEventSelection();
      renderImportedEventOptions();
      renderTemplateSuggestions();
      resetExerciseForm();
      renderMonitoring();
      setImportStatus(`${rows.length} événement(s) supprimé(s).`, "ok");
    }

    function bindTabEvents() {
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tabTarget || 'dashboard'));
      });
    }

    function bindUtilityEvents() {
      els.seedBtn.addEventListener("click", generateAnnualTemplates);

      if (els.deleteFilteredEventsBtn) {
        els.deleteFilteredEventsBtn.addEventListener("click", deleteDisplayedEvents);
      }

      if (els.selectAllVisibleBtn) {
        els.selectAllVisibleBtn.addEventListener("click", () => toggleSelectAllVisible(true));
      }

      if (els.clearSelectionBtn) {
        els.clearSelectionBtn.addEventListener("click", () => {
          selectedRowKeys.clear();
          renderMonitoring();
        });
      }

      if (els.exportSelectedCsvBtn) {
        els.exportSelectedCsvBtn.addEventListener("click", exportSelectedEventsCsv);
      }

      if (els.markSelectedDoneBtn) {
        els.markSelectedDoneBtn.addEventListener("click", markSelectedAsEffectue);
      }

      if (els.exportPdfBtn) {
        els.exportPdfBtn.addEventListener("click", exportFilteredSummaryPdf);
      }

      if (els.deleteSelectedBtn) {
        els.deleteSelectedBtn.addEventListener("click", deleteSelectedEvents);
      }

      if (els.selectAllRecordsCheckbox) {
        els.selectAllRecordsCheckbox.addEventListener("change", () => {
          toggleSelectAllVisible(els.selectAllRecordsCheckbox.checked);
        });
      }

      els.clearDataBtn.addEventListener("click", () => {
        if (!confirm("Effacer toutes les données locales de Monitoring F7 ?\n\nAction sensible : cette suppression concerne les données stockées dans ce navigateur.")) return;
        if (!confirm("Confirmation finale : supprimer définitivement les exercices, événements importés, objectifs et effectifs locaux ?")) return;

        records = [];
        importedEvents = [];
        selectedRowKeys.clear();
        saveRecords();
        saveImportedEvents();

        if (window.MonitoringStorage?.remove) window.MonitoringStorage.remove(STORAGE_KEY_REFERENCES); else localStorage.removeItem(STORAGE_KEY_REFERENCES);
        if (window.MonitoringStorage?.remove) window.MonitoringStorage.remove(REFERENCE_PERIODS_STORAGE_KEY); else localStorage.removeItem(REFERENCE_PERIODS_STORAGE_KEY);
        if (window.MonitoringStorage?.remove) window.MonitoringStorage.remove(STORAGE_KEY_IMPORTED_EVENTS); else localStorage.removeItem(STORAGE_KEY_IMPORTED_EVENTS);
        if (window.MonitoringStorage?.remove) window.MonitoringStorage.remove(STORAGE_KEY_OBJECTIVES); else localStorage.removeItem(STORAGE_KEY_OBJECTIVES);

        referencePeriods = [];
        selectedReferencePeriodId = null;
        objectives = { ...DEFAULT_OBJECTIVES };
        applyObjectivesToForm();

        ensureAtLeastOneReferencePeriod();
        populateReferencePeriodOptions();

        const selected = getSelectedReferencePeriod();
        applyReferenceDataToForm(selected);
        calculateReferenceGlobals();
        renderImportedEventOptions();
        renderTemplateSuggestions();

        resetExerciseForm();
        window.MonitoringAuditLog?.logAction('sensitive-reset', 'Suppression/reset des données locales confirmé.', {});
        renderMonitoring();
      });
    }

    /* ========================================================= */
    /* ANALYSES AVANCÉES — NOUVELLES FONCTIONS                   */
    /* ========================================================= */

    let _analysesAlertThreshold = 60;

    
function renderSeriesAnalysisTable(rows) {
  const tbody = document.getElementById('seriesAnalysisTableBody');
  const note  = document.getElementById('seriesAnalysisNote');
  if (!tbody) return;
  tbody.innerHTML = '';

  const seriesKeys = new Set();
  rows.filter(r => r.aComptabiliser).forEach(r => {
    const key = getMutualizedSeriesKey(r.domain, r.template);
    if (key) seriesKeys.add(key);
  });

  if (!seriesKeys.size) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#6b7280;padding:16px;">Aucune série détectée dans les données filtrées.</td></tr>';
    if (note) note.textContent = 'Aucune série détectée dans la sélection active.';
    return;
  }

  const analyses = [...seriesKeys].sort().map(k => getSeriesAnalysis(k)).filter(Boolean);

  analyses.forEach((a, aIdx) => {
    // ── Ligne de synthèse principale (1 par série) ──────────────────────────
    const taux = a.tauxMetierSerie;
    const tauxCompte = a.tauxCompteSerie;
    const toneCls = taux == null ? '' : taux >= 80 ? 'ok' : taux >= 60 ? 'warning' : 'danger';
    const tauxCountCls = tauxCompte == null ? '' : tauxCompte >= 80 ? 'ok' : tauxCompte >= 60 ? 'warning' : 'danger';

    const refNetteText = a.refNetteUnique != null ? String(a.refNetteUnique) : '—';
    const tauxText = taux != null ? fmtPercent(taux) : '—';
    const tauxCompteText = tauxCompte != null ? fmtPercent(tauxCompte) : '—';

    // Ligne série (summary)
    const trSerie = document.createElement('tr');
    trSerie.className = 'series-summary-row' + (aIdx % 2 === 0 ? '' : ' series-summary-row-alt');
    trSerie.innerHTML =
  `<td class="series-key-cell">` +
    `<div class="series-key-label">${escapeHtml(a.seriesKey)}</div>` +
    `<div class="series-key-meta">` +
      `Réf brute : ${a.referenceTargetText}` +
      ` • Form. uniques retirés : ${a.formateursUniquesRetires}` +
      (a.dispensesVisuels > 0 ? ` • Dispensés retirés : ${a.dispensesVisuels}` : '') +
      ` • Réf nette unique informative : ${refNetteText}` +
      (a.coverageGap != null ? ` • Écart : ${a.coverageGap}` : '') +
    `</div>` +
  `</td>` +
  `<td class="right series-sessions-cell"><strong>${a.sessionCount}</strong></td>` +
  `<td class="right"><strong>${a.referenceTargetText}</strong></td>` +
  `<td class="right series-nette-cell"><strong>${a.totalNette}</strong><div class="series-ref-nette-sub" title="Référence nette unique informative : effectif unique après seuls retraits réellement déduits de la cible">Réf nette unique inf. : ${refNetteText}</div></td>` +
  `<td class="right"><strong>${a.totalPresents}</strong></td>` +
  `<td class="right"><strong>${a.totalMetierPresents}</strong></td>` +
  `<td class="right"><strong class="${toneCls}">${tauxText}</strong></td>` +
  `<td class="right"><strong class="${tauxCountCls}">${tauxCompteText}</strong></td>`;
    tbody.appendChild(trSerie);

    // ── Sous-lignes sessions ────────────────────────────────────────────────
a.sessions.forEach((s, i) => {
  const inferredSeriesDomain =
    a.seriesKey?.startsWith('PR-') ? 'PR'
    : a.seriesKey?.startsWith('DAP-') ? 'DAP'
    : '';

  const sessionDomain = s.domain || a.domain || inferredSeriesDomain;
  const safeSessionTaux = capRateForDomain(sessionDomain, s.taux);
  const safeSessionTauxCompte = capRateForDomain(sessionDomain, s.tauxCompte);

  const sTauxCls = safeSessionTaux >= 80 ? 'ok' : safeSessionTaux >= 60 ? 'warning' : 'danger';
  const sTauxCountCls = safeSessionTauxCompte >= 80 ? 'ok' : safeSessionTauxCompte >= 60 ? 'warning' : 'danger';

  const subTr = document.createElement('tr');
  subTr.className = 'series-session-row';
  subTr.innerHTML =
    `<td class="series-session-cell">` +
      `<span class="session-arrow">↳</span> ` +
      `<span class="session-label">S${i+1} — ${fmtDate(s.date)}</span> ` +
      `<span class="session-template">${escapeHtml(s.template || '')}</span>` +
      `<div class="session-meta">` +
        `Cible brute : ${s.brute}` +
        ` • Retrait : ${s.ded}` +
        (s.dedFormateurs > 0 ? ` (form. : ${s.dedFormateurs})` : '') +
        (s.dedDispenses > 0 ? ` (disp. : ${s.dedDispenses})` : '') +
        ` • Cible nette : ${s.nette}` +
        (s.supportPresent > 0 ? ` • Encadrement : ${s.supportPresent}` : '') +
        (s.dispensesVisual > 0 ? ` • Dispensés visuels : ${s.dispensesVisual}` : '') +
      `</div>` +
    `</td>` +
    `<td class="right series-sub-neutral">—</td>` +
    `<td class="right series-sub-neutral">—</td>` +
    `<td class="right series-sub-val">${s.nette}</td>` +
    `<td class="right series-sub-val">${s.presents}</td>` +
    `<td class="right series-sub-val">${s.metierPresents}</td>` +
    `<td class="right ${sTauxCls} series-sub-val">${fmtPercent(safeSessionTaux)}</td>` +
    `<td class="right ${sTauxCountCls} series-sub-val">${fmtPercent(safeSessionTauxCompte)}</td>`;
  tbody.appendChild(subTr);
});

    // Ligne de séparation entre séries (sauf après la dernière)
    if (aIdx < analyses.length - 1) {
      const sep = document.createElement('tr');
      sep.innerHTML = '<td colspan="8" class="series-separator-row"></td>';
      tbody.appendChild(sep);
    }
  });

  if (note) {
    const totalSessions = analyses.reduce((acc, a) => acc + a.sessionCount, 0);
    note.textContent = analyses.length + ' série(s) — ' + totalSessions + ' session(s). '
  + 'Taux métier = min(présents métier cumulés, cible nette cumulée) / cible nette cumulée. '
  + 'Taux compté = présents comptés cumulés / cible nette cumulée. '
  + 'La référence nette unique informative (colonne "Réf série") ne tient compte que des retraits réellement déduits de la cible et ne sert pas de dénominateur aux taux de série.';
  }
}

    function renderAnalysesTab() {
      const rows = filteredRecords();
      renderMonthlyTrendChart(rows);
      renderExcuseMotifChart(rows);
      renderExcuseByDomainTable(rows);
      renderCriticalEventsTable(rows, _analysesAlertThreshold);
      renderRealisationTable();
      renderRegularityTable(rows);
      renderSeriesAnalysisTable(rows);
    }

    /* — Évolution mensuelle du taux de présence — */
    function renderMonthlyTrendChart(rows) {
      const canvas = document.getElementById('monthlyTrendChart');
      if (!canvas) return;
      const compta = rows.filter(r => r.aComptabiliser);
      const mutualAllocationMap = buildMutualizedRoleAllocation();
      const trainerDeductionMap = buildTrainerTargetDeductionAllocationMap();
      const byMonth = {};
      compta.forEach(r => {
        const d = r.dateExercice ? r.dateExercice.slice(0, 7) : null;
        if (!d) return;
        if (!byMonth[d]) byMonth[d] = { presents: 0, convoques: 0 };
        byMonth[d].presents += getPresenceRateNumerator(r);
        byMonth[d].convoques += getEffectiveConvoques(r, trainerDeductionMap);
      });
      const labels = Object.keys(byMonth).sort();
      const rates = labels.map(m => byMonth[m].convoques > 0 ? parseFloat((100 * byMonth[m].presents / byMonth[m].convoques).toFixed(1)) : 0);
      const MONTH_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
      const displayLabels = labels.map(m => {
        const [y, mo] = m.split('-');
        return `${MONTH_FR[parseInt(mo,10)-1]} ${y}`;
      });
      drawLineChart(canvas, displayLabels, rates, 'Taux de présence brut mensuel (%)');
    }

    function drawLineChart(canvas, labels, data, label) {
      return window.MonitoringRenderCharts?.drawLineChart
        ? window.MonitoringRenderCharts.drawLineChart(canvas, labels, data, label)
        : drawBarChart(canvas, labels, data, label);
    }

    /* — Répartition des motifs d'excuse — */
    function renderExcuseMotifChart(rows) {
      const canvas = document.getElementById('excuseMotifChart');
      if (!canvas) return;
      const compta = rows.filter(r => r.aComptabiliser);
      const totals = { Maladie: 0, Accident: 0, Armée: 0, Professionnel: 0, Privé: 0 };
      compta.forEach(r => {
        totals['Maladie']       += toInt(r.nbMaladie);
        totals['Accident']      += toInt(r.nbAccident);
        totals['Armée']         += toInt(r.nbArmee);
        totals['Professionnel'] += toInt(r.nbProfessionnel);
        totals['Privé']         += toInt(r.nbPrive);
      });
      const labels = Object.keys(totals);
      const data = Object.values(totals).map(v => Number.isFinite(Number(v)) ? Number(v) : 0);
      if (typeof Chart === 'undefined') { drawPieChart(canvas, labels, data, 'Motifs d’excuse'); return; }
      try { if (canvas._chartInstance) { canvas._chartInstance.destroy(); canvas._chartInstance = null; } } catch { canvas._chartInstance = null; }
      try { canvas._chartInstance = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: data.map((_, index) => getChartColor(index))
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const total = ctx.dataset.data.reduce((a,b) => a+b, 0);
                  const pct = total > 0 ? (100 * ctx.parsed / total).toFixed(1) : 0;
                  return `${ctx.label}: ${ctx.parsed} (${pct}%)`;
                }
              }
            }
          }
        }
      });
      } catch (err) { console.warn('Graphique motifs indisponible, rendu canvas simple.', err); drawPieChart(canvas, labels, data, 'Motifs d’excuse'); }
    }

    /* — Motifs d'excuse par domaine — */
    function renderExcuseByDomainTable(rows) {
      const tbody = document.getElementById('excuseByDomainTableBody');
      if (!tbody) return;
      tbody.innerHTML = '';
      const compta = rows.filter(r => r.aComptabiliser);
      const byDomain = {};
      DOMAIN_ORDER.forEach(d => { byDomain[d] = { maladie:0, accident:0, armee:0, pro:0, prive:0, total:0, convoques:0 }; });
      compta.forEach(r => {
        if (!byDomain[r.domain]) return;
        const b = byDomain[r.domain];
        b.maladie    += toInt(r.nbMaladie);
        b.accident   += toInt(r.nbAccident);
        b.armee      += toInt(r.nbArmee);
        b.pro        += toInt(r.nbProfessionnel);
        b.prive      += toInt(r.nbPrive);
        b.total      += sumExcuses(r);
        b.convoques  += getEffectiveConvoques(r);
      });
      let gM=0,gA=0,gAr=0,gP=0,gPr=0,gT=0,gC=0;
      DOMAIN_ORDER.forEach(d => {
        const b = byDomain[d];
        if (b.convoques === 0) return;
        const pct = b.convoques > 0 ? (100 * b.total / b.convoques).toFixed(1) : '—';
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${d}</strong></td><td class="right">${b.maladie}</td><td class="right">${b.accident}</td><td class="right">${b.armee}</td><td class="right">${b.pro}</td><td class="right">${b.prive}</td><td class="right">${b.total}</td><td class="right">${pct}%</td>`;
        tbody.appendChild(tr);
        gM+=b.maladie; gA+=b.accident; gAr+=b.armee; gP+=b.pro; gPr+=b.prive; gT+=b.total; gC+=b.convoques;
      });
      const gPct = gC > 0 ? (100 * gT / gC).toFixed(1) : '—';
      const tr = document.createElement('tr');
      tr.style.fontWeight = '700';
      tr.innerHTML = `<td><strong>Total</strong></td><td class="right">${gM}</td><td class="right">${gA}</td><td class="right">${gAr}</td><td class="right">${gP}</td><td class="right">${gPr}</td><td class="right">${gT}</td><td class="right">${gPct}%</td>`;
      tbody.appendChild(tr);
    }

    /* — Exercices sous le seuil d'alerte — */
    function renderCriticalEventsTable(rows, threshold) {
      const tbody = document.getElementById('criticalEventsTableBody');
      const note  = document.getElementById('criticalEventsNote');
      if (!tbody) return;
      tbody.innerHTML = '';
      const compta = rows.filter(r => r.aComptabiliser && r.status === 'Effectué');
      const mutualAllocationMap = buildMutualizedRoleAllocation();
      const trainerDeductionMap = buildTrainerTargetDeductionAllocationMap();
      const critical = compta.filter(r => {
        const conv = getEffectiveConvoques(r, trainerDeductionMap);
        if (conv === 0) return false;
        return (100 * getEffectivePresents(r, mutualAllocationMap) / conv) < threshold;
      }).sort((a,b) => {
        const ra = getEffectiveConvoques(a, trainerDeductionMap) > 0 ? (getEffectivePresents(a, mutualAllocationMap)/getEffectiveConvoques(a, trainerDeductionMap)) : 0;
        const rb = getEffectiveConvoques(b, trainerDeductionMap) > 0 ? (getEffectivePresents(b, mutualAllocationMap)/getEffectiveConvoques(b, trainerDeductionMap)) : 0;
        return ra - rb;
      });
      if (!critical.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#6b7280;">Aucun exercice sous le seuil de ${threshold}%</td></tr>`;
        if (note) note.textContent = '';
        return;
      }
      critical.forEach(r => {
        const conv = getEffectiveConvoques(r, trainerDeductionMap);
        const effectivePresents = getEffectivePresents(r, mutualAllocationMap);
        const rawTaux = conv > 0 ? (100 * effectivePresents / conv) : 0;
        const taux = capRateForRecord(r, rawTaux);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${fmtDate(r.dateExercice)}</td>
          <td>${escapeHtml(r.domain)}</td>
          <td>${escapeHtml(r.template)}</td>
          <td class="right">${conv}</td>
          <td class="right">${effectivePresents}</td>
          <td class="right danger">${fmtPercent(taux)}</td>`;
        tbody.appendChild(tr);
      });
      if (note) note.textContent = `${critical.length} exercice(s) sous le seuil de ${threshold}% sur ${compta.length} comptabilisés effectués.`;
    }

    /* — Taux de réalisation du plan annuel — */
    function renderRealisationTable() {
      const tbody = document.getElementById('realisationTableBody');
      if (!tbody) return;
      tbody.innerHTML = '';
      // Note: La réalisation du plan s'appuie sur TOUS les événements (non filtrés par statut compta)
      // pour refléter fidèlement le plan annuel complet.
      const all = getDisplayRows();
      const byDomain = {};
      DOMAIN_ORDER.forEach(d => { byDomain[d] = { planifie:0, effectue:0, reporte:0, annule:0 }; });
      all.forEach(r => {
        const b = byDomain[r.domain];
        if (!b) return;
        const s = r.status || 'Planifié';
        if (s === 'Planifié')  b.planifie++;
        else if (s === 'Effectué') b.effectue++;
        else if (s === 'Reporté')  b.reporte++;
        else if (s === 'Annulé')   b.annule++;
      });
      let gPl=0,gEf=0,gRe=0,gAn=0;
      DOMAIN_ORDER.forEach(d => {
        const b = byDomain[d];
        const total = b.planifie + b.effectue + b.reporte + b.annule;
        if (total === 0) return;
        const taux = total > 0 ? (100 * b.effectue / total).toFixed(1) : '—';
        const cls  = parseFloat(taux) >= 80 ? 'ok' : parseFloat(taux) >= 60 ? 'warning' : 'danger';
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${d}</strong></td><td class="right">${b.planifie}</td><td class="right">${b.effectue}</td><td class="right">${b.reporte}</td><td class="right">${b.annule}</td><td class="right ${cls}">${taux}%</td>`;
        tbody.appendChild(tr);
        gPl+=b.planifie; gEf+=b.effectue; gRe+=b.reporte; gAn+=b.annule;
      });
      const gTotal = gPl+gEf+gRe+gAn;
      const gTaux = gTotal > 0 ? (100 * gEf / gTotal).toFixed(1) : '—';
      const gCls  = parseFloat(gTaux) >= 80 ? 'ok' : parseFloat(gTaux) >= 60 ? 'warning' : 'danger';
      const tr = document.createElement('tr');
      tr.style.fontWeight = '700';
      tr.innerHTML = `<td><strong>Total</strong></td><td class="right">${gPl}</td><td class="right">${gEf}</td><td class="right">${gRe}</td><td class="right">${gAn}</td><td class="right ${gCls}">${gTaux}%</td>`;
      tbody.appendChild(tr);
    }

    /* — Indice de régularité par domaine — */
    function renderRegularityTable(rows) {
      const tbody = document.getElementById('regularityTableBody');
      if (!tbody) return;
      tbody.innerHTML = '';
      const compta = rows.filter(r => r.aComptabiliser && r.status === 'Effectué');
      const mutualAllocationMap = buildMutualizedRoleAllocation();
      const trainerDeductionMap = buildTrainerTargetDeductionAllocationMap();
      const byDomain = {};
      DOMAIN_ORDER.forEach(d => { byDomain[d] = []; });
      compta.forEach(r => {
        if (!byDomain[r.domain]) return;
        const conv = getEffectiveConvoques(r, trainerDeductionMap);
        if (conv === 0) return;
        byDomain[r.domain].push(getExercisePresenceRate(r, mutualAllocationMap, trainerDeductionMap));
      });
      DOMAIN_ORDER.forEach(d => {
        const rates = byDomain[d];
        if (!rates.length) return;
        const n    = rates.length;
        const mean = rates.reduce((a,b) => a+b, 0) / n;
        const min  = Math.min(...rates);
        const max  = Math.max(...rates);
        const variance = rates.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
        const sigma = Math.sqrt(variance);
        const reg   = sigma < 10 ? 'Élevée' : sigma < 20 ? 'Moyenne' : 'Faible';
        const regCls = sigma < 10 ? 'ok' : sigma < 20 ? 'warning' : 'danger';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${d}</strong></td>
          <td class="right">${n}</td>
          <td class="right">${mean.toFixed(1)}%</td>
          <td class="right">${min.toFixed(1)}%</td>
          <td class="right">${max.toFixed(1)}%</td>
          <td class="right">${sigma.toFixed(1)}</td>
          <td class="right ${regCls}">${reg}</td>`;
        tbody.appendChild(tr);
      });
      if (!tbody.childElementCount) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#6b7280;">Aucune donnée comptabilisée effectuée disponible.</td></tr>`;
      }
    }

    /* — Bind bouton seuil d'alerte — */
    function bindAnalysesEvents() {
      const btn   = document.getElementById('applyAlertBtn');
      const input = document.getElementById('alertThresholdInput');
      if (btn && input) {
        btn.addEventListener('click', () => {
          const val = parseInt(input.value, 10);
          if (!Number.isFinite(val) || val < 0 || val > 100) {
            alert('Seuil invalide (0–100)');
            return;
          }
          _analysesAlertThreshold = val;
          renderCriticalEventsTable(filteredRecords(), _analysesAlertThreshold);
        });
      }
    }

    window.addEventListener("load", async () => {
      try {
        if (window.MonitoringStorage?.initStorage) {
          try {
            const diagnostics = await window.MonitoringStorage.initStorage();
            console.info("Monitoring F7 stockage v65", diagnostics);
            window.MonitoringAuditLog?.logInfo('storage-init', 'StorageService initialisé.', diagnostics || {});
            loadApplicationDataFromLocalCache();
          } catch (storageError) {
            console.warn("Monitoring F7 : stockage IndexedDB non disponible, fallback localStorage actif.", storageError);
            window.MonitoringAuditLog?.logError('indexeddb-error', 'StorageService indisponible, fallback localStorage actif.', { error: storageError });
            loadApplicationDataFromLocalCache();
          }
        }
        if (!records.length && !referencePeriods.length && window.MonitoringStorage?.initStorage == null) {
          loadApplicationDataFromLocalCache();
        }
        populateDomainOptions();
        ensureAtLeastOneReferencePeriod();

        initializeReferenceData();
        applyObjectivesToForm();
        renderImportedEventOptions();
        renderTemplateSuggestions();
        bindReferenceEvents();
        bindObjectiveEvents();
        bindExerciseFormEvents();
        bindFilterEvents();
        bindImportExportEvents();
        bindAnalysesEvents();
        bindUtilityEvents();
        bindTabEvents();
        bindRecordsSortHeaders();

        els.detailTotal.value = "0";
        els.totalExcuses.value = "0";
        els.validationMessage.innerHTML = "Prêt à enregistrer.";
        updateTargetVisibilitySummary();

        renderMonitoring();
        window.__monitoringF7AppReady = true;
        startOnlineRefreshAfterInitialRender();
      } catch (error) {
        console.error("Erreur d'initialisation :", error);
        window.MonitoringAuditLog?.logError('application-init-error', 'Erreur d’initialisation application.', { error });
        alert("Erreur JavaScript au chargement. Ouvre la console du navigateur pour voir le détail exact.");
      }
    });
  
