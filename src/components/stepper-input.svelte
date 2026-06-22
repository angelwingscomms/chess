<script lang="ts">
  let {
    value = $bindable(5),
    min = 1,
    max = 30,
    step = 0.5,
  }: {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
  } = $props();

  let inc_timer: ReturnType<typeof setInterval> | undefined = $state();
  let dec_timer: ReturnType<typeof setInterval> | undefined = $state();

  function inc(e: MouseEvent) {
    e.preventDefault();
    if (value < max) value = Math.min(max, Math.round((value + step) * 10) / 10);
  }
  function dec(e: MouseEvent) {
    e.preventDefault();
    if (value > min) value = Math.max(min, Math.round((value - step) * 10) / 10);
  }
  function start_inc() {
    if (inc_timer) return;
    inc_timer = setInterval(() => {
      if (value < max) value = Math.min(max, Math.round((value + step) * 10) / 10);
    }, 144);
  }
  function start_dec() {
    if (dec_timer) return;
    dec_timer = setInterval(() => {
      if (value > min) value = Math.max(min, Math.round((value - step) * 10) / 10);
    }, 144);
  }
  function stop_inc() { if (inc_timer) { clearInterval(inc_timer); inc_timer = undefined; } }
  function stop_dec() { if (dec_timer) { clearInterval(dec_timer); dec_timer = undefined; } }
</script>

<div class="flex items-center gap-0 rounded-lg border border-hairline bg-canvas has-[input:focus]:border-primary has-[input:focus]:shadow-[0_0_0_3px_rgba(204,120,92,0.15)]">
  <button
    type="button"
    class="flex h-9 w-9 shrink-0 items-center justify-center text-sm text-muted transition-colors duration-150 hover:text-ink disabled:opacity-30"
    disabled={value <= min}
    onclick={dec}
    onmousedown={start_dec}
    onmouseup={stop_dec}
    onmouseleave={stop_dec}
    ontouchstart={start_dec}
    ontouchend={stop_dec}
    ontouchcancel={stop_dec}
    aria-label="Decrease"
  >−</button>
  <input
    type="number"
    bind:value
    {min}
    {max}
    {step}
    class="h-9 w-14 border-x border-hairline bg-transparent text-center text-sm text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
  />
  <button
    type="button"
    class="flex h-9 w-9 shrink-0 items-center justify-center text-sm text-muted transition-colors duration-150 hover:text-ink disabled:opacity-30"
    disabled={value >= max}
    onclick={inc}
    onmousedown={start_inc}
    onmouseup={stop_inc}
    onmouseleave={stop_inc}
    ontouchstart={start_inc}
    ontouchend={stop_inc}
    ontouchcancel={stop_inc}
    aria-label="Increase"
  >+</button>
</div>
