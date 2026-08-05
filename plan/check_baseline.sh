#!/bin/bash
# both checks carry a pre-existing baseline in this repo (one type error is inside node_modules and
# cannot be fixed from here at all), so the gate is "no worse", never "zero".
TS_BASE=2
SV_BASE=5

ts=$(pnpm type-check 2>&1 | grep -c "error TS")
if [ "$ts" -gt "$TS_BASE" ]; then
	echo "type-check: $ts errors, baseline is $TS_BASE -- this step added $((ts - TS_BASE))"
	pnpm type-check 2>&1 | grep "error TS"
	exit 1
fi

sv=$(pnpm check 2>&1 | grep -oE '[0-9]+ ERRORS' | tail -1 | grep -oE '^[0-9]+')
if [ -z "$sv" ]; then
	echo "check_baseline: could not parse svelte-check output"
	exit 1
fi
if [ "$sv" -gt "$SV_BASE" ]; then
	echo "svelte-check: $sv errors, baseline is $SV_BASE -- this step added $((sv - SV_BASE))"
	exit 1
fi

echo "type-check $ts/$TS_BASE, svelte-check $sv/$SV_BASE"
