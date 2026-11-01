// Collision Voice — on-device storage (IndexedDB).
// The draft text lives in "kv"; photos and thumbnails are kept as files in "blobs",
// so a job can hold many photos instead of hitting localStorage's ~5 MB cap.

const Store = (() => {
  const DB_NAME = "collisionVoice";
  const DB_VERSION = 1;
  let dbPromise = null;

  function openDb() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          request.result.createObjectStore("kv");
          request.result.createObjectStore("blobs");
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return dbPromise;
  }

  /** Runs one request inside a transaction and resolves with its result once the transaction commits. */
  async function run(storeName, mode, makeRequest) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const request = makeRequest(tx.objectStore(storeName));
      tx.oncomplete = () => resolve(request ? request.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Storage transaction aborted"));
    });
  }

  return {
    getState: () => run("kv", "readonly", (s) => s.get("draft")),
    setState: (state) => run("kv", "readwrite", (s) => s.put(state, "draft")),
    putBlob: (key, blob) => run("blobs", "readwrite", (s) => s.put(blob, key)),
    getBlob: (key) => run("blobs", "readonly", (s) => s.get(key)),
    deleteBlob: (key) => run("blobs", "readwrite", (s) => s.delete(key)),
    clearBlobs: () => run("blobs", "readwrite", (s) => s.clear()),

    /** Asks the browser not to evict this data when the device is low on space. */
    async requestPersistence() {
      try {
        if (navigator.storage?.persist) return await navigator.storage.persist();
      } catch (err) {
        console.warn("Persistent storage request failed", err);
      }
      return false;
    },

    async estimate() {
      try {
        if (navigator.storage?.estimate) return await navigator.storage.estimate();
      } catch (err) {
        console.warn("Storage estimate failed", err);
      }
      return null;
    },
  };
})();
