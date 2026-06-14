import MarkdownIt from "markdown-it";

// Open every rendered link in a new tab/window instead of navigating the webview.
function withExternalLinks(instance: MarkdownIt): MarkdownIt {
  const defaultRender =
    instance.renderer.rules.link_open ||
    function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  instance.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    tokens[idx].attrSet("target", "_blank");
    return defaultRender(tokens, idx, options, env, self);
  };
  return instance;
}

// Bundled content only (the in-app changelog): html passes through so the
// file's <!-- @release --> markers stay invisible. NEVER use for remote text.
export const markdownIt = withExternalLinks(new MarkdownIt({ html: true }));

// Untrusted remote content — the updater release notes from latest.json are
// NOT covered by the artifact's minisign signature, yet render inside the
// privileged webview. Raw HTML is escaped, never executed.
export const markdownItUntrusted = withExternalLinks(new MarkdownIt({ html: false }));
