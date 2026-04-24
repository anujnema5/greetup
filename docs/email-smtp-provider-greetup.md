# Email delivery for greetup.co — volume, provider shortlist, DNS

Operational guide derived from [email SMTP/API provider research](https://www.brevo.com/pricing/). Update numbers when your product analytics justify it.

## 1. Volume estimates (transactional vs marketing)

Use these **planning scenarios** until you have real metrics. Replace assumptions with counts from your auth, notifications, and campaign tools.

### Assumptions

| Category | Examples | Typical pattern |
|----------|----------|-----------------|
| **Transactional** | Sign-up verify, password reset, security alerts, receipt-like summaries | Tied to user actions; can **spike** on launch or abuse |
| **Marketing / lifecycle** | Digests, announcements, onboarding drips | More **even** by day; list size × send frequency |

### Scenario A — early MVP (first months)

| Type | Conservative | Moderate | Notes |
|------|--------------|----------|--------|
| New signups / day | 20 | 100 | 1 verification email each → same as sends |
| Password resets / day | 5 | 30 | Bursty |
| Other transactional / day | 10 | 50 | Notifications, etc. |
| **Peak transactional / day** | **~35** | **~180** | Sum; round up for spikes |
| Marketing sends / month | 0–2k | 5k | Newsletters; often batched |

**Rough monthly (transactional only):** ~1k–5k sends. **Peak day** matters for **daily caps** on free tiers (e.g. 100–300/day).

### Scenario B — growth (~10k active users)

| Type | Conservative | Moderate |
|------|--------------|----------|
| Transactional / day | 200 | 800 |
| Marketing / month | 20k | 80k | Separate reputation strategy often recommended |

**Rough monthly transactional:** ~6k–24k. Marketing may dominate total volume—track separately.

### Scenario C — heavier product email

If you add rich notifications (many events per user), **multiply transactional** by your events-per-active-user and re-check **daily maximum** before choosing a free tier.

**Action:** Export or estimate: `(signups + resets + critical notifications) per day` and `marketing campaigns × list size` monthly. Compare to provider **daily** and **monthly** limits.

---

## 2. Shortlist: Brevo vs Amazon SES

Two strong options for **greetup.co**: one **low-ops + generous free SMTP**, one **lowest $/email at scale**.

### Brevo (SMTP + API, marketing + transactional)

| Tier | What to verify on [Brevo pricing](https://www.brevo.com/pricing/) | Fit |
|------|---------------------------------------------------------------------|-----|
| **Free** | Commonly **~300 emails/day** (~9k/month if you use full quota daily); SMTP on free; branding/footer limits may apply | Scenario A; watch **daily** spike vs 300 |
| **Starter (~$9/mo class)** | Stepped monthly bundles—confirm current send caps and whether transactional is included | When free daily cap is tight or you need more marketing |

**Pros:** Simple dashboard, good MVP free tier, single place for campaigns + transactional.  
**Cons:** At very high volume, per-email cost may exceed SES; check latest plans for transactional-specific rules.

### Amazon SES (SMTP + API)

| Tier | Detail | Fit |
|------|--------|-----|
| **Pricing** | About **$0.10 per 1,000** emails (see [AWS SES pricing](https://aws.amazon.com/ses/pricing/)); free tier for new SES usage is time-bound—read current AWS text | Scenario B+ or any steady volume |
| **Ops** | Domain identity, DKIM, optional dedicated IP later; account may start in **sandbox** until you request production | Best **$/email** if you accept AWS setup |

**Pros:** Very cheap at scale; full control.  
**Cons:** More moving parts (IAM, region, sandbox removal, monitoring).

### Quick decision matrix

| Your situation | Lean toward |
|----------------|-------------|
| MVP, want **free SMTP**, &lt; ~300 sends/day typical | **Brevo** free |
| Spiky days &gt; 200–300 or need **no branding** constraints | **Brevo** paid or **Mailjet Starter** (from prior comparison) |
| Steady volume, comfortable with **AWS** | **SES** |
| **50k+ / month** mostly transactional | **SES** (cost) or compare **Resend Pro** vs SES on features |

---

## 3. DNS plan before going live (SPF, DKIM, DMARC)

Applies to **greetup.co** or a **subdomain** (e.g. `mail.greetup.co` / `notifications.greetup.co`). Subdomains can isolate reputation between product email and marketing.

### Step-by-step

1. **Choose sender domain**  
   Root domain vs subdomain. Subdomain is fine if your provider gives you DKIM CNAMEs for that host.

2. **SPF (TXT on the domain/subdomain used in `Return-Path` / envelope)**  
   - Include **only** the IPs/services that actually send mail (your ESP’s include).  
   - One SPF TXT per DNS hostname that sends; avoid chaining too many includes.

3. **DKIM**  
   - Add the **CNAME or TXT** records exactly as your provider shows (often 2–3 selectors).  
   - Wait for DNS propagation; use the provider’s “verify domain” UI.

4. **DMARC (TXT on `_dmarc.greetup.co` or subdomain)**  
   - Start with `p=none` + aggregate reports (`rua=`) to a mailbox you monitor.  
   - After SPF/DKIM are stable and aligned, tighten policy (`quarantine` / `reject`) per your security needs.

5. **From / Reply-To**  
   - `From:` should match authenticated domain.  
   - Use a **no-reply** or support address consistently; set **Reply-To** if replies should go elsewhere.

6. **Human mail vs app mail (optional but common)**  
   - If you later use **Google Workspace** on the same domain, coordinate SPF includes so you don’t invalidate human mail—often easier to send **app mail from a subdomain**.

### Verification checklist

- [ ] Domain (or subdomain) shows **Verified** in ESP dashboard  
- [ ] SPF passes on a test send (provider tools or [mail-tester](https://www.mail-tester.com/) style checks)  
- [ ] DKIM **pass** on same test  
- [ ] DMARC record present; `p=none` initially with `rua` collecting reports  
- [ ] Bounce/complaint handling configured (webhooks or dashboard) so you **suppress** bad addresses

---

## References

- [Amazon SES pricing](https://aws.amazon.com/ses/pricing/)  
- [Brevo pricing](https://www.brevo.com/pricing/)  
- [Brevo free plan FAQ](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan)  
- [Mailjet](https://www.mailjet.com/)  
- [Resend pricing](https://resend.com/pricing)  
- [Postmark pricing](https://postmarkapp.com/pricing)  
- [Mailgun pricing](https://www.mailgun.com/pricing/)
