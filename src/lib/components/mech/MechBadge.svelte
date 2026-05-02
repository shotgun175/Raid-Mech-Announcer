<script lang="ts">
  interface Props {
    label: string;
    color: string;
    bg?: string;
    border?: string;
    small?: boolean;
  }
  let { label, color, bg = "transparent", border, small = false }: Props = $props();
  const bdr = $derived(border ?? color);
</script>

<span style="
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1.4;
  padding: {small ? '1px 6px' : '2px 8px'};
  border-radius: 3px;
  background: {bg};
  border: 1px solid {bdr};
  color: {color};
  font-size: {small ? 9.5 : 10.5}px;
">{label}</span>
