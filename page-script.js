// Runs in MAIN world at document_start to intercept Kumo's fetch calls
// and read the auth token from localStorage.
(function () {
  const originalFetch = window.fetch;

  function extractUrl(input) {
    if (typeof input === "string") return input;
    if (input instanceof Request) return input.url;
    if (input instanceof URL) return input.href;
    return String(input);
  }

  async function extractBody(input, options) {
    // Try options.body first (fetch(url, { body: ... }))
    if (options?.body) {
      try {
        return typeof options.body === "string" ? JSON.parse(options.body) : options.body;
      } catch {}
    }
    // Try Request object body (fetch(new Request(url, { body: ... })))
    if (input instanceof Request) {
      try {
        const cloned = input.clone();
        return await cloned.json();
      } catch {}
    }
    return null;
  }

  // --- Fetch interceptor ---
  window.fetch = async function (...args) {
    const [input, options] = args;

    // Clone Request before passing to original fetch (body can only be read once)
    let inputForBody = input;
    if (input instanceof Request) {
      inputForBody = input.clone();
    }

    const response = await originalFetch.apply(this, args);

    try {
      const url = extractUrl(input);

      const isDealsSearch =
        (url.includes("api.withkumo.com") || url.includes("apiv2.withkumo.com")) &&
        (url.includes("/deals/index") || url.includes("/deals/search"));

      if (isDealsSearch) {
        const requestBody = await extractBody(inputForBody, options);
        const cloned = response.clone();
        const responseBody = await cloned.json();

        let token = null;
        try {
          token = localStorage.getItem("with-kumo-token");
        } catch {}

        window.postMessage(
          {
            type: "KUMO_EXPORT_STATE",
            filters: requestBody?.filters || null,
            totalCount: responseBody.meta?.total_count ?? responseBody.data?.length ?? 0,
            totalPages: responseBody.meta?.total_pages ?? 1,
            token,
          },
          "*"
        );
      }
    } catch (e) {
      console.warn("[Kumo Export] Failed to intercept fetch:", e);
    }

    return response;
  };

  // --- Token polling (MAIN world can read localStorage) ---
  function readToken() {
    try {
      return localStorage.getItem("with-kumo-token");
    } catch {
      return null;
    }
  }

  let lastToken = readToken();
  window.postMessage({ type: "KUMO_EXPORT_TOKEN", token: lastToken }, "*");

  setInterval(() => {
    const token = readToken();
    if (token !== lastToken) {
      lastToken = token;
      window.postMessage({ type: "KUMO_EXPORT_TOKEN", token }, "*");
    }
  }, 5000);
})();
