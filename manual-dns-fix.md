# Manual DNS Fix for Domain Linking

Since the Cloudflare API authentication is having issues, here's how to manually fix your DNS records to make domain linking work:

## Current Problem
Your `backstageos.com` domain has **A records** pointing to Cloudflare servers:
- 104.21.84.93
- 172.67.190.230

But Replit needs a **CNAME record** pointing to `backstageos.replit.app`

## Manual Fix Steps

### Option 1: Through Cloudflare Dashboard
1. Go to https://dash.cloudflare.com
2. Select your `backstageos.com` domain
3. Click on "DNS" tab
4. Find the A records for `backstageos.com` (root domain)
5. Delete both A records
6. Create a new CNAME record:
   - **Name**: `backstageos.com` (or `@`)
   - **Target**: `backstageos.replit.app`
   - **TTL**: 5 minutes (300 seconds)
   - **Proxy status**: DNS only (grey cloud, not orange)

### Option 2: Alternative - Use WWW Redirect
If CNAME on root domain doesn't work:
1. Keep your A records as they are
2. Create a page rule in Cloudflare:
   - URL: `backstageos.com/*`
   - Setting: Forwarding URL (301 redirect)
   - Destination: `https://www.backstageos.com/$1`
3. Then create CNAME for www:
   - **Name**: `www`
   - **Target**: `backstageos.replit.app`
   - **TTL**: 5 minutes

## After Making Changes
1. Wait 5-10 minutes for DNS propagation
2. Test: `curl -I https://backstageos.com`
3. Should show Replit headers instead of 404
4. Try domain linking in Replit again

## Expected Result
Once fixed, both domains should work:
- `backstageos.com` → Your theater management app
- `beta.backstageos.com` → Same app (already working)