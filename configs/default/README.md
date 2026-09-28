# default

Bootstrap's defaults: nothing configured, only commented examples. New issue reproductions start from this config, and `npm run use-config default` resets `src/styles/`.

Category: baseline

## What it stresses

- Nothing on purpose. It's the reference every other config is compared against, and what `check-dist`, `audit-tokens`, `audit-rtl`, `audit-motion` and `audit-layers` audit.
- Keep it pristine: save experiments as their own config with `npm run save-config <name>`.

## Pages to check

- [Kitchen sink](../../kitchen-sink/), every docs example
- [Starter screens](../../pages/) and [real screens](../../screens/)

## Known gaps

None known.
