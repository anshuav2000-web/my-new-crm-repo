--
-- PostgreSQL database dump
--

\restrict i8zuJvXwYElnoB2ffgR7rRUaS5oEQlsbXpgxc9EStku7i5UIZNgfO2QfBXagsYw

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activities (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    entity_type text,
    entity_id text,
    user_id text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.activities OWNER TO postgres;

--
-- Name: call_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.call_logs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    lead_id text,
    contact_id text,
    called_by text,
    outcome text DEFAULT 'call'::text NOT NULL,
    duration text,
    notes text,
    scheduled_at text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.call_logs OWNER TO postgres;

--
-- Name: contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contacts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    company text,
    title text,
    social_links jsonb,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.contacts OWNER TO postgres;

--
-- Name: deals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deals (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    value integer DEFAULT 0,
    stage text DEFAULT 'new_lead'::text NOT NULL,
    probability integer DEFAULT 10,
    expected_close_date text,
    lead_id text,
    contact_id text,
    assigned_to text,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.deals OWNER TO postgres;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    amount integer NOT NULL,
    description text,
    vendor text,
    receipt_url text,
    expense_date text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    invoice_id text NOT NULL,
    description text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    rate integer DEFAULT 0 NOT NULL,
    amount integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.invoice_items OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    invoice_number text NOT NULL,
    lead_id text,
    contact_id text,
    client_name text NOT NULL,
    client_email text,
    client_phone text,
    client_address text,
    status text DEFAULT 'draft'::text NOT NULL,
    subtotal integer DEFAULT 0,
    discount_type text DEFAULT 'percentage'::text,
    discount_value integer DEFAULT 0,
    tax_percentage integer DEFAULT 18,
    total integer DEFAULT 0,
    amount_paid integer DEFAULT 0,
    notes text,
    due_date text,
    sent_at text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: leads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leads (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    company text,
    source text DEFAULT 'manual'::text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    tags text[] DEFAULT '{}'::text[],
    notes text,
    assigned_to text,
    value integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    category text,
    city text,
    country text,
    address text,
    website text,
    linkedin text,
    facebook text,
    instagram text,
    description text,
    business_hours text,
    lead_quality_score integer,
    quality_reasoning text,
    social_signals text,
    growth_signals text,
    call_outcome text,
    interested_services text[] DEFAULT '{}'::text[]
);


ALTER TABLE public.leads OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    invoice_id text NOT NULL,
    amount integer NOT NULL,
    method text DEFAULT 'bank_transfer'::text NOT NULL,
    reference text,
    notes text,
    paid_at text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.services (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    rate integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.services OWNER TO postgres;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    assigned_to text,
    due_date text,
    related_lead_id text,
    related_deal_id text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: webhooks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webhooks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    url text,
    secret text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.webhooks OWNER TO postgres;

--
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activities (id, type, description, entity_type, entity_id, user_id, created_at) FROM stdin;
1e6abd1c-c694-4dcf-82f6-8d3d0d60bf84	lead_created	New lead: Rajesh Kumar from TechStartup India	lead	24cdac76-abfb-4820-9963-1565cffe3635	\N	2026-02-21 15:14:08.057375
da268525-055d-4c73-990c-cf7783657742	deal_created	New deal: Skyline Digital Campaign (₹3,50,000)	deal	\N	\N	2026-02-21 15:14:08.060085
0b5df4ee-0d2c-4601-88e0-31ca010feb8d	call_logged	Call with Priya Sharma - Interested in services	call_log	\N	\N	2026-02-21 15:14:08.062957
c6612657-1bca-4393-abba-03fe9d464766	task_completed	Completed: Review Skyline project deliverables	task	\N	\N	2026-02-21 15:14:08.065945
d594e77c-3538-4556-8209-c55d9141f99a	lead_created_webhook	Lead created via n8n automation	lead	\N	\N	2026-02-21 15:14:08.068827
1d8f78e1-01b8-4e91-ad20-88cb14de6c54	lead_created	New lead created: Test CRM Lead	lead	3f573fd0-5a93-4a14-a9be-ed601324fa0e	\N	2026-02-21 15:16:48.923786
3e369756-b675-4745-935f-eada48ddd2b1	lead_created_webhook	Lead "N8N Test Lead" created via n8n webhook "n8n Lead Capture"	lead	37d044b3-9c27-461c-8436-85ff1da81124	\N	2026-02-21 15:17:43.279614
5698f206-81e5-42c1-9a99-a556d56f6f8f	lead_created_webhook	Lead "John Doe" created via n8n webhook "n8n Lead Capture"	lead	187e12c6-45be-4505-a87c-dd598542c747	\N	2026-02-21 17:31:50.789734
298275a2-d205-4d41-ae91-6a32a19cc7bf	lead_created_webhook	Lead "John Doe" created via n8n webhook "n8n Lead Capture"	lead	c2c40052-4b2a-4b0c-b7c7-fe98c961f40c	\N	2026-02-21 17:33:36.880939
07868fd1-9594-450e-886f-28879c26805f	lead_created	New lead created: Urban Threads	lead	9cc6a8f9-ac4f-4c5c-b53b-61bf62088efb	\N	2026-02-21 17:48:09.631701
192b19f8-2cd3-4358-884d-ca51306ec574	lead_created_webhook	Lead "Urban Threads" created via n8n webhook "n8n Lead Capture"	lead	69f7459d-0a48-4197-95c3-86961800f16c	\N	2026-02-21 17:54:09.285231
6be6ed52-34fc-4fc3-afa9-feeed0b97ad8	lead_created_webhook	Lead "Urban Threads Boutique" created via n8n webhook "n8n Lead Capture"	lead	14f74830-89b8-4deb-8aec-12e52d934c77	\N	2026-02-21 17:56:47.826445
ebf7764e-09a8-464f-b94c-0914cda65c8f	lead_created_webhook	Lead "Urban Threads Boutique" created via n8n webhook "n8n Lead Capture"	lead	a96f5b32-e230-445b-a751-fff61d792ee0	\N	2026-02-21 17:59:00.330961
66381968-500a-4469-9ebe-37dcb43fbf28	lead_created_webhook	Lead "Urban Threads Boutique" created via n8n webhook "n8n Lead Capture"	lead	5bf968d1-20c1-4ba1-867c-bd2275cb8fdb	\N	2026-02-21 18:15:33.301587
87cdbb18-7f84-4ad0-b8e8-e8a4cbf1258d	lead_created_webhook	Lead "Urban Threads Boutique" created via n8n webhook "n8n Lead Capture"	lead	fd5df661-3a7e-49c9-8b5b-b2d28f0eacad	\N	2026-02-21 18:25:49.811503
7e7082be-fdd7-4469-b205-49fb3f308c35	lead_created_webhook	Lead "Urban Threads Boutique" created via n8n webhook "n8n Lead Capture"	lead	286f0609-4240-4eef-806a-895f629cf8c0	\N	2026-02-21 19:13:51.551867
04dd88ec-c875-4b84-9ae4-1133d73f1bfb	invoice_created	Invoice INV-0001 created for Neha Gupta	invoice	6176d137-a56b-4a1c-82c4-47064ac62132	\N	2026-02-21 19:54:24.198692
947aa83e-341b-4745-850d-dbaf7f530449	invoice_sent	Invoice INV-0001 sent to ANSHUAV2000@GMAIL.COM	invoice	6176d137-a56b-4a1c-82c4-47064ac62132	\N	2026-02-21 19:58:05.680042
dddaa74a-14a0-4b04-bd79-c8fb2d30831d	invoice_created	Invoice INV-0002 created for Test Invoice Client	invoice	3ab780d0-621b-46e1-98a0-e8e3c8d6152a	\N	2026-02-21 20:00:21.789819
bf92edf5-521d-454c-a90c-175d0e91335a	invoice_created	Invoice INV-0001 created for Karthik Menon	invoice	dd217c0b-7680-43fc-9c1e-5bbefc6497a7	\N	2026-02-21 20:34:19.395756
1ed0b077-3ad0-4b6d-bb20-412d17185e9c	invoice_created	Invoice INV-0001 created for Karthik Menon	invoice	965d43cb-9d08-4bc4-bfb5-3503d1182d40	\N	2026-02-21 20:40:22.251441
891f22b9-f0f1-48b6-ab6f-06c6263648a4	invoice_sent	Invoice INV-0001 sent to ANSHUAV2000@GMAIL.COM	invoice	965d43cb-9d08-4bc4-bfb5-3503d1182d40	\N	2026-02-21 20:40:25.485669
558a23b2-09a8-44e7-a695-4fe13f73efba	lead_created	New lead created: Priyankur Nath	lead	a666e68f-e13c-4eb3-bc43-80dd694bd682	\N	2026-02-23 19:23:09.074277
36d52bc5-c990-44f3-93cb-c69265b2435b	lead_created	New lead created: Priyankur Nath	lead	dec2e2f0-868e-42e4-b35a-662866792ffd	\N	2026-02-24 08:27:53.753343
b29fe5d5-4252-4ef0-b893-495d4ec0098d	lead_created	New lead: Rajesh Kumar from TechStartup India	lead	82fc2106-62ea-4a0e-8843-7903f48fcac5	\N	2026-02-24 23:23:03.031839
3c6fe9ad-a4dd-45a4-82bd-2c4be34b4120	deal_created	New deal: Skyline Digital Campaign (₹3,50,000)	deal	\N	\N	2026-02-24 23:23:03.035746
04619924-3690-4e50-b4d2-7c313dd9ef38	call_logged	Call with Priya Sharma - Interested in services	call_log	\N	\N	2026-02-24 23:23:03.038753
a1f28506-4916-4086-84f7-0fe721ae21b5	task_completed	Completed: Review Skyline project deliverables	task	\N	\N	2026-02-24 23:23:03.042256
31e2b948-e92d-421a-82fe-559e24eb1842	lead_created_webhook	Lead created via n8n automation	lead	\N	\N	2026-02-24 23:23:03.045715
\.


--
-- Data for Name: call_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.call_logs (id, lead_id, contact_id, called_by, outcome, duration, notes, scheduled_at, created_at) FROM stdin;
e855c3d3-0521-40df-8795-53abc0f036f4	24cdac76-abfb-4820-9963-1565cffe3635	\N	Sales Team	picked_up	10 min	Discussed website requirements	\N	2026-02-21 15:14:08.03084
45ff073c-f654-4327-8ed4-ce0f7cede64b	d436135f-876d-4369-bb78-a2efd3d22749	\N	Account Manager	interested	15 min	Very interested in ad design services	\N	2026-02-21 15:14:08.033301
72fa10a7-a6fb-4988-8f75-e3f2f4e6899e	0fca4dc9-060d-4898-9b93-b31fb7761114	\N	Sales Team	schedule_call	5 min	Asked to call back next week	2026-03-01T10:00	2026-02-21 15:14:08.035832
3b935bf0-9f05-4008-9993-ab4a4e5ab4d6	3d342e94-deef-4087-a915-3d5c6ecd5c82	\N	Project Lead	call_later	3 min	In a meeting, call after 4pm	\N	2026-02-21 15:14:08.038732
190a771b-f451-411b-9b1a-fc449752c8a1	4c91887b-eda4-4290-9300-99a36983dd39	\N	Sales Team	not_interested	2 min	Already has an agency	\N	2026-02-21 15:14:08.041428
05c55e6f-6781-4071-9d8a-311f09a7a174	82fc2106-62ea-4a0e-8843-7903f48fcac5	\N	Sales Team	picked_up	10 min	Discussed website requirements	\N	2026-02-24 23:23:03.001677
df190899-cae0-4dbd-b497-3afb18639674	3b53aa3b-d2da-4439-9ba7-3a35a1746095	\N	Account Manager	interested	15 min	Very interested in ad design services	\N	2026-02-24 23:23:03.005775
49b77759-9881-4c03-a64b-96dd7c8eaf15	f64d288a-ffff-4f3b-b49f-236654270e38	\N	Sales Team	schedule_call	5 min	Asked to call back next week	2026-03-01T10:00	2026-02-24 23:23:03.009545
5b8c36a9-3568-4af3-92d2-9968ac25f846	c4751a84-322a-4fd1-90df-ffa3007e5de4	\N	Project Lead	call_later	3 min	In a meeting, call after 4pm	\N	2026-02-24 23:23:03.012251
2f0ebebb-e19d-4310-9072-5f00253918ff	857bdf12-2a48-4fed-83a1-caec008d3582	\N	Sales Team	not_interested	2 min	Already has an agency	\N	2026-02-24 23:23:03.0157
\.


--
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contacts (id, name, email, phone, company, title, social_links, notes, created_at) FROM stdin;
6c780371-1d2b-4ece-85df-7fa8e41ce709	Ananya Desai	ananya@designstudio.com	+91 9988776655	Design Studio	Creative Director	\N	\N	2026-02-21 15:14:08.005881
5d79a23f-c684-4de4-9b95-20c15b8fd9e5	Karthik Menon	karthik@mediahouse.in	+91 8877665544	Media House	Marketing Manager	\N	\N	2026-02-21 15:14:08.009139
152e4699-e760-40a7-b5b2-f3271214c212	Neha Gupta	neha@ecommerce.in	+91 7766554433	ShopEase	CEO	\N	\N	2026-02-21 15:14:08.012539
d15bbe28-b5b6-47bd-95b9-b88cdf90ca38	Ananya Desai	ananya@designstudio.com	+91 9988776655	Design Studio	Creative Director	\N	\N	2026-02-24 23:23:02.968135
3618c770-9b65-4461-b3f2-4161af6b1a11	Karthik Menon	karthik@mediahouse.in	+91 8877665544	Media House	Marketing Manager	\N	\N	2026-02-24 23:23:02.973862
95905659-983e-45ac-b25d-0c428fd475d2	Neha Gupta	neha@ecommerce.in	+91 7766554433	ShopEase	CEO	\N	\N	2026-02-24 23:23:02.976911
\.


--
-- Data for Name: deals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.deals (id, title, value, stage, probability, expected_close_date, lead_id, contact_id, assigned_to, notes, created_at) FROM stdin;
39514190-7f86-4873-a27d-9184a4f5b5fc	Fashion Forward Brand Campaign	75000	contacted	40	2026-03-20	\N	\N	\N	Sent portfolio samples	2026-02-21 15:14:08.019023
a597c79a-ac4c-4f21-8a17-a991fffc03fe	Spice Route Marketing Package	120000	proposal	60	2026-04-01	\N	\N	\N	Proposal sent and under review	2026-02-21 15:14:08.021745
f11aa8c8-398a-4309-bf98-6cf4fc834f4d	EduBright Video Series	200000	negotiation	75	2026-04-15	\N	\N	\N	Negotiating scope and timeline	2026-02-21 15:14:08.024681
155ace79-fc44-40ee-b5d4-a0d7214151c7	Skyline Digital Campaign	350000	won	100	2026-02-28	\N	\N	\N	Contract signed, project started	2026-02-21 15:14:08.02789
f7d6185b-ba0c-4154-8aad-35074d9aea88	TechStartup Website Redesign	50000	contacted	20	2026-03-15	\N	\N	\N	Initial consultation done	2026-02-21 15:14:08.015951
7a8d72ae-a65c-4d80-bc12-8a7b47bc020f	TechStartup Website Redesign	50000	new_lead	20	2026-03-15	\N	\N	\N	Initial consultation done	2026-02-24 23:23:02.980642
82dd843f-10eb-48f7-834a-6625797a15ef	Fashion Forward Brand Campaign	75000	contacted	40	2026-03-20	\N	\N	\N	Sent portfolio samples	2026-02-24 23:23:02.985931
9e40bc03-a187-4dc2-a5f4-6a87dfa1fb8a	Spice Route Marketing Package	120000	proposal	60	2026-04-01	\N	\N	\N	Proposal sent and under review	2026-02-24 23:23:02.989364
c651787d-6eb8-4c84-a310-8c45e7ccf7fc	EduBright Video Series	200000	negotiation	75	2026-04-15	\N	\N	\N	Negotiating scope and timeline	2026-02-24 23:23:02.99395
f5f872bd-4a2a-4b47-b9e1-09dfe8e07d27	Skyline Digital Campaign	350000	won	100	2026-02-28	\N	\N	\N	Contract signed, project started	2026-02-24 23:23:02.997802
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, title, category, amount, description, vendor, receipt_url, expense_date, created_at) FROM stdin;
\.


--
-- Data for Name: invoice_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoice_items (id, invoice_id, description, quantity, rate, amount) FROM stdin;
2ab6dae4-7e4a-4449-a7eb-1076a4e5c2bf	965d43cb-9d08-4bc4-bfb5-3503d1182d40	Website Development	1	50000	50000
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, invoice_number, lead_id, contact_id, client_name, client_email, client_phone, client_address, status, subtotal, discount_type, discount_value, tax_percentage, total, amount_paid, notes, due_date, sent_at, created_at) FROM stdin;
965d43cb-9d08-4bc4-bfb5-3503d1182d40	INV-0001	3d342e94-deef-4087-a915-3d5c6ecd5c82	5d79a23f-c684-4de4-9b95-20c15b8fd9e5	Karthik Menon	ANSHUAV2000@GMAIL.COM	09971193032	A84,DEVLI EXTENTION,TIGRI T POINT,GUPTA JI KA DHABA,DELHI,DELHI-110080\nC539	sent	50000	percentage	0	18	59000	0			2026-02-21T20:40:25.478Z	2026-02-21 20:40:22.242366
\.


--
-- Data for Name: leads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leads (id, name, email, phone, company, source, status, tags, notes, assigned_to, value, created_at, category, city, country, address, website, linkedin, facebook, instagram, description, business_hours, lead_quality_score, quality_reasoning, social_signals, growth_signals, call_outcome, interested_services) FROM stdin;
82fc2106-62ea-4a0e-8843-7903f48fcac5	Rajesh Kumar	rajesh@techstartup.in	+91 9876543210	TechStartup India	website	new	{}	Interested in website development and social media marketing	\N	50000	2026-02-24 23:23:02.897924	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
3b53aa3b-d2da-4439-9ba7-3a35a1746095	Priya Sharma	priya@fashionbrand.com	+91 9123456789	Fashion Forward	referral	contacted	{}	Looking for complete brand identity and advertisement design	\N	75000	2026-02-24 23:23:02.940888	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
f64d288a-ffff-4f3b-b49f-236654270e38	Amit Patel	amit@foodchain.in	+91 8765432109	Spice Route Restaurants	social_media	qualified	{}	Multi-location restaurant chain needs full marketing strategy	\N	120000	2026-02-24 23:23:02.956098	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
c4751a84-322a-4fd1-90df-ffa3007e5de4	Sneha Reddy	sneha@edtech.co	+91 7654321098	EduBright	email	proposal	{}	EdTech startup needs video production and marketing automation	\N	200000	2026-02-24 23:23:02.960339	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
857bdf12-2a48-4fed-83a1-caec008d3582	Vikram Singh	vikram@realestate.in	+91 6543210987	Skyline Properties	manual	negotiation	{}	Real estate developer needs comprehensive digital marketing	\N	350000	2026-02-24 23:23:02.964236	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, invoice_id, amount, method, reference, notes, paid_at, created_at) FROM stdin;
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.services (id, name, description, rate, is_active, created_at) FROM stdin;
1f05f95b-41bb-46bb-a5d8-3bdc59d95cde	Advertisement Design	Eye-catching ads for print & digital	15000	t	2026-02-21 20:03:26.401689
eba8718b-e8d5-44e0-8b20-c61f234fbb50	Social Media Content	Strategic content that connects	20000	t	2026-02-21 20:03:26.401689
8b4b3a8b-34f7-40cb-a063-ccb9f7f938cd	Website Development	Fast, responsive, conversion-focused	50000	t	2026-02-21 20:03:26.401689
8c5fc81a-f0db-4bbf-9afe-e64241168c04	Video Production	Compelling brand storytelling	25000	t	2026-02-21 20:03:26.401689
16965283-2854-4a0f-b1cb-bd7d29368fa0	Photo Production	Professional brand photography	15000	t	2026-02-21 20:03:26.401689
4810c829-e389-4377-91f5-1d3251b3ccc2	Marketing Strategy	Complete roadmaps for growth	35000	t	2026-02-21 20:03:26.401689
6eed9d9c-fd14-4cf1-893f-379bb40d7734	n8n Automation	Workflow & business automation	30000	t	2026-02-21 20:03:26.401689
31172d5f-6cbd-46b5-830b-e160cb74d375	Brand Identity Package	Complete brand identity design	45000	t	2026-02-21 20:07:33.64682
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (sid, sess, expire) FROM stdin;
mZ_BIgw757qo6UCERaFcgzJlrwFxxAVm	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-28T19:22:59.845Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "UJ7VuE0-wwlmAk-w9Tsng9M6UVJvqX1cg-mFmO0g7cI"}}	2026-02-28 19:23:00
0Fsj4G0xvj-OJIVMBZanm3zGfKz1yIH4	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-28T19:23:06.329Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "bs8A_l7JxMSoKwVUEjVfyYMjDZ1ogsfvvIBQxDJSqjQ"}}	2026-02-28 19:23:07
zizwnC1Tq2aNk2jdZo3XRI7ANdIOYeOX	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-28T19:23:42.770Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "zAg4A19fwd10x6DyBW4z9ru3fxqYGjLsXpYsDo7V1Fw"}}	2026-02-28 19:23:43
kNfh_pwT8epNmrvXV0NY9R2ZMPZp2Z9p	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-28T19:23:54.826Z", "httpOnly": true, "originalMaxAge": 604800000}, "test-mock-oidc.replit.app": {"code_verifier": "JlqV1qwBDaOIqEK7cWISRW0tQqkBkT37GsKRGd82PFU"}}	2026-02-28 19:23:55
gPODB5aj5OLVsoksKRxEOEzcEKptZ-Fe	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-28T19:24:01.465Z", "httpOnly": true, "originalMaxAge": 604800000}, "test-mock-oidc.replit.app": {"code_verifier": "Jxjo6oM1m5PO6PySygzIgX0ZC48xL__Z92GQFAlR-ZQ"}}	2026-02-28 19:24:02
qsU53-NarUDiClhB7wwaJ4Yq3aoPJJ56	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-28T19:26:03.246Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "Q-NI5AyNahhEjCn0bG9YZ1nHXqOgmvkH3Sre2CQGXbo"}}	2026-02-28 19:26:04
lWTFvnSOvUT-GT8j3H1wCfJq25pHXgdB	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-28T19:31:38.923Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": "test-user-1"}	2026-02-28 19:31:39
lwDH6zUDgA7ahE15CWy8lKviDDGE5lhA	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-28T19:32:05.130Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": "test-user-1"}	2026-02-28 19:32:06
NOPK9egVVYH_DOonNrn22usnBvnxtfpe	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-28T19:32:10.390Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": "test-user-1"}	2026-02-28 19:32:11
4xtN8Z91ISgRtonMPn70vFZE6EY58UrJ	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-28T19:32:11.993Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": "test-user-1"}	2026-02-28 19:32:12
0cryxfEXCWl2HCSUYkPywNoa-L6UE2OZ	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-28T19:32:13.389Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": "test-user-1"}	2026-02-28 19:32:14
pMLX2rXRWO-lNmSmSZVzfOYoOpOY_E0w	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-28T19:32:14.064Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": "test-user-1"}	2026-02-28 19:32:15
y2wN2oymb34H-c0Fhp216nYRhbiW5neq	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-28T19:38:26.263Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "nQzk3jqo67Ppk3ax46dHHu9JRjRk85ngh1T3eGhy2xc"}}	2026-02-28 19:38:27
K8oGUdivlYRzDtkfXFYNKAxuh94i5E8g	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-28T19:38:32.622Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "F3bB2qEtUSSkJi4nZWVmAZ8p-l-gBQpHzWjqaep6sLs"}}	2026-02-28 19:38:33
FV0H33WPIEyFQVLOOr979vsvpRrpUVsA	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-28T19:24:08.227Z", "httpOnly": true, "originalMaxAge": 604800000}, "test-mock-oidc.replit.app": {"code_verifier": "NzfyqKgkjtLp5hOJFuh-p0EX7OSCc7p1ULeUGeT8jA0"}}	2026-02-28 19:24:09
jkvhQyfJGAfh-ndGXUEOAvTJkD1IlYnz	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-28T19:24:05.132Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "4d69b8a8-32e4-42d1-b827-74c4320e3319", "exp": 1771705445, "iat": 1771701845, "iss": "https://test-mock-oidc.replit.app/", "jti": "3e45da9ebf3ab908e629f288ceae6315", "sub": "test-user-1", "email": "admin@canvascartel.in", "auth_time": 1771701845, "last_name": "User", "first_name": "Admin"}, "expires_at": 1771705445, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzcxNzAxODQ1LCJleHAiOjE3NzE3MDU0NDUsInN1YiI6InRlc3QtdXNlci0xIiwiZW1haWwiOiJhZG1pbkBjYW52YXNjYXJ0ZWwuaW4iLCJmaXJzdF9uYW1lIjoiQWRtaW4iLCJsYXN0X25hbWUiOiJVc2VyIn0.btflv72absPiy-29PVdnbFtmh8oTOkHVBJvl7zC9swHufTNIHWmK6gtx7yqO5D-RVfMVjUCyP9eY099fmnPpUw7i9Mm7bh21BIl6gsFnGZ7DKBwxiq1iIxFXyF27iECE4ZG7qews3qkIvCUNSmM9V1DT3qhCWwLadeoBRGyfCyyWu8NxJtGeznO85yPg-p0Fo7KWg0xujjdCoVA_y8JBVm3NvBLzeD2GDwUilifZP7_ZkHpLA4u3ZuySENxDpJDEeGCopb5z9ISQioaKdxtk3hhD_UqJD_rT--X7nUdi_0Wzk7mANOVTgPWoZEB0ioQi08HxpAu6Jah5VFLYCdcvRA", "refresh_token": "eyJzdWIiOiJ0ZXN0LXVzZXItMSIsImVtYWlsIjoiYWRtaW5AY2FudmFzY2FydGVsLmluIiwiZmlyc3RfbmFtZSI6IkFkbWluIiwibGFzdF9uYW1lIjoiVXNlciJ9"}}}	2026-02-28 19:24:22
JyBTbEhsY3Rjps_W2olgnOV6RlIN7tUO	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-28T19:24:43.559Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "LUyE8Tbub2iSgpACT3IiSU3oAI_-JYDJVG26XRMmtNU"}, "test-mock-oidc.replit.app": {"code_verifier": "OxMBIR0uqltILjdCgLIDC-91VhhW4cHoJ_gxJKL9YO0"}}	2026-02-28 19:24:44
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (id, key, value) FROM stdin;
0723b93c-fbef-4bb0-b433-d9a3dedb8026	company_name	Canvas Cartel
8fdac4e4-6281-413c-9d9e-6747acd71f21	company_tagline	Creative Design & Marketing Studio
5ee613e8-5a0b-40f1-bf11-a6d5ff62b23f	company_website	https://canvascartel.in
7ab2337c-82ab-4334-b96c-3fd6eee04c97	company_email	
47a818c8-73c5-4452-8598-3a2c83699a35	company_phone	
aa61963a-c867-476d-835a-827e89c06dac	company_address	India
a069c9d1-6ff3-41b1-aa1a-8807def15c73	default_tax	18
fe28052f-69fa-4812-9bea-5920aef84f34	facebook_url	
679e56fa-e0df-4025-bd01-00c1a8c9bdda	instagram_url	
5cc2fdc8-160c-4eca-a4a6-e9e579daf9c2	linkedin_url	
44184971-bfe3-467f-b96f-085b80ebc420	twitter_url	
31406bdf-7564-4161-a4a8-84ab12224b3d	youtube_url	
7d95f7d4-9102-4f75-896f-85b9ec90d43b	currency_name	INR
b7131d42-f82e-436c-9cdd-1720e0548e15	currency_symbol	₹
6cdf5d99-5620-48ca-b194-9b6b1cc48e35	enable_purchasing	false
f44f5c8e-3b74-4ba0-a4bf-707612d82426	enable_auto_invoicing	true
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tasks (id, title, description, status, priority, assigned_to, due_date, related_lead_id, related_deal_id, created_at) FROM stdin;
fa924c24-266c-4441-b0d7-9acb449d8480	Prepare proposal for Spice Route	Create detailed marketing proposal with timeline and budget	pending	high	Design Team	2026-03-05	\N	\N	2026-02-21 15:14:08.044484
55eb08b8-7043-4e4d-914d-eff154b86d0d	Follow up with Fashion Forward	Send portfolio and schedule meeting	in_progress	medium	Sales Team	2026-03-03	\N	\N	2026-02-21 15:14:08.048268
afa4919f-60ad-4c5f-b1c9-c430ece4af0a	Review Skyline project deliverables	Check first batch of creatives	completed	high	Creative Director	2026-02-25	\N	\N	2026-02-21 15:14:08.054462
7b22d58a-4ea0-4993-a58c-7ebc1eb09dd7	Create social media content calendar	Monthly content plan for March	completed	medium	Content Team	2026-03-01	\N	\N	2026-02-21 15:14:08.051407
6a8755ef-2792-42e1-8f34-e309c7d247e7	Prepare proposal for Spice Route	Create detailed marketing proposal with timeline and budget	pending	high	Design Team	2026-03-05	\N	\N	2026-02-24 23:23:03.018992
654005b9-a167-4e3c-957f-f18a219c0a00	Follow up with Fashion Forward	Send portfolio and schedule meeting	in_progress	medium	Sales Team	2026-03-03	\N	\N	2026-02-24 23:23:03.022347
340795db-e1f6-4981-92f9-237db134418b	Create social media content calendar	Monthly content plan for March	pending	medium	Content Team	2026-03-01	\N	\N	2026-02-24 23:23:03.02551
1b28b7c7-48cc-4e26-b8fa-a27b08807ee2	Review Skyline project deliverables	Check first batch of creatives	completed	high	Creative Director	2026-02-25	\N	\N	2026-02-24 23:23:03.028533
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, first_name, last_name, profile_image_url, created_at, updated_at) FROM stdin;
test-user-1	admin@canvascartel.in	Admin	User	\N	2026-02-21 19:24:05.110455	2026-02-21 19:24:05.110455
\.


--
-- Data for Name: webhooks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.webhooks (id, name, url, secret, is_active, created_at) FROM stdin;
1a670cdd-aa9a-456d-8f33-f66c0089b865	n8n leads	\N	\N	t	2026-02-21 20:30:46.417315
d7e9f479-8dd3-46c3-bda7-24a93de0ff33	n8n Leads	\N	\N	t	2026-02-22 13:25:01.0049
64e93c06-631e-42bd-92d8-c960ef6c96b4	n8n Lead Capture	\N	\N	t	2026-02-24 23:23:03.048494
\.


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: call_logs call_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: deals deals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webhooks webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT webhooks_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- PostgreSQL database dump complete
--

\unrestrict i8zuJvXwYElnoB2ffgR7rRUaS5oEQlsbXpgxc9EStku7i5UIZNgfO2QfBXagsYw

