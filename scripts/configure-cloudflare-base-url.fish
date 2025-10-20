#!/usr/bin/env fish

# Configure the production base URL variables that baseUrl.ts expects when deploying with Wrangler.

set script_name (status basename)

function usage
  echo "Usage: $script_name <production-domain> [environment]"
  echo "Example: $script_name app.example.com production"
  echo ""
  echo "The domain should not include a protocol or trailing slash."
end

if test (count $argv) -lt 1
  usage
  exit 1
end

set domain $argv[1]
set env "production"

if test (count $argv) -ge 2
  set env $argv[2]
end

set normalized (string trim --chars='/' $domain)
set normalized (string replace -r '^https?://' '' $normalized)

if test -z "$normalized"
  echo "Error: domain becomes empty after normalization."
  exit 1
end

if string match -rq ":" $normalized
  echo "Error: domain should not include a port."
  exit 1
end

set vercel_env_value "production"
if test "$env" != "production"
  set vercel_env_value $env
end

echo "Setting Vercel-compatible environment variables in Cloudflare env '$env'..."
echo ""
echo "You may be prompted by Wrangler to confirm overwriting existing values (answer with 'y' to continue)."

printf '%s' $vercel_env_value | wrangler secret put VERCEL_ENV --env $env

if test "$env" = "production"
  printf '%s' $normalized | wrangler secret put VERCEL_PROJECT_PRODUCTION_URL --env $env
else
  printf '%s' $normalized | wrangler secret put VERCEL_BRANCH_URL --env $env
end

printf '%s' $normalized | wrangler secret put VERCEL_URL --env $env

echo ""
echo "Done. These variables now resolve for baseUrl.ts during production runs."
