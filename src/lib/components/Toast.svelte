<script lang="ts">
  import { melt, type Toast, type ToastsElements } from "@melt-ui/svelte";
  import type { ToastData } from "./Toaster.svelte";
  import { fly } from "svelte/transition";
  import { IconX } from "$lib/icons";

  let {
    elements,
    toast
  }: {
    elements: ToastsElements;
    toast: Toast<ToastData>;
  } = $props();

  const { content, title, description, close } = $derived(elements);
  const { id, data } = $derived(toast);
</script>

<div
  use:melt={$content(id)}
  in:fly={{ duration: 150, x: "100%" }}
  out:fly={{ duration: 150, x: "100%" }}
  class="relative rounded-lg border bg-neutral-800/80 text-white shadow-md drop-shadow-xl backdrop-blur-xl {data.color
    ? data.color
    : 'border-accent-500/20'}"
>
  <div class="relative flex w-[24rem] max-w-[calc(100vw-2rem)] items-center justify-between gap-4 p-2 px-4">
    <div class="flex flex-col">
      {#if data.title}
        <h3 use:melt={$title(id)} class="flex items-center gap-2 font-semibold">
          {data.title}
        </h3>
      {/if}
      <div class="pb-0.5 text-sm/snug" use:melt={$description(id)}>
        {data.description}
      </div>
    </div>
    <button use:melt={$close(id)} class="group absolute top-1.5 right-2 grid size-6 place-items-center">
      <IconX class="size-4 group-hover:opacity-70" />
    </button>
  </div>
</div>
