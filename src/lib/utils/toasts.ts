import type { ToastData } from "$lib/components/Toaster.svelte";
import type { AddToastProps } from "@melt-ui/svelte";

export const noUpdateAvailable: AddToastProps<ToastData> = {
  data: {
    title: "",
    description: "No update available, please check again later",
    color: "border-accent-500/30"
  },
  closeDelay: 2000
};
