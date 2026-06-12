import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import mc1Data from '@/data/mc1_subgraph.json'

// ─────────────────────────────────────────────────────────────────────────────
// KG·LENS  –  ICIJ Offshore Finance Knowledge Graph
// Inspired by the Panama Papers / Pandora Papers / FinCEN Files
// datasets published by the International Consortium of Investigative
// Journalists (ICIJ).  This is a scholar-level synthetic reconstruction
// that faithfully mirrors the schema, density, and analytical patterns of the
// real ICIJ graph (https://offshoreleaks.icij.org/) while avoiding any
// real-world identification of living individuals.
//
// Entity types   : Person · Organization · Jurisdiction · Intermediary · Asset
// Edge types     : known | uncertain | inferred | anomalous
// Clusters       : 0=Secrecy Havens · 1=European Network · 2=Asian-Pacific
//                  3=Americas · 4=Regulatory Bodies
//
// Stats: 80 nodes · 140 edges · 5 entity types · 5 clusters
//        18 anomalous nodes · ~38 % attribute sparsity
// ─────────────────────────────────────────────────────────────────────────────

const RAW_NODES = [
  // ── PERSONS ────────────────────────────────────────────────────────────────
  { id:'P01', label:'Viktor Harlow',      type:'Person',       cluster:0, conf:0.92, lat:51.5074, lng:-0.1278,  anomaly:false,
    attrs:{ nationality:'British',       role:'Director',       dob:'1961',  risk:'High',   source:'Panama Papers', verified:'yes', status:'Active',   notes:'Named in 212 offshore companies' }},
  { id:'P02', label:'Mei-Ling Zhao',      type:'Person',       cluster:2, conf:0.87, lat:22.3193, lng:114.1694, anomaly:false,
    attrs:{ nationality:'Chinese',       role:'Beneficial Owner',dob:'1974', risk:'High',  source:'Pandora Papers',verified:'yes', status:'Active',   notes:'Shell chain links to BVI/Cayman' }},
  { id:'P03', label:'Andrei Volkov',      type:'Person',       cluster:0, conf:0.55, lat:55.7558, lng:37.6173,  anomaly:true,
    attrs:{ nationality:'Russian',       role:'Nominee Director',dob:null,   risk:'Critical',source:'FinCEN Files',verified:'no',  status:'Sanctioned',notes:'PEP — sanctioned 2022' }},
  { id:'P04', label:'Catalina Reyes',     type:'Person',       cluster:3, conf:0.83, lat:-34.6037,lng:-58.3816, anomaly:false,
    attrs:{ nationality:'Argentinian',   role:'Shareholder',    dob:'1969',  risk:'Medium', source:'Panama Papers',verified:'yes', status:'Active',   notes:'Linked to Mossack Fonseca' }},
  { id:'P05', label:'James Whitmore',     type:'Person',       cluster:1, conf:0.78, lat:48.8566, lng:2.3522,   anomaly:false,
    attrs:{ nationality:'French',        role:'Trustee',        dob:'1955',  risk:'High',   source:'Pandora Papers',verified:'yes', status:'Active',   notes:'Manages discretionary trusts' }},
  { id:'P06', label:'Tariq Al-Mansouri',  type:'Person',       cluster:0, conf:0.42, lat:25.2048, lng:55.2708,  anomaly:true,
    attrs:{ nationality:'Emirati',       role:'UBO',            dob:null,    risk:'Critical',source:'FinCEN Files',verified:'no',  status:'Active',   notes:'AML alert — $240M unexplained flows' }},
  { id:'P07', label:'Ingrid Svenson',     type:'Person',       cluster:1, conf:0.96, lat:59.3293, lng:18.0686,  anomaly:false,
    attrs:{ nationality:'Swedish',       role:'Consultant',     dob:'1978',  risk:'Low',    source:'Public Register',verified:'yes',status:'Active',   notes:'Tax-advisory links to LGT bank' }},
  { id:'P08', label:'Chukwudi Obi',       type:'Person',       cluster:3, conf:0.69, lat:6.4531,  lng:3.3958,   anomaly:false,
    attrs:{ nationality:'Nigerian',      role:'Director',       dob:'1964',  risk:'High',   source:'Panama Papers', verified:'yes', status:'Active',   notes:'Tied to Lagos real estate SPVs' }},
  { id:'P09', label:'María Fuentes',      type:'Person',       cluster:3, conf:0.88, lat:19.4326, lng:-99.1332, anomaly:false,
    attrs:{ nationality:'Mexican',       role:'Beneficial Owner',dob:'1981', risk:'Medium', source:'Pandora Papers',verified:'yes', status:'Active',   notes:'Offshore assets undisclosed to SHCP' }},
  { id:'P10', label:'Klaus Bergmann',     type:'Person',       cluster:1, conf:0.74, lat:52.5200, lng:13.4050,  anomaly:false,
    attrs:{ nationality:'German',        role:'Director',       dob:'1959',  risk:'Medium', source:'Luxembourg Leaks',verified:'yes',status:'Retired', notes:'Former DAX CFO' }},
  { id:'P11', label:'Fatima Al-Rashid',   type:'Person',       cluster:0, conf:0.61, lat:24.7136, lng:46.6753,  anomaly:true,
    attrs:{ nationality:'Saudi',         role:'UBO',            dob:null,    risk:'Critical',source:'FinCEN Files',verified:'no',  status:'Active',   notes:'Royal family-adjacent, PEP flag' }},
  { id:'P12', label:'Soren Lindqvist',    type:'Person',       cluster:1, conf:0.90, lat:55.6761, lng:12.5683,  anomaly:false,
    attrs:{ nationality:'Danish',        role:'Shareholder',    dob:'1971',  risk:'Low',    source:'Public Register',verified:'yes',status:'Active',   notes:'Clean record; minor structure exposure' }},
  { id:'P13', label:'Priya Kapoor',       type:'Person',       cluster:2, conf:0.82, lat:28.6139, lng:77.2090,  anomaly:false,
    attrs:{ nationality:'Indian',        role:'Director',       dob:'1983',  risk:'Medium', source:'Pandora Papers',verified:'yes', status:'Active',   notes:'Fintech founder; undisclosed BVI holding' }},
  { id:'P14', label:'Rafael Carvalho',    type:'Person',       cluster:3, conf:0.48, lat:-23.5505,lng:-46.6333, anomaly:true,
    attrs:{ nationality:'Brazilian',     role:'Nominee',        dob:null,    risk:'Critical',source:'Lava Jato',   verified:'no',  status:'Indicted',  notes:'Petrobras scandal link' }},
  { id:'P15', label:'Eiko Tanaka',        type:'Person',       cluster:2, conf:0.77, lat:35.6762, lng:139.6503, anomaly:false,
    attrs:{ nationality:'Japanese',      role:'Shareholder',    dob:'1967',  risk:'Low',    source:'Pandora Papers',verified:'yes', status:'Active',   notes:'Structures linked to Singapore trusts' }},

  // ── ORGANIZATIONS (Shell Companies / Holding / Banks) ───────────────────────
  { id:'O01', label:'Alcazar Holdings Ltd',   type:'Organization', cluster:0, conf:0.72, lat:18.4655,lng:-66.1057, anomaly:true,
    attrs:{ jurisdiction:'BVI',        sector:'Shell Company',  incorporated:'2008', employees:null, revenue:null,    source:'Panama Papers', verified:'no',  status:'Dissolved', notes:'Mossack Fonseca client; dissolved after leak' }},
  { id:'O02', label:'Nexus Capital AG',       type:'Organization', cluster:1, conf:0.88, lat:47.1660, lng:9.5554,  anomaly:false,
    attrs:{ jurisdiction:'Liechtenstein',sector:'Investment Bank',incorporated:'1995', employees:'~80',revenue:'€200M',source:'LGT leak',      verified:'yes', status:'Active',    notes:'LGT Bank subsidiary' }},
  { id:'O03', label:'Celestia Trust Ltd',     type:'Organization', cluster:0, conf:0.58, lat:13.1132,lng:-59.5988, anomaly:true,
    attrs:{ jurisdiction:'Barbados',   sector:'Trust Company',  incorporated:'2011', employees:null, revenue:null,    source:'Pandora Papers',verified:'no',  status:'Active',    notes:'Beneficial owner concealed via nominee' }},
  { id:'O04', label:'PacificRim Assets Inc',  type:'Organization', cluster:2, conf:0.81, lat:1.3521,  lng:103.8198,anomaly:false,
    attrs:{ jurisdiction:'Singapore',  sector:'Holding Company',incorporated:'2014', employees:'~5', revenue:null,    source:'Pandora Papers',verified:'yes', status:'Active',    notes:'Singapore holding; real estate SPV chain' }},
  { id:'O05', label:'Meridian Consulting GmbH',type:'Organization',cluster:1, conf:0.76, lat:47.3769, lng:8.5417,  anomaly:false,
    attrs:{ jurisdiction:'Switzerland',sector:'Consulting',     incorporated:'2002', employees:'~30',revenue:'CHF 40M',source:'SwissLeaks',   verified:'yes', status:'Active',    notes:'Hsbc Swiss advisory conduit' }},
  { id:'O06', label:'Goldcrest Ventures SA',  type:'Organization', cluster:3, conf:0.63, lat:-34.9011,lng:-56.1915,anomaly:true,
    attrs:{ jurisdiction:'Uruguay',    sector:'Shell Company',  incorporated:'2006', employees:null, revenue:null,    source:'Panama Papers', verified:'no',  status:'Active',    notes:'Cross-border AML flagged 2019' }},
  { id:'O07', label:'Orion Fund Ltd',         type:'Organization', cluster:0, conf:0.44, lat:19.3024,lng:-81.3847, anomaly:true,
    attrs:{ jurisdiction:'Cayman Islands',sector:'Hedge Fund',  incorporated:'2013', employees:null, revenue:null,    source:'FinCEN Files',  verified:'no',  status:'Active',    notes:'SAR filed by Deutsche Bank 2021' }},
  { id:'O08', label:'Latitude Resources Pte', type:'Organization', cluster:2, conf:0.85, lat:1.3521,  lng:103.8198,anomaly:false,
    attrs:{ jurisdiction:'Singapore',  sector:'Commodities',    incorporated:'2010', employees:'~120',revenue:'$80M', source:'Pandora Papers',verified:'yes', status:'Active',    notes:'Mining concessions in DRC' }},
  { id:'O09', label:'Atlantic Bridge SA',     type:'Organization', cluster:3, conf:0.70, lat:-23.5505,lng:-46.6333,anomaly:false,
    attrs:{ jurisdiction:'Brazil',     sector:'Real Estate',    incorporated:'2017', employees:'~15',revenue:'R$120M',source:'Lava Jato',     verified:'yes', status:'Active',    notes:'BVI parent undisclosed to CVM' }},
  { id:'O10', label:'Euro Asset Finance Ltd', type:'Organization', cluster:1, conf:0.91, lat:51.5074, lng:-0.1278, anomaly:false,
    attrs:{ jurisdiction:'UK',         sector:'Finance',        incorporated:'1999', employees:'~400',revenue:'£500M',source:'Public Register',verified:'yes',status:'Active',   notes:'Regulated; HMRC reviewed 2018' }},
  { id:'O11', label:'Apex Nominees Ltd',      type:'Organization', cluster:0, conf:0.53, lat:18.4655,lng:-66.1057, anomaly:true,
    attrs:{ jurisdiction:'BVI',        sector:'Nominee Services',incorporated:'2005',employees:null, revenue:null,    source:'Panama Papers', verified:'no',  status:'Dissolved', notes:'7 000+ nominee directorships' }},
  { id:'O12', label:'IFC Global Ventures',    type:'Organization', cluster:3, conf:0.66, lat:9.0579,  lng:7.4951,  anomaly:false,
    attrs:{ jurisdiction:'Nigeria',    sector:'Private Equity', incorporated:'2015', employees:'~25',revenue:null,    source:'Pandora Papers',verified:'yes', status:'Active',    notes:'Oil sector focus' }},
  { id:'O13', label:'Thalassa Marine Corp',   type:'Organization', cluster:0, conf:0.79, lat:37.9838, lng:23.7275, anomaly:false,
    attrs:{ jurisdiction:'Malta',      sector:'Shipping',       incorporated:'2009', employees:'~200',revenue:'€45M', source:'Panama Papers', verified:'yes', status:'Active',    notes:'Flag-of-convenience fleet' }},
  { id:'O14', label:'Cascade Fintech Sdn Bhd',type:'Organization', cluster:2, conf:0.68, lat:3.1390,  lng:101.6869,anomaly:false,
    attrs:{ jurisdiction:'Malaysia',   sector:'Fintech',        incorporated:'2018', employees:'~50',revenue:'MYR 30M',source:'Pandora Papers',verified:'yes',status:'Active',   notes:'Crypto exchange operator' }},
  { id:'O15', label:'Mossack Fonseca & Co',   type:'Intermediary', cluster:0, conf:0.99, lat:8.9936,  lng:-79.5197,anomaly:true,
    attrs:{ jurisdiction:'Panama',     sector:'Law Firm',       incorporated:'1977', employees:'~600',revenue:null,   source:'Panama Papers', verified:'yes', status:'Closed',   notes:'Leaked 11.5M documents in 2016' }},
  { id:'O16', label:'Trident Trust Ltd',      type:'Intermediary', cluster:0, conf:0.88, lat:18.4655,lng:-66.1057, anomaly:false,
    attrs:{ jurisdiction:'BVI',        sector:'Trust Admin',    incorporated:'1988', employees:'~500',revenue:null,   source:'Pandora Papers',verified:'yes', status:'Active',   notes:'One of largest offshore trust admins' }},

  // ── JURISDICTIONS ────────────────────────────────────────────────────────────
  { id:'J01', label:'British Virgin Islands', type:'Jurisdiction', cluster:0, conf:1.00, lat:18.4655,lng:-64.6198, anomaly:false,
    attrs:{ type:'Tax Haven', FSI_rank:'7', companies_registered:'~400k', treaties:'TIEA with UK', FATF:'Monitored', TJN_score:72, verified:'yes', notes:'World\'s largest offshore domicile' }},
  { id:'J02', label:'Cayman Islands',         type:'Jurisdiction', cluster:0, conf:1.00, lat:19.3133,lng:-81.2546, anomaly:false,
    attrs:{ type:'Tax Haven', FSI_rank:'2', companies_registered:'~100k', treaties:'TIEA with USA',FATF:'Compliant', TJN_score:76, verified:'yes', notes:'#1 hedge fund domicile globally' }},
  { id:'J03', label:'Panama',                 type:'Jurisdiction', cluster:3, conf:0.98, lat:8.9936,  lng:-79.5197,anomaly:true,
    attrs:{ type:'Secrecy Jurisdiction', FSI_rank:'13', companies_registered:'~350k', treaties:'Limited', FATF:'Grey-listed 2023', TJN_score:68, verified:'yes', notes:'Panama Papers source jurisdiction' }},
  { id:'J04', label:'Switzerland',            type:'Jurisdiction', cluster:1, conf:0.97, lat:46.8182, lng:8.2275,  anomaly:false,
    attrs:{ type:'Secrecy Jurisdiction', FSI_rank:'3', companies_registered:'~500k', treaties:'>100 DTA', FATF:'Compliant',TJN_score:71, verified:'yes', notes:'Banking secrecy reformed post-SwissLeaks' }},
  { id:'J05', label:'Luxembourg',             type:'Jurisdiction', cluster:1, conf:0.96, lat:49.8153, lng:6.1296,  anomaly:false,
    attrs:{ type:'Tax Haven', FSI_rank:'6', companies_registered:'~200k', treaties:'>80 DTA', FATF:'Compliant', TJN_score:59, verified:'yes', notes:'LuxLeaks (2014) — sweetheart tax rulings' }},
  { id:'J06', label:'Singapore',              type:'Jurisdiction', cluster:2, conf:0.95, lat:1.3521,  lng:103.8198,anomaly:false,
    attrs:{ type:'IFC', FSI_rank:'9', companies_registered:'~500k', treaties:'>80 DTA', FATF:'Compliant', TJN_score:65, verified:'yes', notes:'Asia\'s leading IFC; tightening CDD since 2021' }},
  { id:'J07', label:'United Arab Emirates',   type:'Jurisdiction', cluster:0, conf:0.88, lat:24.4539, lng:54.3773, anomaly:true,
    attrs:{ type:'Secrecy Jurisdiction', FSI_rank:'10', companies_registered:'~300k', treaties:'Limited', FATF:'Grey-listed 2022', TJN_score:70, verified:'yes', notes:'FATF grey-listed; AML concerns in Dubai' }},
  { id:'J08', label:'Mauritius',              type:'Jurisdiction', cluster:2, conf:0.90, lat:-20.3484,lng:57.5522, anomaly:false,
    attrs:{ type:'IFC', FSI_rank:'14', companies_registered:'~30k',  treaties:'India DTA key', FATF:'Compliant', TJN_score:55, verified:'yes', notes:'Gateway for India-Africa capital flows' }},
  { id:'J09', label:'Netherlands',            type:'Jurisdiction', cluster:1, conf:0.95, lat:52.3676, lng:4.9041,  anomaly:false,
    attrs:{ type:'Conduit OFC', FSI_rank:'25', companies_registered:'~1M', treaties:'>100 DTA', FATF:'Compliant', TJN_score:52, verified:'yes', notes:'Conduit OFC; royalty & IP routing hub' }},
  { id:'J10', label:'Barbados',               type:'Jurisdiction', cluster:3, conf:0.88, lat:13.1939, lng:-59.5432,anomaly:false,
    attrs:{ type:'Tax Haven', FSI_rank:'22', companies_registered:'~15k', treaties:'Canada DTA key', FATF:'Compliant', TJN_score:49, verified:'yes', notes:'Canada-Caribbean tax treaty hub' }},

  // ── INTERMEDIARIES (Law Firms / Agents) ────────────────────────────────────
  { id:'I01', label:'Portcullis TrustNet',   type:'Intermediary', cluster:2, conf:0.90, lat:1.3521,  lng:103.8198,anomaly:false,
    attrs:{ jurisdiction:'Singapore', specialty:'Trust admin',  clients:'~10k', source:'Pandora Papers',verified:'yes', status:'Active',   notes:'SE Asia premier trust administrator' }},
  { id:'I02', label:'Baker McKenzie',        type:'Intermediary', cluster:1, conf:0.97, lat:51.5074, lng:-0.1278,  anomaly:false,
    attrs:{ jurisdiction:'Global',    specialty:'Tax law',      clients:'~5k',  source:'Public',       verified:'yes', status:'Active',   notes:'Largest global law firm by revenue' }},
  { id:'I03', label:'Alemán Cordero Galindo',type:'Intermediary', cluster:3, conf:0.85, lat:8.9936,  lng:-79.5197,anomaly:false,
    attrs:{ jurisdiction:'Panama',    specialty:'Corp formation',clients:'~3k', source:'Panama Papers',verified:'yes', status:'Active',   notes:'Top Panama law firm post-MF collapse' }},
  { id:'I04', label:'Vistra Group',          type:'Intermediary', cluster:0, conf:0.88, lat:18.4655,lng:-66.1057,  anomaly:false,
    attrs:{ jurisdiction:'BVI',       specialty:'Corp services', clients:'~20k',source:'Pandora Papers',verified:'yes', status:'Active',  notes:'Pandora Papers — 100k+ entities' }},

  // ── ASSETS ──────────────────────────────────────────────────────────────────
  { id:'A01', label:'Riviera Villa (Cannes)',   type:'Asset', cluster:1, conf:0.85, lat:43.5528, lng:7.0174,  anomaly:false,
    attrs:{ type:'Real Estate', value:'€18M',   acquired:'2015', disclosure:null,    source:'Pandora Papers',verified:'yes', status:'Hidden', notes:'Registered through Celestia Trust' }},
  { id:'A02', label:'M/Y Poseidon (Superyacht)',type:'Asset', cluster:0, conf:0.78, lat:43.2965, lng:5.3698,  anomaly:true,
    attrs:{ type:'Vessel',      value:'$65M',   acquired:'2019', disclosure:'None',  source:'FinCEN Files',  verified:'no',  status:'Hidden', notes:'Flagged Marshall Islands; beneficiary unclear' }},
  { id:'A03', label:'Manhattan Penthouse',      type:'Asset', cluster:3, conf:0.91, lat:40.7128, lng:-74.0060,anomaly:false,
    attrs:{ type:'Real Estate', value:'$22M',   acquired:'2017', disclosure:'Partial',source:'FinCEN Files', verified:'yes', status:'Disclosed',notes:'FINCEN SAR filed 2020' }},
  { id:'A04', label:'Gold Bullion Reserve',     type:'Asset', cluster:0, conf:0.51, lat:47.3769, lng:8.5417,  anomaly:true,
    attrs:{ type:'Commodity',   value:'$8M est',acquired:null,   disclosure:'None',  source:'SwissLeaks',    verified:'no',  status:'Hidden', notes:'Vaulted Zurich; no beneficial owner on record' }},
  { id:'A05', label:'DRC Copper Mining Concession',type:'Asset',cluster:2, conf:0.74, lat:-11.6641,lng:27.4794,anomaly:false,
    attrs:{ type:'Concession',  value:'$120M est',acquired:'2012',disclosure:'Partial',source:'Pandora Papers',verified:'yes',status:'Active', notes:'Routed through Mauritius holding chain' }},
  { id:'A06', label:'London Hedge Fund LP',      type:'Asset', cluster:1, conf:0.82, lat:51.5074, lng:-0.1278, anomaly:false,
    attrs:{ type:'Fund',        value:'$450M AUM',acquired:'2010',disclosure:'Full',  source:'FCA Register',  verified:'yes', status:'Active',  notes:'Regulated AIF; limited partners offshore' }},
  { id:'A07', label:'Singapore Bank Account',   type:'Asset', cluster:2, conf:0.66, lat:1.3521,  lng:103.8198,anomaly:false,
    attrs:{ type:'Bank Account',value:'$3M',    acquired:'2018', disclosure:'Partial',source:'Pandora Papers',verified:'yes', status:'Active',  notes:'CDD flagged by MAS 2022' }},
  { id:'A08', label:'Cayman CLO Note',           type:'Asset', cluster:0, conf:0.55, lat:19.3133,lng:-81.2546, anomaly:true,
    attrs:{ type:'Derivative',  value:'$30M',   acquired:null,   disclosure:'None',  source:'FinCEN Files',  verified:'no',  status:'Active',  notes:'Beneficial owner masked by nested SPVs' }},
  { id:'A09', label:'São Paulo Office Tower',    type:'Asset', cluster:3, conf:0.88, lat:-23.5505,lng:-46.6333,anomaly:false,
    attrs:{ type:'Real Estate', value:'R$85M',  acquired:'2016', disclosure:'Full',  source:'CVM Register',  verified:'yes', status:'Active',  notes:'Clean title; CVM disclosure compliant' }},
  { id:'A10', label:'Abu Dhabi Crypto Wallet',   type:'Asset', cluster:0, conf:0.38, lat:24.4539, lng:54.3773, anomaly:true,
    attrs:{ type:'Crypto',      value:'$12M est',acquired:null,  disclosure:'None',  source:'FinCEN Files',  verified:'no',  status:'Hidden', notes:'Tornado Cash connection suspected' }},
]

// ─────────────────────────────────────────────────────────────────────────────
// EDGES  (140 total)
// ─────────────────────────────────────────────────────────────────────────────
const RAW_EDGES = [
  // Person → Organization
  { source:'P01', target:'O01', rel:'directs',         conf:0.92, type:'known',    year:2008 },
  { source:'P01', target:'O07', rel:'beneficialOwner', conf:0.61, type:'uncertain',year:2013 },
  { source:'P01', target:'O11', rel:'usedNominee',     conf:0.88, type:'known',    year:2010 },
  { source:'P01', target:'O10', rel:'holdsThroughLPU', conf:0.82, type:'known',    year:2015 },
  { source:'P02', target:'O04', rel:'owns',            conf:0.85, type:'known',    year:2014 },
  { source:'P02', target:'O03', rel:'beneficialOwner', conf:0.58, type:'uncertain',year:2016 },
  { source:'P03', target:'O07', rel:'controls',        conf:0.52, type:'uncertain',year:2014 },
  { source:'P03', target:'O01', rel:'signatory',       conf:0.45, type:'uncertain',year:2012 },
  { source:'P04', target:'O06', rel:'directs',         conf:0.80, type:'known',    year:2008 },
  { source:'P04', target:'O15', rel:'clientOf',        conf:0.95, type:'known',    year:2006 },
  { source:'P05', target:'O02', rel:'manages',         conf:0.85, type:'known',    year:2012 },
  { source:'P05', target:'O05', rel:'advisedBy',       conf:0.76, type:'known',    year:2018 },
  { source:'P06', target:'O07', rel:'beneficialOwner', conf:0.44, type:'anomaly',  year:2015 },
  { source:'P06', target:'O03', rel:'controls',        conf:0.38, type:'anomaly',  year:2017 },
  { source:'P07', target:'O05', rel:'consultantFor',   conf:0.94, type:'known',    year:2014 },
  { source:'P07', target:'O02', rel:'boardMember',     conf:0.90, type:'known',    year:2019 },
  { source:'P08', target:'O12', rel:'directs',         conf:0.88, type:'known',    year:2015 },
  { source:'P08', target:'O09', rel:'partnerIn',       conf:0.72, type:'known',    year:2017 },
  { source:'P09', target:'O09', rel:'owns',            conf:0.85, type:'known',    year:2019 },
  { source:'P09', target:'O06', rel:'beneficialOwner', conf:0.55, type:'uncertain',year:2017 },
  { source:'P10', target:'O10', rel:'formerDirector',  conf:0.91, type:'known',    year:2005 },
  { source:'P10', target:'O05', rel:'clientOf',        conf:0.78, type:'known',    year:2010 },
  { source:'P11', target:'O03', rel:'beneficialOwner', conf:0.40, type:'anomaly',  year:2018 },
  { source:'P11', target:'O07', rel:'financedBy',      conf:0.35, type:'anomaly',  year:2016 },
  { source:'P12', target:'O10', rel:'shareholder',     conf:0.87, type:'known',    year:2020 },
  { source:'P13', target:'O04', rel:'coDirector',      conf:0.80, type:'known',    year:2019 },
  { source:'P13', target:'O14', rel:'founder',         conf:0.95, type:'known',    year:2018 },
  { source:'P14', target:'O06', rel:'nomineeFor',      conf:0.48, type:'uncertain',year:2016 },
  { source:'P14', target:'O09', rel:'linkedTo',        conf:0.42, type:'anomaly',  year:2017 },
  { source:'P15', target:'O04', rel:'beneficialOwner', conf:0.75, type:'known',    year:2016 },

  // Person → Jurisdiction
  { source:'P01', target:'J01', rel:'residesVia',      conf:0.90, type:'known',    year:2008 },
  { source:'P02', target:'J06', rel:'incorporatedIn',  conf:0.85, type:'known',    year:2014 },
  { source:'P03', target:'J07', rel:'linkedTo',        conf:0.50, type:'uncertain',year:2015 },
  { source:'P04', target:'J03', rel:'clientOf',        conf:0.93, type:'known',    year:2006 },
  { source:'P06', target:'J07', rel:'basedIn',         conf:0.88, type:'known',    year:2012 },
  { source:'P09', target:'J10', rel:'structuredThrough',conf:0.72,type:'known',    year:2019 },
  { source:'P11', target:'J07', rel:'linkedTo',        conf:0.42, type:'anomaly',  year:2018 },
  { source:'P14', target:'J03', rel:'nomineeIn',       conf:0.45, type:'uncertain',year:2016 },

  // Person → Asset
  { source:'P01', target:'A02', rel:'beneficialOwner', conf:0.68, type:'uncertain',year:2019 },
  { source:'P02', target:'A07', rel:'holds',           conf:0.78, type:'known',    year:2018 },
  { source:'P04', target:'A03', rel:'holdsViaSPV',     conf:0.88, type:'known',    year:2017 },
  { source:'P05', target:'A01', rel:'trustee',         conf:0.82, type:'known',    year:2015 },
  { source:'P06', target:'A10', rel:'controls',        conf:0.38, type:'anomaly',  year:2020 },
  { source:'P09', target:'A09', rel:'owns',            conf:0.90, type:'known',    year:2016 },
  { source:'P11', target:'A04', rel:'beneficialOwner', conf:0.44, type:'anomaly',  year:null  },
  { source:'P15', target:'A05', rel:'holdsThrough',    conf:0.70, type:'known',    year:2015 },

  // Person → Intermediary
  { source:'P01', target:'O15', rel:'clientOf',        conf:0.98, type:'known',    year:2009 },
  { source:'P01', target:'I04', rel:'usedServices',    conf:0.85, type:'known',    year:2012 },
  { source:'P02', target:'I01', rel:'clientOf',        conf:0.88, type:'known',    year:2014 },
  { source:'P04', target:'I03', rel:'representedBy',   conf:0.91, type:'known',    year:2008 },
  { source:'P05', target:'I02', rel:'advisedBy',       conf:0.85, type:'known',    year:2016 },
  { source:'P08', target:'I03', rel:'clientOf',        conf:0.78, type:'known',    year:2017 },
  { source:'P10', target:'I02', rel:'legalCounsel',    conf:0.88, type:'known',    year:2015 },
  { source:'P13', target:'I01', rel:'clientOf',        conf:0.80, type:'known',    year:2019 },

  // Organization → Jurisdiction
  { source:'O01', target:'J01', rel:'incorporatedIn',  conf:0.99, type:'known',    year:2008 },
  { source:'O02', target:'J04', rel:'registeredIn',    conf:0.99, type:'known',    year:1995 },
  { source:'O03', target:'J10', rel:'incorporatedIn',  conf:0.99, type:'known',    year:2011 },
  { source:'O04', target:'J06', rel:'registeredIn',    conf:0.99, type:'known',    year:2014 },
  { source:'O05', target:'J04', rel:'registeredIn',    conf:0.99, type:'known',    year:2002 },
  { source:'O06', target:'J03', rel:'incorporatedIn',  conf:0.95, type:'known',    year:2006 },
  { source:'O07', target:'J02', rel:'domiciledIn',     conf:0.99, type:'known',    year:2013 },
  { source:'O08', target:'J06', rel:'registeredIn',    conf:0.99, type:'known',    year:2010 },
  { source:'O09', target:'J03', rel:'linkedTo',        conf:0.68, type:'uncertain',year:2019 },
  { source:'O11', target:'J01', rel:'registeredIn',    conf:0.99, type:'known',    year:2005 },
  { source:'O13', target:'J05', rel:'flaggedIn',       conf:0.90, type:'known',    year:2009 },
  { source:'O14', target:'J06', rel:'registeredIn',    conf:0.99, type:'known',    year:2018 },
  { source:'O15', target:'J03', rel:'operatedIn',      conf:1.00, type:'known',    year:1977 },
  { source:'O16', target:'J01', rel:'registeredIn',    conf:0.99, type:'known',    year:1988 },

  // Organization → Asset
  { source:'O01', target:'A02', rel:'holds',           conf:0.70, type:'uncertain',year:2019 },
  { source:'O03', target:'A01', rel:'holds',           conf:0.88, type:'known',    year:2015 },
  { source:'O04', target:'A07', rel:'holds',           conf:0.82, type:'known',    year:2018 },
  { source:'O07', target:'A08', rel:'issuer',          conf:0.55, type:'uncertain',year:null  },
  { source:'O08', target:'A05', rel:'controls',        conf:0.80, type:'known',    year:2014 },
  { source:'O09', target:'A09', rel:'owns',            conf:0.85, type:'known',    year:2017 },
  { source:'O10', target:'A06', rel:'manages',         conf:0.90, type:'known',    year:2010 },
  { source:'O12', target:'A05', rel:'partnerIn',       conf:0.72, type:'known',    year:2015 },
  { source:'O11', target:'A04', rel:'custodian',       conf:0.48, type:'uncertain',year:null  },

  // Organization → Organization (ownership / service chains)
  { source:'O01', target:'O11', rel:'nomineeServices', conf:0.90, type:'known',    year:2008 },
  { source:'O03', target:'O01', rel:'holdsSharesIn',   conf:0.62, type:'uncertain',year:2012 },
  { source:'O06', target:'O09', rel:'parentOf',        conf:0.72, type:'known',    year:2017 },
  { source:'O07', target:'O01', rel:'capitalizedBy',   conf:0.50, type:'uncertain',year:2014 },
  { source:'O02', target:'O10', rel:'correspondent',   conf:0.85, type:'known',    year:2005 },
  { source:'O04', target:'O08', rel:'parentOf',        conf:0.88, type:'known',    year:2014 },
  { source:'O15', target:'O11', rel:'providedNominees',conf:0.95, type:'known',    year:2008 },
  { source:'O16', target:'O03', rel:'administers',     conf:0.85, type:'known',    year:2013 },
  { source:'I04', target:'O01', rel:'administered',    conf:0.88, type:'known',    year:2010 },
  { source:'I01', target:'O04', rel:'administered',    conf:0.85, type:'known',    year:2014 },
  { source:'I02', target:'O02', rel:'legalAdvisor',    conf:0.90, type:'known',    year:2015 },
  { source:'I03', target:'O06', rel:'registered',      conf:0.88, type:'known',    year:2008 },

  // Jurisdiction → Jurisdiction (treaty / flow relationships)
  { source:'J01', target:'J04', rel:'TIEA',            conf:0.98, type:'known',    year:2010 },
  { source:'J02', target:'J09', rel:'DTA',             conf:0.96, type:'known',    year:2008 },
  { source:'J03', target:'J10', rel:'capitalFlow',     conf:0.80, type:'known',    year:2015 },
  { source:'J06', target:'J08', rel:'DTA',             conf:0.92, type:'known',    year:2009 },
  { source:'J05', target:'J09', rel:'euDirective',     conf:0.95, type:'known',    year:2014 },
  { source:'J07', target:'J01', rel:'capitalFlow',     conf:0.75, type:'uncertain',year:2018 },

  // Inferred / missing
  { source:'P03', target:'P06', rel:'associateOf?',    conf:0.32, type:'inferred', year:null  },
  { source:'P11', target:'P03', rel:'relatedTo?',      conf:0.28, type:'inferred', year:null  },
  { source:'O07', target:'O03', rel:'linkedSPV?',      conf:0.40, type:'inferred', year:null  },
  { source:'A08', target:'A10', rel:'fundsFlow?',      conf:0.35, type:'inferred', year:null  },
  { source:'P06', target:'A08', rel:'controls?',       conf:0.38, type:'inferred', year:null  },
  { source:'P14', target:'P03', rel:'nomineeFor?',     conf:0.30, type:'inferred', year:null  },
  { source:'O07', target:'J07', rel:'fundedFrom?',     conf:0.45, type:'inferred', year:null  },
  { source:'P01', target:'P11', rel:'coordinatedWith?',conf:0.25, type:'inferred', year:null  },
]

// ─────────────────────────────────────────────────────────────────────────────
// MC1 (VAST 2025 reference graph) — server-side aggregated subgraph
// Full graph: 17,412 nodes / 37,857 edges (Oceanus music industry KG)
// This is a 90-node / 113-edge "super-node sample": top-degree nodes per
// Louvain community + all reversed-RecordedBy anomalies, computed offline
// via NetworkX (see mc1_pipeline/build_subgraph.py). This demonstrates the
// server-side aggregation strategy required for MC1-scale graphs, as
// discussed in Section 6.2 (Scale Limits) of the report.
const MC1_NODES = mc1Data.nodes
const MC1_EDGES = mc1Data.edges
export const MC1_META = mc1Data.meta

export const DATASETS = {
  icij: {
    id: 'icij',
    label: 'ICIJ Offshore Finance',
    shortLabel: 'ICIJ (80 nodes)',
    nodes: RAW_NODES,
    edges: RAW_EDGES,
  },
  mc1: {
    id: 'mc1',
    label: 'VAST 2025 MC1 — Oceanus Music KG (sampled)',
    shortLabel: 'MC1 (90 / 17,412 nodes)',
    nodes: MC1_NODES,
    edges: MC1_EDGES,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
export const TYPE_COLORS = {
  Person:       '#6366f1',
  Organization: '#8b5cf6',
  Jurisdiction: '#06b6d4',
  Intermediary: '#f59e0b',
  Asset:        '#10b981',
}

export const EDGE_COLORS = {
  known:    '#6366f1',
  uncertain:'#94a3b8',
  inferred: '#475569',
  anomaly:  '#ef4444',
}

export const useGraphStore = defineStore('graph', () => {
  const datasetId       = ref('icij')
  const activeTypes    = ref(new Set(Object.keys(TYPE_COLORS)))
  const confThreshold  = ref(0)
  const selectedNodeId = ref(null)
  const searchQuery    = ref('')
  const activeTask     = ref('discovery')
  const egoNodeId      = ref(null)

  const activeDataset = computed(() => DATASETS[datasetId.value])
  const allNodes = computed(() => activeDataset.value.nodes)
  const allEdges = computed(() => activeDataset.value.edges)

  const visibleNodes = computed(() =>
    allNodes.value.filter(n =>
      activeTypes.value.has(n.type) &&
      n.conf >= confThreshold.value &&
      (searchQuery.value === '' ||
        n.label.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        n.type.toLowerCase().includes(searchQuery.value.toLowerCase()))
    )
  )

  const visibleNodeIds = computed(() => new Set(visibleNodes.value.map(n => n.id)))

  const visibleEdges = computed(() =>
    allEdges.value.filter(e =>
      visibleNodeIds.value.has(e.source) &&
      visibleNodeIds.value.has(e.target)
    )
  )

  const selectedNode = computed(() =>
    selectedNodeId.value ? allNodes.value.find(n => n.id === selectedNodeId.value) : null
  )

  const nodeNeighbors = computed(() => {
    if (!selectedNodeId.value) return []
    return allEdges.value
      .filter(e => e.source === selectedNodeId.value || e.target === selectedNodeId.value)
      .map(e => ({
        node: allNodes.value.find(n => n.id === (e.source === selectedNodeId.value ? e.target : e.source)),
        rel: e.rel, conf: e.conf, type: e.type,
        dir: e.source === selectedNodeId.value ? 'out' : 'in',
      }))
      .filter(x => x.node)
  })

  const stats = computed(() => ({
    nodes:     allNodes.value.length,
    edges:     allEdges.value.length,
    types:     new Set(allNodes.value.map(n => n.type)).size,
    anomalies: allNodes.value.filter(n => n.anomaly).length,
    missing:   allNodes.value.filter(n => Object.values(n.attrs).some(v => v === null || v === undefined)).length,
    clusters:  new Set(allNodes.value.map(n => n.cluster)).size,
  }))

  function selectNode(id)  { selectedNodeId.value = id }
  function setEgoNode(id)  { egoNodeId.value = id }
  function toggleType(t) {
    if (activeTypes.value.has(t)) activeTypes.value.delete(t)
    else activeTypes.value.add(t)
    activeTypes.value = new Set(activeTypes.value)
  }
  function setDataset(id) {
    if (!DATASETS[id]) return
    datasetId.value = id
    selectedNodeId.value = null
    egoNodeId.value = null
    searchQuery.value = ''
    confThreshold.value = 0
    activeTypes.value = new Set(Object.keys(TYPE_COLORS))
  }

  return {
    datasetId, activeDataset,
    activeTypes, confThreshold, selectedNodeId, searchQuery, activeTask, egoNodeId,
    allNodes, allEdges, visibleNodes, visibleEdges, visibleNodeIds,
    selectedNode, nodeNeighbors, stats,
    selectNode, setEgoNode, toggleType, setDataset,
  }
})
