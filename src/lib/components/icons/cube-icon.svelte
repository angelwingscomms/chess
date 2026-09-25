<script lang="ts">
  let { size = 24, color = "currentColor", strokeWidth = 1, class: className = "" } = $props();
</script>

<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round" class={className}>
  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
  <path d="M12 3l8 4.5v9l-8 4.5l-8 -4.5v-9l8 -4.5" /><path d="M12 12l8 -4.5" /><path d="M12 12v9" /><path d="M12 12l-8 -4.5" />
</svg>
