<script lang="ts" module>
  export type ToastData = {
    title: string;
    description: string;
    color: string;
  };

  const {
    elements,
    helpers,
    states: { toasts },
    actions: { portal }
  } = createToaster<ToastData>();

  export const addToast = helpers.addToast;
</script>

<script lang="ts">
  import { createToaster } from "@melt-ui/svelte";
  import { flip } from "svelte/animate";
  import Toast from "./Toast.svelte";
  import { settings } from "$lib/stores.svelte";
</script>

<div
  class="fixed top-auto right-0 bottom-0 z-50 m-4 flex flex-col items-end gap-2 {settings.app.general.accentColor}"
  use:portal
>
  {#each $toasts as toast (toast.id)}
    <div animate:flip={{ duration: 500 }}>
      <Toast {elements} {toast} />
    </div>
  {/each}
</div>
