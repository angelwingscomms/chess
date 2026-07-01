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
  <g style="transform-origin: center; transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); transform: {hovering ? 'rotate(180deg)' : 'rotate(0deg)'}">
    <path d="M7 10h14l-4 -4" />
    <path d="M17 14h-14l4 4" />
  </g>
</svg>
