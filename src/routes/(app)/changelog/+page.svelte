<script lang="ts">
  import { markdown } from "$lib/components/Markdown.svelte";
  import ChangelogMarkdown from "$lib/data/changelog.md?raw";
  import Header from "../Header.svelte";

  // Pass 1: strip `#### Heading` lines whose section has no rendered content.
  // Keeps the placeholders in changelog.md so authors see template structure when
  // editing, but viewers don't see empty NEW FEATURES / BUG FIXES placeholders.
  function stripEmptyHeadings(md: string): string {
    const lines = md.split("\n");
    const out: string[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (/^####\s/.test(line)) {
        let j = i + 1;
        let hasContent = false;
        let inBlockComment = false;
        while (j < lines.length) {
          const next = lines[j];
          const trimmed = next.trim();
          if (/^####\s/.test(next) || /^###\s/.test(next) || /^<!--\s*@release/.test(next)) break;
          if (inBlockComment) {
            if (trimmed.includes("-->")) inBlockComment = false;
            j++;
            continue;
          }
          if (trimmed.startsWith("<!--") && !trimmed.includes("-->")) {
            inBlockComment = true;
            j++;
            continue;
          }
          if (trimmed === "" || /^<!--.*-->\s*$/.test(trimmed)) {
            j++;
            continue;
          }
          hasContent = true;
          break;
        }
        if (!hasContent) {
          i = j;
          while (i < lines.length && lines[i].trim() === "") i++;
          continue;
        }
      }
      out.push(line);
      i++;
    }
    return out.join("\n");
  }

  // Pass 2: drop entire `<!-- @release X -->` ... `<!-- @release-end -->` blocks
  // whose body is just a heading (styled <div> for current/Unreleased, or `### vX.Y.Z`
  // for older versions) with no bullets or paragraphs underneath. Run after pass 1
  // so blocks that only had empty `####` placeholders are now considered empty too.
  function stripEmptyBlocks(md: string): string {
    const lines = md.split("\n");
    const out: string[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (/^<!--\s*@release\s+\S+\s*-->/.test(line.trim())) {
        let end = i + 1;
        while (end < lines.length && !/^<!--\s*@release-end\s*-->/.test(lines[end].trim())) {
          end++;
        }
        const inner = lines.slice(i + 1, end);
        if (blockHasContent(inner)) {
          for (let k = i; k <= end && k < lines.length; k++) out.push(lines[k]);
        }
        i = end + 1;
        continue;
      }
      out.push(line);
      i++;
    }
    return out.join("\n");
  }

  function blockHasContent(lines: string[]): boolean {
    let inComment = false;
    let inDiv = false;
    let divDepth = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (inComment) {
        if (trimmed.includes("-->")) inComment = false;
        continue;
      }
      if (trimmed === "") continue;
      if (inDiv) {
        divDepth += (line.match(/<div/g) || []).length;
        divDepth -= (line.match(/<\/div>/g) || []).length;
        if (divDepth <= 0) inDiv = false;
        continue;
      }
      if (trimmed.startsWith("<!--")) {
        if (!trimmed.includes("-->")) inComment = true;
        continue;
      }
      if (/^<div\b/.test(trimmed)) {
        divDepth = (line.match(/<div/g) || []).length - (line.match(/<\/div>/g) || []).length;
        if (divDepth > 0) inDiv = true;
        continue;
      }
      // Plain markdown version heading like "### v0.1.5 - May 8th, 2026"
      if (/^###\s/.test(trimmed)) continue;
      // Anything else — a `#### heading` that survived pass 1, a bullet, a paragraph — is real content
      return true;
    }
    return false;
  }

  const cleaned = stripEmptyBlocks(stripEmptyHeadings(ChangelogMarkdown));
</script>

<Header title="Changelog" />
{@render markdown(cleaned)}
