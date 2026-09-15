export const EMBED_ROUTE = "/embed/register"

export type EmbedTheme = "light" | "dark" | "auto"

export const EMBED_EVENTS = {
  ready: "curatio-embed:ready",
  resize: "curatio-embed:resize",
  success: "curatio-embed:success",
  theme: "curatio-embed:theme",
} as const

export interface EmbedResizeMessage {
  type: typeof EMBED_EVENTS.resize
  height: number
}

export interface EmbedReadyMessage {
  type: typeof EMBED_EVENTS.ready
}

export interface EmbedSuccessMessage {
  type: typeof EMBED_EVENTS.success
}

export interface EmbedThemeMessage {
  type: typeof EMBED_EVENTS.theme
  theme: EmbedTheme
}

export type EmbedFrameMessage = EmbedReadyMessage | EmbedResizeMessage | EmbedSuccessMessage

export function postToHost(message: EmbedFrameMessage): void {
  if (typeof window === "undefined" || window.parent === window) return
  window.parent.postMessage(message, "*")
}

export function parseEmbedTheme(value: unknown): EmbedTheme | null {
  return value === "light" || value === "dark" || value === "auto" ? value : null
}

export interface EmbedSnippetOptions {
  theme?: EmbedTheme
  height?: number
}

export function buildEmbedSnippet(appOrigin: string, options: EmbedSnippetOptions = {}): string {
  const origin = appOrigin.replace(/\/+$/, "")
  const theme = options.theme && options.theme !== "auto" ? `?theme=${options.theme}` : ""
  const fallbackHeight = options.height ?? 1180
  const src = `${origin}${EMBED_ROUTE}${theme}`

  return `<!-- Curatio consultant registration form. Paste into any HTML page or CMS block (e.g. WordPress "Custom HTML"). -->
<iframe
  id="curatio-registration"
  src="${src}"
  title="Consultant registration — Curatio International Foundation"
  loading="lazy"
  style="width:100%;max-width:100%;border:0;display:block;height:${fallbackHeight}px"
></iframe>
<script>
  (function () {
    var frame = document.getElementById("curatio-registration");
    if (!frame) return;
    window.addEventListener("message", function (event) {
      if (event.source !== frame.contentWindow) return;
      var data = event.data || {};
      if (data.type === "${EMBED_EVENTS.resize}" && data.height) {
        frame.style.height = Math.ceil(data.height) + "px";
      }
      if (data.type === "${EMBED_EVENTS.success}") {
        /* Conversion hook: fire your own analytics or thank-you UI here. */
      }
    });
  })();
</script>`
}
