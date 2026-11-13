--
-- PostgreSQL database dump
--

\restrict SZBUmI9JM86TwDQSJBeQtygi8yaaavg8GrhCtonQy9Qz0DFC7HXzPsbXymmOm3J

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-11-13 04:09:16

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 29303)
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- TOC entry 5935 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: 
--


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 226 (class 1259 OID 30392)
-- Name: healthcare_facilities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.healthcare_facilities (
    id bigint NOT NULL,
    facility_name text NOT NULL,
    facility_type text NOT NULL,
    ownership text DEFAULT 'Unknown'::text NOT NULL,
    address text,
    geom public.geometry(Point,4326) NOT NULL,
    contact_number text,
    notes text
);


--
-- TOC entry 225 (class 1259 OID 30391)
-- Name: healthcare_facilities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.healthcare_facilities ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.healthcare_facilities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 5929 (class 0 OID 30392)
-- Dependencies: 226
-- Data for Name: healthcare_facilities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.healthcare_facilities (id, facility_name, facility_type, ownership, address, geom, contact_number, notes) FROM stdin;
11	Akram Hospital	Hospital	Private	Zarghoon Road, Quetta	0101000020E6100000347ADA86F6BF50409E55B0D7052F3E40	081-2869235	\N
16	Medicare Hospital	Hospital	Private	Gillani Road, Quetta	0101000020E6100000FAAD426F16C050400255922BAB2F3E40	0333-5784465	\N
40	Sheikh Khalifa Bin Zayed Hospital	Hospital	Public	Mastung Road, Quetta	0101000020E61000000A8DCB0686BD50408AEB3FB13D153E40	081-2892180	\N
41	Yaseen Hospital	Hospital	Private	Patel Road, Patel Bagh, Quetta	0101000020E61000005AEB27208CC05040176B7544AF303E40	081-2822425	\N
42	Christian Hospital	Hospital	Private	Mission Road, Quetta	0101000020E61000001211625C2DC1504095E49A84DB323E40	081-2842697	\N
48	Bolan Medical Complex Hospital	Hospital	Public	Brewery Road, near Goli Mar Chowk, Quetta	0101000020E6100000A447F13455BE50407D52E28DDA303E40	+92 81 9213030	\N
38	Mehmood Hospital	Hospital	Private	Faisal Town, Hazara Town, Quetta	0101000020E61000009F5ED107B2BD50409B213FC6C32F3E40	\N	\N
45	Al Khidmat Hospital Quetta	Hospital	Private	Brewery Road, Railway Housing Society, Wahdat Colony, Quetta	0101000020E610000054A530D167BF5040FB0E807BD2303E40	+92 81 2440962	\N
12	Sajjid Hospital	Hospital	Private	Quetta, Pakistan	0101000020E6100000E2B26554F4BF504001310917F22E3E40	081-2869191	\N
19	Civil Hospital Quetta	Hospital	Public	Jinnah Road, Quetta	0101000020E610000065F61ED37FC05040D481ACA756313E40	081-9202017	\N
13	Helpers Eye Hospital	Hospital	Public	Saryab Road, Quetta	0101000020E61000006D020CCB9FBF5040EF31A2FEC42C3E40	\N	Original type before cleanup: Hospital - ownership to verify
20	City International Hospital	Hospital	Private	Zarghun Road, Quetta	0101000020E6100000F497272122C0504031AC87D459303E40	081-2842042	\N
21	Tariq Hospital Saryab Quetta	Hospital	Private	Sariab Road, Shahwani, Quetta	0101000020E610000096A652FD94BE50408AC4A97B09203E40	0330-8713882	\N
25	Jailani Hospital	Hospital	Private	Satellite Town, Quetta	0101000020E6100000281BC5283EC05040AE7BD058A02A3E40	081-2453703	\N
44	Alamdar Clinic	Clinic	Private	Alamdar Plaza, Syedabad, Alamdar Road, Quetta	0101000020E610000069D0EDB9DDC1504084546791E12F3E40	+92 310 1010828	\N
27	Duaa Welfare Trust Hospital	Hospital	Public	Street 2, Hazara Town, Quetta	0101000020E61000002D82217A4EBD5040C3AF1809882F3E40	+92 81 2862150	\N
30	Dr Sultan Tareen Health Care and Transplant Institute	Healthcare facility	Private	Quetta, Pakistan	0101000020E61000009FD8270A2AC0504057BAE0E925303E40	081-2836285	\N
31	Rehan Hospital	Hospital	Private	Quetta, Pakistan	0101000020E6100000302BA92295C0504018E26FD142313E40	081-2838140	\N
34	Rahat Medical Complex Hospital	Hospital	Private	Art School Road, Quetta	0101000020E61000008DAE47CCFCC05040E4430130F1303E40	081-2838874	\N
1	LRBT Eye Hospital	Eye care facility	Private	Sariab Road, Wali Jet, Quetta, Balochistan	0101000020E61000006730A1DD7CBE5040B11875ADBD1D3E40	081-2470804	Original type before cleanup: Eye care facility - to verify
29	Balochistan Institute of Child Health Services	Hospital - children	Public	Quarry Road, Patel Bagh, Quetta	0101000020E61000000F37642C79C05040EF10CE0F2B303E40	081-2823707	\N
28	Dr Bashir Hospital	Hospital	Private	Sirki Road, Quetta	0101000020E6100000881AED167EC05040C51440C9BD2C3E40	081-2444304	\N
15	Heart & General Hospital	Hospital	Private	15-D, 16-D, Model Town, Old Pishin Bus Stop, Quetta	0101000020E61000007707C25F5DC05040A65E5C4F19343E40	081-2822408	\N
2	Ahsan Laboratory	Diagnostic laboratory	Private	M.A. Jinnah Road, near Saleem Medical Complex, Patel Bagh, Quetta	0101000020E610000073CD2E2988C05040300043458B303E40	081-2868152	\N
17	Al-Shafi Medical Centre	Hospital	Private	Zarghun Road, Quetta	0101000020E6100000EA2BA3EC08C05040BFAF366B952F3E40	0304-8048041	\N
33	Dr Sherbat Khan Mandokhail Gastro Center	Healthcare centre	Private	New Al-Gilani Road, Zarghun Road, Quetta	0101000020E6100000508869632FC0504072026D78162F3E40	0345-1014910	\N
43	BHU Killi Muhammad Shahi	Basic health unit	Public	Killi Muhammad Shahi, Mastung, Pakistan	0101000020E61000004A0219C22EBE50402A5C37A2211B3E40	\N	\N
26	Lady Dufferin Hospital	Hospital	Public	McConaghey Road, Quetta	0101000020E6100000A09394AA23C150401D6DC1F7A3313E40	081-2667985	Original type before cleanup: Hospital - ownership to verify
9	Imdad Hospital	Hospital	Private	Jinnah Road, Imdad Chowk, Baldia Town, Quetta	0101000020E610000045E0FE1227C05040F48AA71E69303E40	081-2824476	\N
36	Shifa Medical Center	Healthcare centre	Private	Main Zarghun Road, near Bukhari Bakery, Alzain Plaza, Quetta	0101000020E6100000F534448317C050400BD76DD2EA2F3E40	0333-7959632	\N
23	BINUQ	Hospital	Public	Samungli Road, Quetta	0101000020E610000051B2E6116DBE504033C6E2923E383E40	081-9204703	\N
6	CMH Quetta	Hospital	Public	Chiltan Road, Quetta Cantt	0101000020E61000000F8C721FEFC1504099AFDC1CF8363E40	081-9202970	\N
50	Zait Medical Centre	Healthcare centre	Private	Quetta, Pakistan	0101000020E61000004B9C0D75CDBE5040CD3CCDBC752D3E40	0314-3938072	\N
10	Mohtarma Benazir Bhutto General Hospital Quetta	Hospital	Public	Marriabad, Quetta	0101000020E6100000D092E96DFEC150409C275A8F41303E40	\N	\N
35	Zain Clinic	Clinic	Private	Poad Killi Cowk, 10-10/183, Zain Street, Sabzal Road, Quetta, 87300, Pakistan	0101000020E6100000A829A187C7BE5040F3D0BE09082E3E40	0331-6006569	\N
24	Fatima Jinnah Hospital	Hospital	Public	Brewery Road, Quetta	0101000020E61000000C9AF1110CBD5040A141542B5D313E40	081-2836448	Original type before cleanup: Hospital - identity to verify
22	Dr Abid (Rehave physio)	Healthcare facility	Private	Near MDS Super Market, Toghi Road, Quetta	0101000020E61000002F0ED36380C15040732376B7FC313E40	0348-2628196	Original type before cleanup: Healthcare facility - type to verify
18	Al-Khair Medical Complex	Hospital	Private	Zarghun Road, Baldia Town, Quetta	0101000020E61000007AAA436E06C0504066A3737E8A2F3E40	081-2844907	Original type before cleanup: Hospital - type to verify
5	Dr Vinod Kumar	Doctor practice	Private	\N	0101000020E6100000B08EE387CAC0504096F9580BFD2D3E40	\N	Original type before cleanup: Doctor practice - to verify
46	CENAR Cancer Hospital Quetta	Hospital	Public	Brewery Road, near Bolan Medical Complex Hospital, Quetta	0101000020E6100000A852D14735BE50408B596A42FE303E40	+92 81 9213227	\N
49	Al Qadeer Hospital	Hospital	Private	Barech Street, Sher Muhammad Road, Quetta	0101000020E6100000F11CA94BA8C05040AAFCC8F43D313E40	081-2875623	\N
47	Balochistan Institute of Psychiatry and Behavioral Sciences	Hospital - psychiatric	Public	Behind BMC Hospital, Brewery Road, Quetta	0101000020E61000009C96E0B251BE504023713FE13D313E40	081-9213092	\N
7	FC Hospital	Hospital	Public	Askari Park Road, Quetta	0101000020E6100000461CFC0E8FC050409C36E33444393E40	081-2300923	\N
14	Railway Hospital	Hospital	Public	Railway Hospital Colony, Quetta	0101000020E610000036188FF7CFBF5040080A174DC22E3E40	081-9211078	\N
37	MCH Hazara Town	Maternal and child healthcare centre	Private	Hazara Town, Quetta	0101000020E61000006C9D6B2DACBD50408FE2EA3E9B2F3E40	\N	\N
39	Al-Khiar Hospital	Hospital	Private	Zarghun Road, Quetta	0101000020E6100000AA8062E507C050402D7D50ECA92F3E40	0300-3838892	Original type before cleanup: Hospital - identity to verify
32	Dr Saleem Medical Foundation	Healthcare facility	Private	Khan Shaheed Muhalla, Pashtun Abad, Quetta	0101000020E61000008FEE8F779FC05040060A9C87D22A3E40	0330-6665775	Original type before cleanup: Healthcare facility - type to verify
8	Imam Khomeini Hospital Quetta	Hospital	Private	Block 3, Hazara Town, Brewery Road, Quetta	0101000020E6100000CBB50D48E7BD5040A91DB40D922E3E40	081-2857135	Original type before cleanup: Hospital - location to verify
4	Naveed Ultrasound	Diagnostic imaging centre	Private	Al Qadeer Hospital, Fatah Muhammed Road, Quetta	0101000020E6100000DC6C077EAFC05040490CA77114313E40	081-4128036	Original type before cleanup: Diagnostic imaging centre - identity to verify
\.


--
-- TOC entry 5768 (class 0 OID 29622)
-- Dependencies: 221
-- Data for Name: spatial_ref_sys; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- TOC entry 5936 (class 0 OID 0)
-- Dependencies: 225
-- Name: healthcare_facilities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.healthcare_facilities_id_seq', 50, true);


--
-- TOC entry 5775 (class 2606 OID 30404)
-- Name: healthcare_facilities healthcare_facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.healthcare_facilities
    ADD CONSTRAINT healthcare_facilities_pkey PRIMARY KEY (id);


--
-- TOC entry 5773 (class 1259 OID 30405)
-- Name: healthcare_facilities_geom_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX healthcare_facilities_geom_idx ON public.healthcare_facilities USING gist (geom);


-- Completed on 2026-11-13 04:09:17

--
-- PostgreSQL database dump complete
--

\unrestrict SZBUmI9JM86TwDQSJBeQtygi8yaaavg8GrhCtonQy9Qz0DFC7HXzPsbXymmOm3J

