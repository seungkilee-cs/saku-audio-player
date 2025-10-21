import React, { useState, useEffect, useCallback } from "react";
import { usePlayback } from "../context/PlaybackContext";
import "../styles/AutoEqSearchPanel.css";

const PAGE_SIZE = 20;

const EMPTY_RESULTS = Object.freeze({
  results: [],
  total: 0,
  sources: [],
  types: [],
  targets: [],
});

export default function AutoEqSearchPanel({ onPresetImported = () => {} }) {
  const {
    autoEqState,
    autoEqSearch,
    autoEqFetchRaw,
    autoEqGetSettings,
    autoEqUpdateSettings,
    autoEqGetRecentSearches,
    importAutoEqPreset,
  } = usePlayback();

  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [importingId, setImportingId] = useState(null);
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [availableTargets, setAvailableTargets] = useState([]);

  const { availability } = autoEqState;

  useEffect(() => {
    const settings = autoEqGetSettings();
    if (settings?.githubToken) {
      setTokenInput(settings.githubToken);
    } else {
      setTokenInput("");
    }
  }, [autoEqGetSettings]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      autoEqSearch({
        query,
        source: sourceFilter === "all" ? null : sourceFilter,
        type: typeFilter === "all" ? null : typeFilter,
        target: targetFilter === "all" ? null : targetFilter,
        page,
        pageSize: PAGE_SIZE,
      })
        .then((data) => {
          if (cancelled) return;
          setResults({
            results: data.results,
            total: data.total,
            sources: data.sources,
            types: data.types,
            targets: data.targets,
          });
          setAvailableTargets(data.targets ?? []);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : String(err));
          setResults(EMPTY_RESULTS);
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [autoEqSearch, page, query, sourceFilter, targetFilter, typeFilter]);

  const handleImport = useCallback(
    async (entry) => {
      setImportingId(entry.id);
      setError(null);
      try {
        await importAutoEqPreset(entry, { saveToLibrary });
        if (saveToLibrary) {
          onPresetImported();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setImportingId(null);
      }
    },
    [importAutoEqPreset, onPresetImported, saveToLibrary],
  );

  const handleTokenSave = useCallback(() => {
    const trimmed = tokenInput.trim();
    autoEqUpdateSettings({ githubToken: trimmed || null });
  }, [tokenInput, autoEqUpdateSettings]);

  const handleClearToken = useCallback(() => {
    setTokenInput("");
    autoEqUpdateSettings({ githubToken: null });
  }, [autoEqUpdateSettings]);

  const recentSearches = autoEqGetRecentSearches();

  if (!availability) {
    return (
      <div className="autoeq-panel autoeq-panel--offline">
        <div className="autoeq-panel__offline">
          <span role="img" aria-label="warning">⚠️</span>
          <p>AutoEQ search unavailable. Check your connection or use manual upload below.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="autoeq-panel">
      <header className="autoeq-panel__header">
        <div>
          <h4>AutoEQ Database</h4>
          <p className="autoeq-panel__subtitle">
            Search {results.total.toLocaleString()} presets from community sources.
          </p>
        </div>
        {recentSearches.length > 0 ? (
          <div className="autoeq-panel__recent" aria-label="recent searches">
            <span>Recent:</span>
            <div className="autoeq-panel__chips">
              {recentSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  className="autoeq-panel__chip"
                  onClick={() => {
                    setQuery(term);
                    setPage(1);
                  }}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </header>

      <section className="autoeq-panel__controls">
        <div className="autoeq-panel__search-row">
          <input
            type="search"
            className="autoeq-panel__search"
            placeholder="Search headphones or IEMs (e.g., Sony WH-1000XM4)"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            aria-label="Search AutoEQ presets"
          />
          <label className="autoeq-panel__checkbox">
            <input
              type="checkbox"
              checked={saveToLibrary}
              onChange={(event) => setSaveToLibrary(event.target.checked)}
            />
            <span>Save to library after import</span>
          </label>
        </div>

        <div className="autoeq-panel__filters">
          <select
            value={sourceFilter}
            onChange={(event) => {
              setSourceFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by source"
          >
            <option value="all">All sources</option>
            {results.sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by device type"
          >
            <option value="all">All types</option>
            {results.types.map((typeOption) => (
              <option key={typeOption} value={typeOption}>
                {typeOption === "over-ear" ? "Over-ear" : "In-ear"}
              </option>
            ))}
          </select>

          <select
            value={targetFilter}
            onChange={(event) => {
              setTargetFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by target"
          >
            <option value="all">All targets</option>
            {availableTargets.map((targetOption) => (
              <option key={targetOption} value={targetOption}>
                {targetOption}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="autoeq-panel__reset"
            onClick={() => {
              setQuery("");
              setSourceFilter("all");
              setTypeFilter("all");
              setTargetFilter("all");
              setPage(1);
            }}
          >
            Reset
          </button>
        </div>

        <button
          type="button"
          className="autoeq-panel__advanced-toggle"
          onClick={() => setShowAdvanced((prev) => !prev)}
          aria-expanded={showAdvanced}
        >
          Advanced settings
        </button>

        {showAdvanced ? (
          <div className="autoeq-panel__advanced">
            <label className="autoeq-panel__token-label" htmlFor="autoeq-token">
              GitHub token (optional)
            </label>
            <div className="autoeq-panel__token-row">
              <input
                id="autoeq-token"
                type="password"
                className="autoeq-panel__token-input"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="ghp_..."
                aria-label="GitHub personal access token"
              />
              <button type="button" onClick={handleTokenSave}>
                Save
              </button>
              <button type="button" onClick={handleClearToken}>
                Clear
              </button>
            </div>
            <p className="autoeq-panel__token-help">
              Tokens raise rate limits to 5000 requests/hour. Leave blank to use anonymous requests.
            </p>
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="autoeq-panel__error" role="alert">
          <span role="img" aria-label="error">❌</span>
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">
            ×
          </button>
        </div>
      ) : null}

      <section className="autoeq-panel__results">
        {loading ? (
          <div className="autoeq-panel__loading" aria-live="polite">Searching…</div>
        ) : null}

        {!loading && results.results.length === 0 ? (
          <div className="autoeq-panel__empty">
            <p>No presets found. Try different keywords or filters.</p>
          </div>
        ) : null}

        {!loading && results.results.length > 0 ? (
          <>
            <ul className="autoeq-panel__list" role="list">
              {results.results.map((preset) => (
                <li key={preset.id} className="autoeq-panel__item">
                  <div className="autoeq-panel__item-info">
                    <h5>{preset.name}</h5>
                    <div className="autoeq-panel__item-meta">
                      <span className="badge badge--source">{preset.source}</span>
                      <span className="badge badge--type">{preset.type}</span>
                      <span className="badge badge--target">{preset.target}</span>
                    </div>
                  </div>
                  <div className="autoeq-panel__item-actions">
                    <button
                      type="button"
                      onClick={() => handleImport(preset)}
                      disabled={importingId === preset.id || autoEqState.loading}
                    >
                      {importingId === preset.id ? "Importing…" : "Import"}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const text = await autoEqFetchRaw(preset);
                          const blob = new Blob([text], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const anchor = document.createElement("a");
                          anchor.href = url;
                          anchor.download = `${preset.name} ParametricEQ.txt`;
                          document.body.appendChild(anchor);
                          anchor.click();
                          document.body.removeChild(anchor);
                          URL.revokeObjectURL(url);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : String(err));
                        }
                      }}
                    >
                      Download
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="autoeq-panel__pagination">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                aria-label="Previous page"
              >
                Previous
              </button>
              <span>
                Page {page} of {Math.max(1, Math.ceil(results.total / PAGE_SIZE))} ({results.total} results)
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={page >= Math.ceil(results.total / PAGE_SIZE)}
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
