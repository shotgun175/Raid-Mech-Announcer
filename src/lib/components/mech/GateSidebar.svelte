<script lang="ts">
  import { mechStore } from "$lib/mech-store.svelte";
  import PeerConnect from "./PeerConnect.svelte";

  const raidNames = $derived(Array.from(new Set(mechStore.raids.map(r => r.raid))));
</script>

<div style="width: 220px; background: #0f0f0f; border-right: 1px solid #262626; display: flex; flex-direction: column; flex-shrink: 0; overflow-y: auto;">
  <!-- Header -->
  <div style="padding: 10px 14px; border-bottom: 1px solid #262626; font-size: 10px; color: #a3a3a3; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; flex-shrink: 0;">
    Raids & Gates
  </div>

  <!-- Raid groups -->
  <div style="flex: 1; overflow-y: auto;">
    {#each raidNames as raidName (raidName)}
      <div>
        <!-- Raid label -->
        <div style="padding: 10px 14px 4px; font-size: 10px; color: #525252; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;">{raidName}</div>
        <!-- Gate rows -->
        {#each mechStore.raids.filter(r => r.raid === raidName) as gate (gate.id)}
          {@const sel = gate.id === mechStore.selectedGateId}
          {@const isLive = gate.id === mechStore.liveGateId}
          <button
            onclick={() => mechStore.selectGate(gate.id)}
            style="
              width: 100%;
              text-align: left;
              padding: 8px 14px 8px 20px;
              cursor: pointer;
              background: {sel ? 'rgba(56,189,248,0.1)' : isLive ? 'rgba(74,222,128,0.05)' : 'transparent'};
              border-left: {sel ? '2px solid #38bdf8' : isLive ? '2px solid rgba(74,222,128,0.4)' : '2px solid transparent'};
              border-top: none; border-right: none; border-bottom: none;
              color: {sel ? '#38bdf8' : '#a3a3a3'};
              font-size: 12.5px;
              font-weight: {sel ? 600 : 400};
              display: flex;
              justify-content: space-between;
              align-items: center;
              transition: background 0.15s, color 0.15s;
              font-family: inherit;
            "
            onmouseenter={(e) => {
              if (!sel) {
                (e.currentTarget as HTMLElement).style.background = '#202020';
                (e.currentTarget as HTMLElement).style.color = '#fafafa';
              }
            }}
            onmouseleave={(e) => {
              if (!sel) {
                (e.currentTarget as HTMLElement).style.background = isLive ? 'rgba(74,222,128,0.05)' : 'transparent';
                (e.currentTarget as HTMLElement).style.color = '#a3a3a3';
              }
            }}
          >
            <div style="display: flex; align-items: center; gap: 6px;">
              <span>Gate {gate.gate}</span>
              {#if isLive}
                <span style="font-size: 8px; font-weight: 800; color: #4ade80; background: rgba(74,222,128,0.15); border: 1px solid rgba(74,222,128,0.4); border-radius: 3px; padding: 1px 5px; letter-spacing: 0.08em; animation: mech-pulse 2s ease-in-out infinite;">LIVE</span>
              {/if}
            </div>
            <span style="font-size: 10px; color: #525252; font-family: ui-monospace, monospace;">{gate.mechanics.length}</span>
          </button>
        {/each}
      </div>
    {/each}
  </div>

  <!-- Add Raid button -->
  <div style="padding: 10px 14px; border-top: 1px solid #262626; flex-shrink: 0;">
    <button style="width: 100%; background: transparent; border: 1px dashed #262626; border-radius: 4px; padding: 7px; color: #525252; cursor: pointer; font-size: 11.5px; font-family: inherit; transition: color 0.15s;" onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.color = '#a3a3a3')} onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.color = '#525252')}>
      + Add Raid
    </button>
  </div>

  <!-- PeerConnect panel at the very bottom -->
  <PeerConnect />
</div>

<style>
  @keyframes mech-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.4); }
  }
</style>
