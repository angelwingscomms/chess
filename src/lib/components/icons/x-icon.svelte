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
  <path
    d="M18 6l-12 12"
    style="transform-origin: center; transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); transform: {hovering ? 'rotate(15deg) scale(1.1)' : 'rotate(0deg) scale(1)'}"
  />
  <path
    d="M6 6l12 12"
    style="transform-origin: center; transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); transform: {hovering ? 'rotate(-15deg) scale(1.1)' : 'rotate(0deg) scale(1)'}"
  />
</svg>
