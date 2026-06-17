import { useEffect, useRef } from "react";

declare global {
  interface Window {
    __gmapsLoading?: Promise<void>;
    __initGmaps?: () => void;
    google?: any;
  }
}

function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__gmapsLoading) return window.__gmapsLoading;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;
  if (!key) return Promise.reject(new Error("Missing Maps key"));

  window.__gmapsLoading = new Promise<void>((resolve) => {
    window.__initGmaps = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async&callback=__initGmaps${
      channel ? `&channel=${channel}` : ""
    }`;
    s.async = true;
    document.head.appendChild(s);
  });
  return window.__gmapsLoading;
}

interface Props {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Address input using Google Places API (New) AutocompleteSuggestion.
 * Falls back to a plain input if the API can't load.
 */
export function AddressInput({ id, value, onChange, placeholder, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef<any>(null);
  const placesRef = useRef<any>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    loadMaps()
      .then(async () => {
        if (!mounted || !window.google?.maps?.importLibrary) return;
        const places = await window.google.maps.importLibrary("places");
        placesRef.current = places;
        sessionTokenRef.current = new places.AutocompleteSessionToken();
      })
      .catch(() => {
        /* silent fallback */
      });
    return () => {
      mounted = false;
    };
  }, []);

  const fetchSuggestions = async (input: string) => {
    const places = placesRef.current;
    const list = listRef.current;
    if (!list) return;
    if (!places || input.trim().length < 3) {
      list.innerHTML = "";
      return;
    }
    try {
      const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: sessionTokenRef.current,
        includedRegionCodes: ["fr"],
        language: "fr",
      });
      list.innerHTML = "";
      suggestions.slice(0, 5).forEach((s: any) => {
        const p = s.placePrediction;
        if (!p) return;
        const item = document.createElement("button");
        item.type = "button";
        item.className =
          "block w-full text-left px-3 py-2 text-sm hover:bg-muted/70 focus:bg-muted/70 focus:outline-none";
        item.textContent = p.text?.toString() ?? "";
        item.onclick = () => {
          onChange(p.text?.toString() ?? "");
          list.innerHTML = "";
          // refresh session token after a selection
          if (placesRef.current) {
            sessionTokenRef.current = new placesRef.current.AutocompleteSessionToken();
          }
        };
        list.appendChild(item);
      });
    } catch {
      /* ignore */
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => fetchSuggestions(v), 200);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        value={value}
        onChange={handleChange}
        onBlur={() => {
          // delay so click on suggestion fires
          setTimeout(() => {
            if (listRef.current) listRef.current.innerHTML = "";
          }, 150);
        }}
        placeholder={placeholder}
        className={
          className ??
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
        }
      />
      <div
        ref={listRef}
        className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md empty:hidden"
      />
    </div>
  );
}
