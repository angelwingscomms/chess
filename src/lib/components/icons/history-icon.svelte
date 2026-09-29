<script lang="ts">
  let { size = 24, color = "currentColor", strokeWidth = 1, class: className = "" } = $props();
</script>

<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round" class={className}>
  <path d="M12 8l0 4l2 2" />
  <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" />
</svg>
