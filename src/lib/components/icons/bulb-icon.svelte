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
  <g style="transform-origin: center; transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); transform: {hovering ? 'scale(1.08)' : 'scale(1)'}">
    <path
      d="M4 11a1 1 0 0 1 .117 1.993l-.117 .007h-1a1 1 0 0 1 -.117 -1.993l.117 -.007h1z"
      style="transition: opacity 0.25s ease; transition-delay: 0.1s; opacity: {hovering ? 1 : 0}"
    />
    <path
      d="M12 2a1 1 0 0 1 .993 .883l.007 .117v1a1 1 0 0 1 -1.993 .117l-.007 -.117v-1a1 1 0 0 1 1 -1z"
      style="transition: opacity 0.25s ease; transition-delay: 0.15s; opacity: {hovering ? 1 : 0}"
    />
    <path
      d="M21 11a1 1 0 0 1 .117 1.993l-.117 .007h-1a1 1 0 0 1 -.117 -1.993l.117 -.007h1z"
      style="transition: opacity 0.25s ease; transition-delay: 0.2s; opacity: {hovering ? 1 : 0}"
    />
    <path
      d="M4.893 4.893a1 1 0 0 1 1.32 -.083l.094 .083l.7 .7a1 1 0 0 1 -1.32 1.497l-.094 -.083l-.7 -.7a1 1 0 0 1 0 -1.414z"
      style="transition: opacity 0.25s ease; transition-delay: 0.15s; opacity: {hovering ? 1 : 0}"
    />
    <path
      d="M17.693 4.893a1 1 0 0 1 1.497 1.32l-.083 .094l-.7 .7a1 1 0 0 1 -1.497 -1.32l.083 -.094l.7 -.7z"
      style="transition: opacity 0.25s ease; transition-delay: 0.2s; opacity: {hovering ? 1 : 0}"
    />
  </g>
  <path
    d="M14 18a1 1 0 0 1 1 1a3 3 0 0 1 -6 0a1 1 0 0 1 .883 -.993l.117 -.007h4z"
    style="transition: fill 0.3s ease; fill: {hovering ? color : 'none'}"
  />
  <path
    d="M12 6a6 6 0 0 1 3.6 10.8a1 1 0 0 1 -.471 .192l-.129 .008h-6a1 1 0 0 1 -.6 -.2a6 6 0 0 1 3.6 -10.8z"
  />
</svg>
