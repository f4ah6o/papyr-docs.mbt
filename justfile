set shell := ["bash", "-euo", "pipefail", "-c"]

docs_item := "papyr-docs-cloudflare-dev"

_require-base-env:
  test -n "${CLOUDFLARE_ACCOUNT_ID:-}" || { echo "CLOUDFLARE_ACCOUNT_ID is required" >&2; exit 1; }
  test -n "${PAPYR_DOCS_R2_BUCKET:-}" || { echo "PAPYR_DOCS_R2_BUCKET is required" >&2; exit 1; }
  test -n "${PAPYR_DOCS_R2_PREVIEW_BUCKET:-}" || { echo "PAPYR_DOCS_R2_PREVIEW_BUCKET is required" >&2; exit 1; }

typecheck:
  pnpm run typecheck

test:
  pnpm run test

build:
  pnpm run build

dev item=docs_item:
  opz run {{item}} -- pnpm run dev

e2e:
  pnpm run e2e

deploy-preview item=docs_item:
  opz run {{item}} -- pnpm run deploy:preview

deploy-production item=docs_item:
  opz run {{item}} -- pnpm run deploy

upload-r2 item=docs_item:
  opz run {{item}} -- env R2_UPLOAD_MODE=remote R2_UPLOAD_TARGET=production pnpm run upload:r2

upload-preview-r2 item=docs_item:
  opz run {{item}} -- env R2_UPLOAD_MODE=remote R2_UPLOAD_TARGET=preview pnpm run upload:r2

github-secrets item=docs_item:
  opz github-secret --repo f4ah6o/papyr-docs.mbt {{item}}
