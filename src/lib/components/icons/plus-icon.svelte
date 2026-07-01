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
  <g
    style="transform-origin: center; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), stroke-width 0.2s ease; transform: {hovering ? 'rotate(90deg) scale(1.15)' : 'rotate(0deg) scale(1)'}">
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </g>
</svg>
