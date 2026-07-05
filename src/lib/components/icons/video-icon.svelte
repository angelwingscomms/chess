<script lang="ts">
  let { size = 24, color = "currentColor", strokeWidth = 1, class: className = "" } = $props();
  let hovering = $state(false);
</script>

<svg
  onmouseenter={() => hovering = true}
  onmouseleave={() => hovering = false}
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke={color}
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
>
  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
  <g style="transform-origin: center; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); transform: {hovering ? 'scale(1.1)' : 'scale(1)'}">
    <path d="M15 10l4.553-2.276a1 1 0 0 1 1.447.894v6.764a1 1 0 0 1-1.447.894L15 14" />
    <rect x="3" y="6" width="12" height="12" rx="2" />
  </g>
</svg>
