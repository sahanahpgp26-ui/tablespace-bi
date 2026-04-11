import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'tablespace.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

// Run schema
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT, company TEXT NOT NULL,
    contact_name TEXT, email TEXT, phone TEXT, city TEXT,
    seats_required INTEGER, budget_per_seat REAL,
    stage TEXT DEFAULT 'Prospecting', score INTEGER DEFAULT 50,
    source TEXT, status TEXT DEFAULT 'active', notes TEXT,
    expected_revenue REAL, close_date TEXT,
    account_type TEXT DEFAULT 'Growth', industry TEXT,
    assigned_to TEXT DEFAULT NULL, probability INTEGER DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT, lead_id INTEGER,
    type TEXT, subject TEXT, description TEXT, due_date TEXT,
    completed INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS competitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    cities_count INTEGER, total_sqft INTEGER, price_per_seat REAL,
    occupancy_est REAL, review_score REAL, trend TEXT,
    risk_level TEXT, notes TEXT, updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS pricing_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT, competitor_id INTEGER,
    city TEXT, price_per_seat REAL, recorded_at TEXT, source_method TEXT
  );
  CREATE TABLE IF NOT EXISTS centres (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    city TEXT, sqft INTEGER, total_seats INTEGER,
    occupied_seats INTEGER, available_seats INTEGER,
    non_usable_seats INTEGER, revenue_per_seat REAL,
    centre_type TEXT, status TEXT, lat REAL, lng REAL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS centre_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT, centre_id INTEGER,
    date TEXT, occupied_seats INTEGER, available_seats INTEGER,
    revenue REAL, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS geo_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT, city TEXT, zone_name TEXT,
    expansion_score REAL, nightlight_index REAL, search_growth REAL,
    enterprise_density REAL, competitor_count INTEGER,
    avg_price_per_seat REAL, infra_notes TEXT, recommendation TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS market_share_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT, company TEXT, city TEXT,
    share_pct REAL, quarter INTEGER, year INTEGER,
    source_note TEXT, created_at TEXT DEFAULT (datetime('now'))
  );
`);

function seedAll() {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number };
  if (count > 0) { console.log('DB already seeded.'); return; }
  seedEmployees();
  seedLeads();
  seedActivities();
  seedCompetitors();
  seedPricingHistory();
  seedCentres();
  seedCentreSnapshots();
  seedGeoZones();
  seedMarketShareHistory();
  console.log('✅ Seed complete.');
}

function seedEmployees() {
  const employees = [
    { name: 'Rohan Kapoor',    role: 'Senior Account Executive', email: 'rohan@tablespace.in',    city: 'Bangalore', target: 85000000, color: '#f97316' },
    { name: 'Priya Menon',     role: 'Account Executive',        email: 'priya@tablespace.in',     city: 'Mumbai',    target: 72000000, color: '#38bdf8' },
    { name: 'Aditya Sharma',   role: 'Senior Account Executive', email: 'aditya@tablespace.in',    city: 'Gurugram',  target: 78000000, color: '#34d399' },
    { name: 'Kavya Nair',      role: 'Sales Development Rep',    email: 'kavya@tablespace.in',     city: 'Hyderabad', target: 45000000, color: '#a78bfa' },
    { name: 'Siddharth Rao',   role: 'Account Executive',        email: 'siddharth@tablespace.in', city: 'Pune',      target: 55000000, color: '#fbbf24' },
    { name: 'Divya Iyer',      role: 'Enterprise Account Exec',  email: 'divya@tablespace.in',     city: 'Chennai',   target: 95000000, color: '#f43f5e' },
  ];
  // ensure table exists for standalone seed script
  db.exec(`CREATE TABLE IF NOT EXISTS employees (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, role TEXT, email TEXT, city TEXT, target_revenue REAL DEFAULT 0, avatar_color TEXT DEFAULT '#f97316', created_at TEXT DEFAULT (datetime('now')))`);
  const insert = db.prepare('INSERT INTO employees (name,role,email,city,target_revenue,avatar_color) VALUES (?,?,?,?,?,?)');
  db.exec('BEGIN');
  employees.forEach(e => insert.run(e.name, e.role, e.email, e.city, e.target, e.color));
  db.exec('COMMIT');
  console.log('  → 6 employees');
}

function seedLeads() {
  const stages = ['Prospecting','Qualification','Needs Analysis','Value Proposition','Id. Decision Makers','Perception Analysis','Proposal/Price Quote','Negotiation/Review','Closed Won','Closed Lost'];
  const sources = ['Inbound Web','Cold Outreach','Referral','LinkedIn','Event','Broker','Phone Inquiry'];
  const industries = ['Technology','BFSI','Consulting','E-Commerce','Healthcare','Media','Manufacturing','Legal'];
  const accountTypes = ['Enterprise','Growth','SME'];

  const companies = [
    { company:'Infosys BPM', contact:'Rohan Mehta', email:'rohan@infosysbpm.com', city:'Bangalore', seats:120, budget:9500 },
    { company:'HDFC Ergo', contact:'Priya Nair', email:'priya@hdfcergo.com', city:'Mumbai', seats:85, budget:12000 },
    { company:'Deloitte India', contact:'Arjun Sharma', email:'arjun@deloitte.in', city:'Gurugram', seats:200, budget:11000 },
    { company:'Swiggy', contact:'Kavya Reddy', email:'kavya@swiggy.in', city:'Bangalore', seats:60, budget:8500 },
    { company:'Apollo Hospitals', contact:'Dr. Vikram Rao', email:'vikram@apollo.com', city:'Hyderabad', seats:40, budget:7500 },
    { company:'Razorpay', contact:'Ankit Bansal', email:'ankit@razorpay.com', city:'Bangalore', seats:75, budget:9000 },
    { company:'EY India', contact:'Sunita Kapoor', email:'sunita@ey.com', city:'Mumbai', seats:150, budget:13000 },
    { company:'Flipkart', contact:'Ravi Kumar', email:'ravi@flipkart.com', city:'Bangalore', seats:100, budget:8000 },
    { company:'Persistent Systems', contact:'Neha Joshi', email:'neha@persistent.com', city:'Pune', seats:55, budget:7000 },
    { company:'MakeMyTrip', contact:'Aditya Gupta', email:'aditya@makemytrip.com', city:'Gurugram', seats:45, budget:9800 },
    { company:'Tata Consultancy', contact:'Suresh Patel', email:'suresh@tcs.com', city:'Chennai', seats:250, budget:8500 },
    { company:'Ola Electric', contact:'Meera Singh', email:'meera@olaelectric.com', city:'Bangalore', seats:80, budget:8200 },
    { company:'Zepto', contact:'Harish Iyer', email:'harish@zepto.in', city:'Mumbai', seats:35, budget:11500 },
    { company:'PolicyBazaar', contact:'Sanya Malhotra', email:'sanya@policybazaar.com', city:'Gurugram', seats:90, budget:9200 },
    { company:"Byju's", contact:'Kiran Rao', email:'kiran@byjus.com', city:'Bangalore', seats:130, budget:7800 },
    { company:'ICICI Lombard', contact:'Deepak Verma', email:'deepak@icicilombard.com', city:'Mumbai', seats:70, budget:12500 },
    { company:'Accenture India', contact:'Pooja Sharma', email:'pooja@accenture.com', city:'Hyderabad', seats:180, budget:10500 },
    { company:'Urban Company', contact:'Nikhil Sethi', email:'nikhil@urbancompany.com', city:'Gurugram', seats:50, budget:8800 },
    { company:'Nykaa', contact:'Ritika Bose', email:'ritika@nykaa.com', city:'Mumbai', seats:65, budget:11200 },
    { company:'Freshworks', contact:'Siddharth Narayanan', email:'sid@freshworks.com', city:'Chennai', seats:95, budget:7600 },
    { company:'Zomato', contact:'Anjali Rastogi', email:'anjali@zomato.com', city:'Gurugram', seats:110, budget:9600 },
    { company:'CRED', contact:'Mohit Agarwal', email:'mohit@cred.club', city:'Bangalore', seats:70, budget:10200 },
    { company:'Slice', contact:'Tanvi Bhatt', email:'tanvi@sliceit.com', city:'Bangalore', seats:30, budget:9400 },
    { company:'Lenskart', contact:'Vikas Taneja', email:'vikas@lenskart.com', city:'Gurugram', seats:55, budget:9100 },
    { company:'Dream11', contact:'Rahul Desai', email:'rahul@dream11.com', city:'Mumbai', seats:80, budget:13500 },
    { company:'Vedantu', contact:'Nisha Agarwal', email:'nisha@vedantu.com', city:'Bangalore', seats:45, budget:7200 },
    { company:'Meesho', contact:'Sameer Khan', email:'sameer@meesho.com', city:'Bangalore', seats:90, budget:8600 },
    { company:'PhonePe', contact:'Divya Chandrasekhar', email:'divya@phonepe.com', city:'Bangalore', seats:120, budget:9800 },
    { company:'Paytm', contact:'Anil Bhardwaj', email:'anil@paytm.com', city:'Gurugram', seats:160, budget:9000 },
    { company:'Delhivery', contact:'Ashish Mathur', email:'ashish@delhivery.com', city:'Gurugram', seats:75, budget:8400 },
    { company:'Cars24', contact:'Preet Kaur', email:'preet@cars24.com', city:'Gurugram', seats:60, budget:9200 },
    { company:'Myntra', contact:'Arun Pillai', email:'arun@myntra.com', city:'Bangalore', seats:100, budget:8900 },
    { company:'ShareChat', contact:'Varsha Mishra', email:'varsha@sharechat.com', city:'Bangalore', seats:55, budget:8100 },
    { company:'Unacademy', contact:'Gaurav Tripathi', email:'gaurav@unacademy.com', city:'Bangalore', seats:70, budget:7900 },
    { company:'Spinny', contact:'Preethi Subramaniam', email:'preethi@spinny.com', city:'Gurugram', seats:35, budget:9500 },
    { company:'Moglix', contact:'Sandeep Vij', email:'sandeep@moglix.com', city:'Gurugram', seats:50, budget:8700 },
    { company:'Groww', contact:'Shruti Bhattacharya', email:'shruti@groww.in', city:'Bangalore', seats:85, budget:10100 },
    { company:'Perfios', contact:'Raghu Natarajan', email:'raghu@perfios.com', city:'Bangalore', seats:40, budget:9300 },
    { company:'Mphasis', contact:'Vinita Jain', email:'vinita@mphasis.com', city:'Pune', seats:65, budget:7800 },
    { company:'Cyient', contact:'Manoj Reddy', email:'manoj@cyient.com', city:'Hyderabad', seats:90, budget:7200 },
    { company:'Hexaware', contact:'Kavitha Menon', email:'kavitha@hexaware.com', city:'Chennai', seats:110, budget:7600 },
    { company:'Nagarro', contact:'Tarun Khanna', email:'tarun@nagarro.com', city:'Gurugram', seats:75, budget:9800 },
    { company:'Zensar', contact:'Rutuja Deshmukh', email:'rutuja@zensar.com', city:'Pune', seats:80, budget:7400 },
    { company:'ITC Infotech', contact:'Bhaskar Rao', email:'bhaskar@itcinfotech.com', city:'Bangalore', seats:140, budget:8800 },
    { company:'Saxo Bank India', contact:'Dilip Suri', email:'dilip@saxo.com', city:'Mumbai', seats:55, budget:13000 },
    { company:'Societe Generale', contact:'Faisal Ahmed', email:'faisal@sgcib.com', city:'Bangalore', seats:95, budget:11500 },
    { company:'Deutsche Bank India', contact:'Natasha Puri', email:'natasha@db.com', city:'Mumbai', seats:130, budget:14000 },
    { company:'Colliers India', contact:'Rohit Sinha', email:'rohit@colliers.com', city:'Gurugram', seats:45, budget:12000 },
    { company:'JLL India', contact:'Shreyans Agarwal', email:'shreyans@jll.com', city:'Mumbai', seats:60, budget:13500 },
    { company:'Capgemini India', contact:'Malvika Sharma', email:'malvika@capgemini.com', city:'Pune', seats:200, budget:8200 },
  ];

  const STAGE_PROBS: Record<string,number> = {
    'Prospecting':10,'Qualification':20,'Needs Analysis':25,'Value Proposition':35,
    'Id. Decision Makers':40,'Perception Analysis':50,'Proposal/Price Quote':65,
    'Negotiation/Review':80,'Closed Won':100,'Closed Lost':0
  };
  const employeeNames = ['Rohan Kapoor','Priya Menon','Aditya Sharma','Kavya Nair','Siddharth Rao','Divya Iyer'];
  // city → preferred employee
  const cityOwner: Record<string,string> = {
    'Bangalore':'Rohan Kapoor','Mumbai':'Priya Menon','Gurugram':'Aditya Sharma',
    'Hyderabad':'Kavya Nair','Pune':'Siddharth Rao','Chennai':'Divya Iyer',
  };

  const insert = db.prepare(`INSERT INTO leads (company, contact_name, email, phone, city, seats_required, budget_per_seat, stage, score, source, status, notes, expected_revenue, close_date, account_type, industry, assigned_to, probability, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  db.exec('BEGIN');
  companies.forEach((c, i) => {
    const stage = stages[i % stages.length];
    const score = 30 + Math.floor(Math.random() * 65);
    const source = sources[i % sources.length];
    const status = stage === 'Closed Won' ? 'won' : stage === 'Closed Lost' ? 'lost' : 'active';
    const expectedRevenue = c.seats * c.budget * 12;
    const closeDate = new Date(Date.now() + (-30 + i * 7) * 86400000).toISOString().split('T')[0];
    const createdAt = new Date(Date.now() - (90 - i * 1.8) * 86400000).toISOString();
    const accountType = accountTypes[Math.floor(c.seats / 70)] || 'SME';
    const industry = industries[i % industries.length];
    const phone = `+91 98${String(10000000 + i * 1234567).slice(0,8)}`;
    const notes = ['Follow up after product demo','Decision maker meeting next week','Waiting for IT approval','Price negotiation final round','Strong NPS referral deal','Evaluating 3 providers'][i % 6];
    const assignedTo = cityOwner[c.city] || employeeNames[i % employeeNames.length];
    const probability = STAGE_PROBS[stage] ?? 10;
    insert.run(c.company, c.contact, c.email, phone, c.city, c.seats, c.budget, stage, score, source, status, notes, expectedRevenue, closeDate, accountType, industry, assignedTo, probability, createdAt, createdAt);
  });
  db.exec('COMMIT');
  console.log(`  → ${companies.length} leads`);
}

function seedActivities() {
  const types = ['Call','Email','Meeting','Demo','Site Visit'];
  const insert = db.prepare('INSERT INTO activities (lead_id,type,subject,description,due_date,completed,created_at) VALUES (?,?,?,?,?,?,?)');
  const leads = db.prepare('SELECT id FROM leads LIMIT 30').all() as {id:number}[];
  db.exec('BEGIN');
  leads.forEach((l,i) => {
    const type = types[i%types.length];
    const due = new Date(Date.now()+(i%7-3)*86400000).toISOString().split('T')[0];
    insert.run(l.id, type, `${type} with prospect`, `Scheduled ${type.toLowerCase()}`, due, i%3===0?1:0, new Date().toISOString());
  });
  db.exec('COMMIT');
  console.log('  → activities');
}

function seedCompetitors() {
  const data = [
    ['WeWork India',8,2200000,12500,78,4.1,'stable','High','Aggressive expansion post-restructuring; heavy brand presence in CBDs'],
    ['Awfis',14,1800000,7800,82,4.3,'growing','High','Fastest growing domestic; IPO-listed; targeting Tier-2 cities'],
    ['IndiQube',6,1400000,8500,85,4.4,'growing','Medium','Enterprise focus; strong in Bangalore tech corridors; pre-IPO'],
    ['Smartworks',9,1100000,9200,80,4.2,'stable','Medium','Premium positioning; backed by Keppel; strong in NCR and Mumbai'],
    ['Cowrks',5,650000,11000,74,3.9,'declining','Low','RMZ backed; repositioning after expansion slowdown'],
    ['Skootr',4,420000,8800,76,4.0,'stable','Low','NCR and Bangalore focus; strong IT park presence; B2B heavy'],
  ];
  const insert = db.prepare('INSERT INTO competitors (name,cities_count,total_sqft,price_per_seat,occupancy_est,review_score,trend,risk_level,notes) VALUES (?,?,?,?,?,?,?,?,?)');
  db.exec('BEGIN');
  data.forEach(r => insert.run(...r));
  db.exec('COMMIT');
  console.log('  → 6 competitors');
}

function seedPricingHistory() {
  const cities = ['Bangalore','Mumbai','Gurugram','Hyderabad','Pune','Chennai'];
  const competitors = db.prepare('SELECT id,name,price_per_seat FROM competitors').all() as {id:number;name:string;price_per_seat:number}[];
  const quarters = [{recorded_at:'2025-03-31'},{recorded_at:'2025-06-30'},{recorded_at:'2025-09-30'},{recorded_at:'2025-12-31'}];
  const cityMult: Record<string,number> = {Mumbai:1.35,Gurugram:1.1,Bangalore:1.0,Hyderabad:0.88,Chennai:0.85,Pune:0.82};
  const tsBase: Record<string,number> = {Bangalore:9200,Mumbai:12500,Gurugram:10100,Hyderabad:8100,Pune:7800,Chennai:7600};
  const methods = ['Mystery shopping calls','Broker intel + published pricing','Direct inquiry + JLL report','LinkedIn + website published'];
  const insert = db.prepare('INSERT INTO pricing_history (competitor_id,city,price_per_seat,recorded_at,source_method) VALUES (?,?,?,?,?)');
  db.exec('BEGIN');
  quarters.forEach((q,qi) => {
    cities.forEach(city => {
      const mult = cityMult[city]||1;
      insert.run(0, city, tsBase[city]+qi*200+Math.floor(Math.random()*300), q.recorded_at, 'Internal revenue data');
      competitors.forEach((comp,ci) => {
        const price = Math.round((comp.price_per_seat*mult+(Math.random()-0.5)*1500+qi*(comp.name==='Awfis'?150:comp.name==='Cowrks'?-100:50))/100)*100;
        insert.run(comp.id, city, Math.max(5000,price), q.recorded_at, methods[ci%methods.length]);
      });
    });
  });
  db.exec('COMMIT');
  console.log('  → pricing history');
}

function seedCentres() {
  const data = [
    ['Whitefield Prime','Bangalore',45000,420,368,18,9200,'IT Park','active',12.9698,77.7499],
    ['Koramangala Hub','Bangalore',32000,290,215,12,9800,'CBD','active',12.9352,77.6244],
    ['HSR Layout Centre','Bangalore',28000,260,226,10,9400,'Premium','active',12.9116,77.6474],
    ['Manyata Tech Park','Bangalore',62000,580,497,22,8800,'IT Park','active',13.0437,77.6055],
    ['Electronic City','Bangalore',38000,355,241,14,8200,'IT Park','active',12.8399,77.6770],
    ['Indiranagar Suite','Bangalore',18000,160,148,6,10500,'Premium','active',12.9784,77.6408],
    ['Sarjapur Road','Bangalore',25000,230,155,9,8600,'Emerging','active',12.9010,77.6850],
    ['MG Road Tower','Bangalore',20000,185,167,7,11200,'CBD','active',12.9759,77.6080],
    ['BKC Premium','Mumbai',55000,480,418,20,14500,'CBD','active',19.0596,72.8656],
    ['Lower Parel Hub','Mumbai',40000,365,297,15,13200,'Premium','active',18.9968,72.8296],
    ['Andheri East','Mumbai',35000,320,268,13,11800,'IT Park','active',19.1136,72.8697],
    ['Powai Innovation','Mumbai',42000,385,310,16,12100,'IT Park','active',19.1176,72.9060],
    ['Navi Mumbai Centre','Mumbai',30000,275,178,11,9800,'Emerging','active',19.0330,73.0297],
    ['Cyber City Tower','Gurugram',48000,440,382,18,11500,'CBD','active',28.4949,77.0890],
    ['Golf Course Road','Gurugram',36000,330,268,13,10800,'Premium','active',28.4276,77.1025],
    ['Sohna Road Hub','Gurugram',28000,255,179,10,9600,'Emerging','active',28.4126,77.0348],
    ['Udyog Vihar','Gurugram',32000,295,251,12,10200,'IT Park','active',28.5041,77.0869],
    ['HITEC City Prime','Hyderabad',50000,465,372,19,8800,'IT Park','active',17.4435,78.3772],
    ['Gachibowli Centre','Hyderabad',38000,350,252,14,8200,'IT Park','active',17.4400,78.3489],
    ['Financial District','Hyderabad',29000,268,208,11,8600,'CBD','active',17.4156,78.3541],
    ['Hinjewadi Phase 1','Pune',42000,390,312,16,7800,'IT Park','active',18.5915,73.7380],
    ['Kalyani Nagar','Pune',25000,228,165,9,8100,'Premium','active',18.5462,73.9063],
    ['Viman Nagar Hub','Pune',20000,185,122,8,7600,'Emerging','active',18.5679,73.9143],
    ['OMR IT Corridor','Chennai',44000,408,326,17,7600,'IT Park','active',12.9165,80.2284],
    ['Guindy Business Park','Chennai',32000,295,221,12,7900,'CBD','active',13.0067,80.2206],
  ];
  const insert = db.prepare('INSERT INTO centres (name,city,sqft,total_seats,occupied_seats,available_seats,non_usable_seats,revenue_per_seat,centre_type,status,lat,lng) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  db.exec('BEGIN');
  data.forEach(r => {
    const [name,city,sqft,total,occ,nonU,rev,type,status,lat,lng] = r;
    const avail = (total as number) - (occ as number) - (nonU as number);
    insert.run(name,city,sqft,total,occ,avail,nonU,rev,type,status,lat,lng);
  });
  db.exec('COMMIT');
  console.log('  → 25 centres');
}

function seedCentreSnapshots() {
  const centres = db.prepare('SELECT id,total_seats,occupied_seats,revenue_per_seat FROM centres').all() as {id:number;total_seats:number;occupied_seats:number;revenue_per_seat:number}[];
  const insert = db.prepare('INSERT INTO centre_snapshots (centre_id,date,occupied_seats,available_seats,revenue) VALUES (?,?,?,?,?)');
  db.exec('BEGIN');
  centres.forEach(c => {
    for (let day=89;day>=0;day--) {
      const d = new Date(Date.now()-day*86400000).toISOString().split('T')[0];
      const noise = (Math.random()-0.5)*8;
      const occ = Math.min(c.total_seats, Math.max(Math.floor(c.total_seats*0.4), Math.round(c.occupied_seats*(1+noise/100))));
      const avail = c.total_seats-occ;
      const rev = occ*c.revenue_per_seat*(1+(Math.random()-0.5)*0.05);
      insert.run(c.id, d, occ, avail, Math.round(rev));
    }
  });
  db.exec('COMMIT');
  console.log('  → snapshots (90d × 25 centres)');
}

function seedGeoZones() {
  const data = [
    ['Pune','Hinjewadi Phase 3',91,82,94,88,4,8200,'Expressway connectivity, 3 IT SEZs, metro line announced 2026','Expand'],
    ['Hyderabad','Kokapet-Nanakramguda',87,78,91,85,3,9100,'New financial district extension, luxury residential, ring road','Expand'],
    ['Bangalore','Sarjapur-Bellandur',84,76,88,82,6,9800,'Tech corridor expansion, metro Phase 3 planned, dense residential','Expand'],
    ['Chennai','Perungudi-Sholinganallur',78,70,82,74,5,8100,'OMR extension, TIDEL Park II under construction, strong IT base','Expand'],
    ['Mumbai','Thane-Wagle Estate',74,72,76,68,7,10500,'Metro line 4 operational, affordable vs BKC, growing SME density','Watch'],
    ['Gurugram','Manesar-IMT',71,65,73,63,3,8800,'Industrial to commercial transition, EV corridor, 3 yrs to maturity','Watch'],
    ['Bangalore','Tumkur Road-Peenya',67,61,69,58,2,7200,'Manufacturing pivot to mixed-use, early signals only, below par infra','Monitor'],
    ['Hyderabad','Kompally-Medchal',64,58,71,56,2,7600,'Pharma cluster expansion, outer ring road, 18 month horizon','Watch'],
    ['Pune','Hadapsar-Fursungi',62,59,65,55,4,7400,'Wanowrie overspill zone, residential-led growth, limited anchor demand','Monitor'],
    ['Chennai','Ambattur Industrial Estate',57,52,58,48,1,6800,'Legacy industrial land repurposing, early-stage, no premium demand yet','Monitor'],
    ['Mumbai','Bhiwandi-Kalyan Corridor',45,42,49,38,1,6200,'Logistics dominant, limited white-collar demand, 3+ years out','Skip'],
    ['Gurugram','Faridabad-Ballabhgarh',41,38,43,34,0,5800,'Residential dormitory, minimal corporate demand, poor connectivity','Skip'],
  ];
  const insert = db.prepare('INSERT INTO geo_zones (city,zone_name,expansion_score,nightlight_index,search_growth,enterprise_density,competitor_count,avg_price_per_seat,infra_notes,recommendation) VALUES (?,?,?,?,?,?,?,?,?,?)');
  db.exec('BEGIN');
  data.forEach(r => insert.run(...r));
  db.exec('COMMIT');
  console.log('  → 12 geo zones');
}

function seedMarketShareHistory() {
  const companies = ['TableSpace','WeWork India','Awfis','IndiQube','Smartworks','Cowrks','Skootr'];
  const cities = ['Bangalore','Mumbai','Gurugram','Hyderabad','Pune','Chennai'];
  const base: Record<string,number[]> = {
    'TableSpace':  [18,20,22,21,23,24,25,26],
    'WeWork India':[28,27,26,25,23,22,21,20],
    'Awfis':       [14,15,16,17,18,19,20,21],
    'IndiQube':    [12,12,13,14,14,14,14,13],
    'Smartworks':  [10,10,10, 9, 9, 9, 8, 8],
    'Cowrks':      [10, 9, 7, 7, 6, 6, 6, 6],
    'Skootr':      [ 8, 7, 6, 7, 7, 6, 6, 6],
  };
  const quarters = [{q:1,y:2024},{q:2,y:2024},{q:3,y:2024},{q:4,y:2024},{q:1,y:2025},{q:2,y:2025},{q:3,y:2025},{q:4,y:2025}];
  const sources = ['JLL India Flex Space Report','Colliers India + internal proxy','Knight Frank India','CBRE India Flex Report'];
  const insert = db.prepare('INSERT INTO market_share_history (company,city,share_pct,quarter,year,source_note) VALUES (?,?,?,?,?,?)');
  db.exec('BEGIN');
  quarters.forEach(({q,y},qi) => {
    cities.forEach(city => {
      companies.forEach(comp => {
        const share = Math.max(1, +(base[comp][qi]+(Math.random()-0.5)*2).toFixed(1));
        insert.run(comp, city, share, q, y, sources[qi%sources.length]);
      });
    });
  });
  db.exec('COMMIT');
  console.log('  → market share history');
}

seedAll();
