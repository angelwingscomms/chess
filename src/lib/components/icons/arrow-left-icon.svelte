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
  <g style="transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); transform: {hovering ? 'translateX(-3px)' : 'translateX(0)'}">
    <path d="M5 12l14 0" />
    <path d="M9 16l-4 -4" />
    <path d="M9 8l-4 4" />
  </g>
</svg>
