# KetaOne product specification

Build a REAL, PRODUCTION-READY AI SALES AGENT SYSTEM.

This is NOT a mockup, prototype, static demo, or fake UI.

The product must actually work end-to-end:
Telegram customer → AI Sales Agent → inventory/database → sales conversation → order/lead → team group → CRM → admin dashboard.

## 1. PRODUCT PURPOSE

Build an AI-powered sales department for businesses.

The primary goal of the AI agent is to MAXIMIZE SALES.

When a customer writes to the Telegram bot, the AI agent must:

* understand what the customer wants;
* search the real inventory/database;
* recommend available products;
* explain price and product information;
* suggest alternatives when a product is unavailable;
* upsell/cross-sell relevant products;
* answer objections;
* move the customer toward placing an order;
* collect required customer information;
* create/update a lead;
* create an order when appropriate;
* transfer the conversation to a team member when necessary.

The AI must never invent stock, prices, discounts, specifications, delivery availability, or other business facts.

All factual product information must come from the database.

---

# 2. AUTHENTICATION

Create a secure admin authentication system using Neon Auth (hosted Better Auth).

Admin login:
Email: [nursultansayyora@gmail.com](mailto:nursultansayyora@gmail.com)

The password must NOT be hardcoded into frontend source code.

Create the account through Neon Auth / secure environment configuration.

After successful login, redirect to the dashboard.

Protected routes must not be accessible without authentication.

Implement:

* login
* logout
* protected dashboard routes
* session persistence
* unauthorized redirect
* loading states
* proper error messages

Never expose passwords or secrets in frontend code.

---

# 3. TECHNOLOGY

Use:

* React
* TypeScript
* Vite
* Tailwind CSS
# Baza: Neon Postgres (qarang: docs/SELF-HOSTING.md)
* PostgreSQL
* Neon Auth
* Secure server endpoints (TanStack Start server functions) where needed
* Telegram Bot API
* OpenAI-compatible LLM API through secure server-side environment variables
* modern responsive UI

Use environment variables for all secrets and API keys.

Never expose:

* Telegram bot token
* AI API key
* Neon admin (service) credentials
* other private credentials

in browser/client code.

---

# 4. DASHBOARD

Create a professional SaaS-style admin dashboard.

Main navigation:

* Overview
* Leads
* Customers
* Conversations
* Orders
* Inventory
* Products
* Team & roles
* Sales Analytics
* Settings

Responsive:

* desktop
* tablet
* mobile

The dashboard should look like a real commercial product, not a template.

Use clean modern UI, cards, tables, filters, search, status badges, charts and useful empty/loading/error states.

---

# 5. OVERVIEW

Create a real-time sales dashboard.

Show:

* Today's leads
* New leads
* Hot leads
* Orders today
* Revenue today
* Conversion rate
* AI conversations
* Human handoffs
* Average response time

Charts:

* leads over time
* orders over time
* revenue
* conversion rate
* top-selling products

Do not use fake static statistics.

All values must come from the database.

If there is no data, show zero/empty states instead of fake numbers.

---

# 6. INVENTORY

Create a real inventory management system.

Products must contain:

* id
* SKU
* name
* category
* description
* price
* compare_at_price
* stock_quantity
* reserved_quantity
* availability
* images
* specifications
* tags
* created_at
* updated_at

Admin can:

* create product
* edit product
* delete/archive product
* change price
* update stock
* upload product images
* search products
* filter by category
* filter by availability
* sort products

Inventory status:

* In stock
* Low stock
* Out of stock

The AI Sales Agent must query this real inventory.

---

# 7. AI SALES AGENT

This is the CORE of the product.

Create an AI Sales Agent service that communicates with customers through Telegram.

The AI should behave like an experienced professional salesperson.

Its objectives, in order:

1. Understand customer intent.
2. Identify the desired product/service.
3. Search real inventory.
4. Recommend the best matching available option.
5. Explain value clearly.
6. Handle objections.
7. Offer alternatives if necessary.
8. Upsell/cross-sell when relevant.
9. Ask for purchase intent.
10. Collect order information.
11. Create a lead/order.
12. Escalate to a team member when necessary.

The AI must NOT be annoying, spammy, manipulative, or dishonest.

It should be persuasive but natural.

---

# 8. SALES BEHAVIOR

Example:

Customer:
"Redmi Note 14 bormi?"

AI:
"Ha, Redmi Note 14 mavjud. 8/256 GB versiyasi 3 200 000 so'm. Xohlasangiz, sizga shu modelning afzalliklarini qisqacha aytib beraman yoki buyurtmani rasmiylashtirib beraman."

If unavailable:

Customer:
"iPhone 15 Pro bormi?"

AI:
"Hozir iPhone 15 Pro omborda yo'q. Lekin iPhone 15 va iPhone 16 modellari mavjud. Byudjetingizni aytsangiz, eng yaxshi variantni tanlab beraman."

The AI should NEVER say an unavailable product is available.

---

# 9. UPSELL / CROSS-SELL

When appropriate, recommend related products.

Example:

Customer buys a phone.

AI can suggest:

* case
* screen protector
* charger
* headphones

But recommendations must be based on actual products in inventory.

Do not recommend irrelevant products.

---

# 10. OBJECTION HANDLING

The agent must handle common objections.

Examples:

Customer:
"Qimmat ekan."

AI should:

* understand the objection;
* explain value;
* offer another product within a lower price range;
* compare available alternatives.

Customer:
"O'ylab ko'raman."

AI should politely ask what is stopping them:

* price?
* model?
* delivery?
* payment method?
* another concern?

Then address the concern.

Customer:
"Keyin olaman."

AI should not pressure aggressively.

Instead:

* understand timing;
* offer to save the product/request;
* ask if they want a team member to contact them.

---

# 11. HUMAN HANDOFF

The AI must know when human assistance is needed.

Examples:

* customer requests a human team member;
* complex complaint;
* custom price/discount request;
* payment issue;
* delivery issue;
* unavailable information;
* negotiation beyond AI permissions;
* high-value lead;
* customer is ready but needs manual confirmation.

When escalation happens:

1. Create/update the lead.
2. Set status to "needs_attention".
3. Save conversation context.
4. Send the lead to the configured Telegram team group.

---

# 12. TELEGRAM TEAM GROUP

Create a Telegram team group integration.

When a lead requires human assistance, send a structured message to the team group.

Example:

🔥 NEW HOT LEAD

Customer: Ali
Telegram: @ali123

Product:
iPhone 15 Pro 256GB

Budget:
12–14 million UZS

Location:
Nukus

Status:
HOT

Reason for handoff:
Customer wants installment payment information.

Conversation summary:
Customer is ready to purchase but needs information about installment options.

Actions:
[Take Lead]
[Open Customer]
[Open Conversation]

The system must support assigning the lead to a team member.

Lead statuses:

* New
* Assigned
* Contacted
* Negotiating
* Won
* Lost

---

# 13. LEAD MANAGEMENT / CRM

Create a real CRM.

Lead fields:

* id
* customer
* source
* Telegram username
* phone
* requested product
* budget
* location
* lead score
* status
* assigned team member
* AI summary
* notes
* created_at
* updated_at

Lead scoring:

🔥 HOT
🟡 WARM
🔵 COLD

The score should be determined from actual conversation signals.

Examples of HOT signals:

* "olaman"
* "buyurtma beraman"
* asks how to pay
* asks delivery details
* asks for exact final price
* ready to provide phone/address

---

# 14. CUSTOMERS

Create customer profiles.

Show:

* customer name
* Telegram username
* phone
* location
* conversations
* leads
* orders
* total purchases
* last interaction
* notes

A returning Telegram customer must be recognized instead of creating duplicate customer records.

---

# 15. CONVERSATIONS

Create a conversation inbox in the dashboard.

Show:

* customer
* latest message
* AI/human status
* assigned team member
* lead status
* timestamp

Clicking a conversation opens the complete chat history.

Messages should show:

* customer
* AI
* team member

Add:

* search
* filters
* unread status
* handoff status

---

# 16. ORDERS

Create a real order system.

Order fields:

* order number
* customer
* products
* quantity
* price
* total
* delivery address
* phone
* payment status
* order status
* assigned team member
* created_at
* updated_at

Order statuses:

* New
* Confirming
* Confirmed
* Preparing
* Delivered
* Cancelled

Do not reduce inventory incorrectly.

When an order is confirmed, inventory must be updated transactionally.

---

# 17. TEAM

Create team management: members and roles.

Admin can:

* add member
* deactivate member
* assign leads
* view member performance

Member statistics:

* assigned leads
* contacted leads
* won leads
* lost leads
* conversion rate
* revenue generated

---

# 18. AI SETTINGS

Create an AI Settings page.

Admin can configure:

* business name
* business description
* tone of voice
* sales strategy
* working hours
* delivery information
* payment methods
* return policy
* escalation rules
* maximum allowed discount
* team group chat ID

Create editable business knowledge/settings stored in the database (Neon Postgres).

The AI should use this information when responding.

---

# 19. DATABASE

Create proper Neon Postgres tables with relationships.

At minimum:

profiles
business_settings
products
categories
inventory_movements
customers
leads
lead_events
conversations
messages
orders
order_items
business_members
lead_assignments
ai_settings

Use UUID primary keys where appropriate.

Add timestamps.

Add indexes for frequently queried fields.

Implement proper foreign keys.

---

# 20. SECURITY

Implement Neon Postgres Row Level Security (app_user role + app.user_id()).

Authenticated admins and members must only access authorized data.

Never use insecure public database access for sensitive CRM data.

Never expose service-role credentials.

Validate all server-side actions.

Validate Telegram webhook requests where possible.

---

# 21. TELEGRAM WEBHOOK

Implement a real Telegram webhook or an appropriate secure server endpoint.

Incoming Telegram message flow:

Telegram
→ webhook
→ identify customer
→ save message
→ AI Sales Agent
→ inventory/tool lookup if required
→ generate response
→ send Telegram response
→ update CRM
→ detect lead/handoff/order

The system must support conversation history.

The AI must have access to relevant previous conversation context.

---

# 22. AI TOOL / FUNCTION CALLING

Do NOT give the AI direct unrestricted database access.

Create controlled tools/functions such as:

search_products(query)
get_product(product_id)
check_stock(product_id)
search_alternatives(product_id, budget)
get_business_settings()
create_lead(data)
update_lead(data)
create_order(data)
request_human_help(reason)
send_staff_notification(data)

The AI can only perform allowed actions through these functions.

---

# 23. REAL-TIME

Use frequent polling (server-driven refetch) where realtime is useful.

Dashboard should update when:

* new lead arrives
* new message arrives
* lead status changes
* order is created
* inventory changes
* a team member takes a lead

---

# 24. ERROR HANDLING

Implement real error handling.

Never leave the user with an infinite loading spinner.

Handle:

* Telegram API errors
* AI API errors
* database errors
* invalid product data
* missing inventory
* webhook failures
* authentication errors

Log errors server-side.

Show user-friendly messages.

---

# 25. NO FAKE FUNCTIONALITY

IMPORTANT:

Do NOT create fake buttons.

Do NOT create fake statistics.

Do NOT simulate Telegram messages.

Do NOT hardcode inventory.

Do NOT hardcode conversations.

Do NOT use mock data as the main application.

Every important feature must connect to the actual Neon database/API.

If an external integration requires credentials that are not available yet, create the correct integration architecture and a clear Settings screen for entering/configuring the credentials.

---

# 26. UI/UX

Design should feel like a serious SaaS product.

Style:

* modern
* clean
* professional
* fast
* minimal
* responsive
* excellent typography
* clear status indicators

Dashboard should be easy to understand without training.

Prioritize usability over visual decoration.

---

# 27. PRODUCTION QUALITY

Before considering the project complete:

* check all routes;
* check authentication;
* check database queries;
* check RLS;
* check CRUD;
* check mobile responsiveness;
* check loading states;
* check empty states;
* check error states;
* check Telegram integration architecture;
* check AI tool calls;
* check lead creation;
* check human handoff;
* check order creation;
* check inventory consistency.

Fix all TypeScript errors.

Fix all build errors.

Fix broken buttons.

Fix broken navigation.

Do not tell me "this can be implemented later".

Implement as much as possible now.

At the end, provide a clear list of:

1. What is fully implemented.
2. What requires external API credentials.
3. Exact environment variables required.
4. Exact Neon setup/migrations required.
5. Exact Telegram Bot setup/webhook steps required.

The final result must be a REAL working production-oriented AI Sales Agent platform, not a visual prototype.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://keta-sales.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/593cc811-2321-47a0-a092-94bc31804ffb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
