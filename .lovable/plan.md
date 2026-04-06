

# AI Hidden Leads — Enhancement Plan to Match Amplify Voice AI

## What We Already Have (No Changes Needed)

| Feature | Status |
|---|---|
| Google Maps lead scraping | Done |
| Lead scoring + temperature | Done |
| Website analysis (Firecrawl) | Done |
| Contact enrichment (Exa + Apify) | Done |
| Email + SMS outreach templates | Done |
| Voice AI demos (Retell) | Done |
| Chat AI widget | Done |
| Live call transfer (Twilio bridge) | Done |
| CRM pipeline (8-stage Kanban) | Done |
| Intent-based social listening | Done |
| Call history + transcripts + AI summaries | Done |
| Appointment booking (Google Calendar) | Done |

## What We Need to Add

### Priority 1: Automated Drip Campaign Engine
- Create a `campaign_sequences` table to define multi-step email sequences (e.g., Day 1, Day 3, Day 7, Day 10, Day 14)
- Build a scheduled edge function that processes the queue daily, sending the next email in each prospect's sequence
- Add start/pause/stop controls to the Campaigns view
- Track per-step metrics (sent, opened, clicked) on each sequence step

### Priority 2: Speed-to-Lead Auto-Calling
- Add a webhook endpoint that fires when a prospect opens an email, clicks a demo link, or replies positively
- The webhook triggers an outbound Retell Voice AI call to the prospect's phone within 60 seconds
- The AI agent uses the prospect's enriched business data to personalize the conversation
- Log the auto-triggered call in call_history with source = "speed_to_lead"

### Priority 3: Email Reply Sentiment Parsing
- Set up an inbound email webhook (on the notify subdomain) to receive prospect replies
- Pass reply text through an AI model to classify sentiment: Positive, Negative, Needs Info
- Auto-update prospect pipeline stage based on sentiment (e.g., Positive → "Interested")
- Positive replies trigger the Speed-to-Lead auto-call from Priority 2

### Priority 4: Multi-Tenant SaaS Mode (Sell Access to Clients)
- Add authentication (signup/login)
- Create a `user_roles` table and `organizations` table
- Scope all data (prospects, campaigns, calls) to organization_id
- Build a client-facing dashboard showing: Leads Found, Emails Sent, Replies, Calls Made, Appointments Booked
- Allow clients to configure their own niches, locations, and Voice AI persona
- Each client gets their own Voice AI agent with their business knowledge

### Priority 5: Database Reactivation Flow
- Add a "Reactivate" mode to the Imported Lists feature
- Auto-call each imported lead using Voice AI with a re-engagement script
- Track reactivation outcomes (interested, not interested, no answer, voicemail)
- This is the easiest upsell — clients hand over their dead leads, you wake them up

## Recommended Build Order

1. **Automated Drip Campaigns** — immediate value, makes current outreach hands-free
2. **Speed-to-Lead Auto-Calling** — the killer feature that differentiates from basic CRMs
3. **Database Reactivation** — fastest path to revenue with existing client data
4. **Email Reply Parsing** — completes the automation loop
5. **Multi-Tenant SaaS** — transforms from a tool into a sellable product

## Technical Notes

- Drip campaigns require a pg_cron job (similar to the email queue) to process daily sends
- Speed-to-Lead uses Retell's outbound call API, which requires a Retell phone number
- Inbound email parsing needs a webhook receiver on the notify subdomain
- Multi-tenant mode requires RLS policy updates on all existing tables to scope by organization
- Database reactivation reuses the existing imported_leads table and Voice AI infrastructure

## What This Means for Your Business

You're not far behind Amplify Voice AI — you're actually ahead in some areas (intent-based social listening, visual email templates, chat AI widget). The main gaps are **automation** (drip sequences + auto-calling) and **multi-tenancy** (letting clients use the platform themselves). Closing those gaps turns AI Hidden Leads from a personal tool into a sellable SaaS product.

