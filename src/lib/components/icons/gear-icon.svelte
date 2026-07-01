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
  <g style="transform-origin: center; transform-box: fill-box; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); transform: {hovering ? 'rotate(360deg)' : 'rotate(0deg)'}">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15.5a1.8 1.8 0 0 0 .6 2l.1 .1a2.2 2.2 0 0 1 -3.1 3.1l-.1 -.1a1.8 1.8 0 0 0 -2 -.6a1.8 1.8 0 0 0 -1.1 1.6v.3a2.2 2.2 0 0 1 -4.4 0v-.2a1.8 1.8 0 0 0 -1.1 -1.6a1.8 1.8 0 0 0 -2 .6l-.1 .1a2.2 2.2 0 0 1 -3.1 -3.1l.1 -.1a1.8 1.8 0 0 0 .6 -2a1.8 1.8 0 0 0 -1.6 -1.1h-.3a2.2 2.2 0 0 1 0 -4.4h.2a1.8 1.8 0 0 0 1.6 -1.1a1.8 1.8 0 0 0 -.6 -2l-.1 -.1a2.2 2.2 0 0 1 3.1 -3.1l.1 .1a1.8 1.8 0 0 0 2 .6a1.8 1.8 0 0 0 1.1 -1.6v-.3a2.2 2.2 0 0 1 4.4 0v.2a1.8 1.8 0 0 0 1.1 1.6a1.8 1.8 0 0 0 2 -.6l.1 -.1a2.2 2.2 0 0 1 3.1 3.1l-.1 .1a1.8 1.8 0 0 0 -.6 2a1.8 1.8 0 0 0 1.6 1.1h.3a2.2 2.2 0 0 1 0 4.4h-.2a1.8 1.8 0 0 0 -1.6 1.1z" />
  </g>
</svg>
