// ============================================================
// MOCK DATA — BenefitPath Voice AI Dashboard
// All data is interconnected and consistent.
// Timestamps are relative to early March 2026.
// ============================================================

export interface Agent {
  id: string;
  name: string;
  title: string;
  status: "active" | "draft";
  industry: string;
  calls: number;
  successRate: number;
  lastModified: string;
  voiceId: string;
  voiceName: string;
}

export const agents: Agent[] = [
  { id: "agt_001", name: "Sarah", title: "Benefits Specialist", status: "active", industry: "Insurance", calls: 4892, successRate: 73.2, lastModified: "2026-02-28", voiceId: "aria", voiceName: "Aria" },
  { id: "agt_002", name: "James", title: "Enrollment Coordinator", status: "active", industry: "Benefits", calls: 2341, successRate: 67.8, lastModified: "2026-02-25", voiceId: "marcus", voiceName: "Marcus" },
  { id: "agt_003", name: "Maria", title: "HR Outreach", status: "draft", industry: "HR", calls: 0, successRate: 0, lastModified: "2026-03-01", voiceId: "elena", voiceName: "Elena" },
];

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  company: string;
  tags: string[];
  dncStatus: boolean;
  lastCalled: string | null;
  outcome: string | null;
}

export const contacts: Contact[] = [
  { id: "ct_001", firstName: "John", lastName: "Martinez", phone: "(555) 123-4567", email: "john.martinez@email.com", company: "Acme Corp", tags: ["enrollment"], dncStatus: false, lastCalled: "2026-03-02", outcome: "Connected" },
  { id: "ct_002", firstName: "Lisa", lastName: "Chen", phone: "(555) 234-5678", email: "lisa.chen@techstart.io", company: "TechStart Inc", tags: ["renewal"], dncStatus: false, lastCalled: "2026-03-01", outcome: "Voicemail" },
  { id: "ct_003", firstName: "Robert", lastName: "Williams", phone: "(555) 345-6789", email: "rwilliams@healthcare.org", company: "HealthCare Partners", tags: ["new-hire"], dncStatus: false, lastCalled: "2026-02-28", outcome: "Connected" },
  { id: "ct_004", firstName: "Amanda", lastName: "Johnson", phone: "(555) 456-7890", email: "amanda.j@globalhr.com", company: "Global HR Solutions", tags: ["enrollment", "renewal"], dncStatus: false, lastCalled: "2026-03-02", outcome: "No Answer" },
  { id: "ct_005", firstName: "David", lastName: "Kim", phone: "(555) 567-8901", email: "dkim@innovate.co", company: "Innovate LLC", tags: ["medicare"], dncStatus: false, lastCalled: "2026-02-27", outcome: "Connected" },
  { id: "ct_006", firstName: "Sarah", lastName: "Thompson", phone: "(555) 678-9012", email: "sthompson@brights.com", company: "Bright Solutions", tags: ["enrollment"], dncStatus: true, lastCalled: "2026-02-20", outcome: "Not Interested" },
  { id: "ct_007", firstName: "Michael", lastName: "Davis", phone: "(555) 789-0123", email: "mdavis@premier.net", company: "Premier Benefits", tags: ["new-hire"], dncStatus: false, lastCalled: "2026-03-01", outcome: "Transferred" },
  { id: "ct_008", firstName: "Jennifer", lastName: "Garcia", phone: "(555) 890-1234", email: "jgarcia@atlas.com", company: "Atlas Group", tags: ["renewal"], dncStatus: false, lastCalled: "2026-03-02", outcome: "Callback" },
  { id: "ct_009", firstName: "Christopher", lastName: "Brown", phone: "(555) 901-2345", email: "cbrown@midwest.org", company: "Midwest Insurance", tags: ["enrollment"], dncStatus: false, lastCalled: "2026-02-26", outcome: "Connected" },
  { id: "ct_010", firstName: "Emily", lastName: "Wilson", phone: "(555) 012-3456", email: "ewilson@sunrise.com", company: "Sunrise Benefits", tags: ["medicare"], dncStatus: false, lastCalled: null, outcome: null },
  { id: "ct_011", firstName: "James", lastName: "Taylor", phone: "(555) 111-2233", email: "jtaylor@pinnacle.io", company: "Pinnacle Corp", tags: ["enrollment"], dncStatus: false, lastCalled: "2026-03-02", outcome: "Connected" },
  { id: "ct_012", firstName: "Patricia", lastName: "Anderson", phone: "(555) 222-3344", email: "panderson@valley.com", company: "Valley Health", tags: ["renewal"], dncStatus: false, lastCalled: "2026-02-28", outcome: "Voicemail" },
  { id: "ct_013", firstName: "Daniel", lastName: "Thomas", phone: "(555) 333-4455", email: "dthomas@peak.co", company: "Peak Performance", tags: ["new-hire"], dncStatus: false, lastCalled: "2026-03-01", outcome: "No Answer" },
  { id: "ct_014", firstName: "Maria", lastName: "Rodriguez", phone: "(555) 444-5566", email: "mrodriguez@care.org", company: "CareBridge", tags: ["enrollment", "medicare"], dncStatus: false, lastCalled: "2026-02-25", outcome: "Connected" },
  { id: "ct_015", firstName: "Kevin", lastName: "Lee", phone: "(555) 555-6677", email: "klee@unity.com", company: "Unity Benefits", tags: ["renewal"], dncStatus: false, lastCalled: "2026-03-02", outcome: "Transferred" },
  { id: "ct_016", firstName: "Susan", lastName: "White", phone: "(555) 666-7788", email: "swhite@horizon.net", company: "Horizon Group", tags: ["enrollment"], dncStatus: false, lastCalled: "2026-02-27", outcome: "Connected" },
  { id: "ct_017", firstName: "Brian", lastName: "Harris", phone: "(555) 777-8899", email: "bharris@core.co", company: "Core Benefits", tags: ["new-hire"], dncStatus: false, lastCalled: "2026-03-01", outcome: "Voicemail" },
  { id: "ct_018", firstName: "Nancy", lastName: "Clark", phone: "(555) 888-9900", email: "nclark@nexus.com", company: "Nexus Insurance", tags: ["medicare"], dncStatus: false, lastCalled: "2026-02-24", outcome: "Connected" },
  { id: "ct_019", firstName: "Steven", lastName: "Lewis", phone: "(555) 999-0011", email: "slewis@apex.io", company: "Apex Solutions", tags: ["enrollment"], dncStatus: false, lastCalled: null, outcome: null },
  { id: "ct_020", firstName: "Karen", lastName: "Walker", phone: "(555) 100-2030", email: "kwalker@bridge.com", company: "Bridge Benefits", tags: ["renewal"], dncStatus: false, lastCalled: "2026-03-02", outcome: "No Answer" },
];

export type CallOutcome = "Connected" | "Voicemail" | "No Answer" | "Transferred" | "Callback" | "Failed";
export type Sentiment = "positive" | "neutral" | "negative";

export interface Call {
  id: string;
  contactId: string;
  contactName: string;
  phone: string;
  campaignId: string;
  campaignName: string;
  agentId: string;
  agentName: string;
  dateTime: string;
  duration: number; // seconds
  outcome: CallOutcome;
  sentiment: Sentiment;
}

function generateCalls(): Call[] {
  const outcomes: { outcome: CallOutcome; weight: number }[] = [
    { outcome: "Connected", weight: 42 },
    { outcome: "Voicemail", weight: 24 },
    { outcome: "No Answer", weight: 18 },
    { outcome: "Transferred", weight: 9 },
    { outcome: "Callback", weight: 5 },
    { outcome: "Failed", weight: 2 },
  ];
  const sentiments: Sentiment[] = ["positive", "neutral", "negative"];
  const campaignMap = [
    { id: "cmp_001", name: "Q1 Open Enrollment Outreach" },
    { id: "cmp_002", name: "Benefits Renewal Follow-Up" },
    { id: "cmp_003", name: "New Employee Welcome Calls" },
    { id: "cmp_005", name: "Year-End Policy Review" },
  ];
  const agentList = [
    { id: "agt_001", name: "Sarah" },
    { id: "agt_002", name: "James" },
  ];

  const calls: Call[] = [];
  for (let i = 0; i < 50; i++) {
    const contact = contacts[i % contacts.length];
    const campaign = campaignMap[i % campaignMap.length];
    const agent = agentList[i % agentList.length];
    const rand = Math.random() * 100;
    let cumulative = 0;
    let outcome: CallOutcome = "Connected";
    for (const o of outcomes) {
      cumulative += o.weight;
      if (rand <= cumulative) { outcome = o.outcome; break; }
    }
    const daysAgo = Math.floor(i / 7);
    const hour = 9 + (i % 9);
    const date = new Date(2026, 2, 5 - daysAgo, hour, (i * 7) % 60);
    const duration = outcome === "Failed" ? 5 + Math.floor(Math.random() * 10) :
                     outcome === "No Answer" ? 15 + Math.floor(Math.random() * 20) :
                     outcome === "Voicemail" ? 30 + Math.floor(Math.random() * 45) :
                     60 + Math.floor(Math.random() * 420);
    const sentiment: Sentiment = outcome === "Connected" ? (Math.random() > 0.3 ? "positive" : "neutral") :
                                  outcome === "Failed" ? "negative" : sentiments[Math.floor(Math.random() * 3)];
    calls.push({
      id: `call_${String(i + 1).padStart(3, "0")}`,
      contactId: contact.id,
      contactName: `${contact.firstName} ${contact.lastName}`,
      phone: contact.phone,
      campaignId: campaign.id,
      campaignName: campaign.name,
      agentId: agent.id,
      agentName: agent.name,
      dateTime: date.toISOString(),
      duration,
      outcome,
      sentiment,
    });
  }
  return calls.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
}

export const calls = generateCalls();

export interface Campaign {
  id: string;
  name: string;
  agentId: string;
  agentName: string;
  status: "Active" | "Paused" | "Draft" | "Completed" | "Scheduled";
  contactsCalled: number;
  contactsTotal: number;
  connected: number;
  appointments: number;
  conversionRate: number;
  startDate: string;
}

export const campaigns: Campaign[] = [
  { id: "cmp_001", name: "Q1 Open Enrollment Outreach", agentId: "agt_001", agentName: "Sarah", status: "Active", contactsCalled: 342, contactsTotal: 1200, connected: 234, appointments: 48, conversionRate: 14.0, startDate: "2026-01-15" },
  { id: "cmp_002", name: "Benefits Renewal Follow-Up", agentId: "agt_002", agentName: "James", status: "Active", contactsCalled: 128, contactsTotal: 500, connected: 89, appointments: 12, conversionRate: 9.4, startDate: "2026-02-01" },
  { id: "cmp_003", name: "New Employee Welcome Calls", agentId: "agt_001", agentName: "Sarah", status: "Paused", contactsCalled: 67, contactsTotal: 200, connected: 45, appointments: 8, conversionRate: 11.9, startDate: "2026-01-20" },
  { id: "cmp_004", name: "Medicare Supplement Outreach", agentId: "agt_003", agentName: "Maria", status: "Draft", contactsCalled: 0, contactsTotal: 850, connected: 0, appointments: 0, conversionRate: 0, startDate: "" },
  { id: "cmp_005", name: "Year-End Policy Review", agentId: "agt_002", agentName: "James", status: "Completed", contactsCalled: 750, contactsTotal: 750, connected: 512, appointments: 89, conversionRate: 11.9, startDate: "2025-12-01" },
  { id: "cmp_006", name: "Spring Benefits Check-In", agentId: "agt_001", agentName: "Sarah", status: "Scheduled", contactsCalled: 0, contactsTotal: 1500, connected: 0, appointments: 0, conversionRate: 0, startDate: "2026-03-01" },
];

export interface ContactList {
  id: string;
  name: string;
  count: number;
  validCount: number;
  created: string;
  lastUsed: string | null;
  lastUsedCampaign: string | null;
  source: "CSV Upload" | "CRM Sync" | "Manual";
}

export const contactLists: ContactList[] = [
  { id: "cl_001", name: "Q1 Enrollment Leads", count: 1200, validCount: 1186, created: "2026-01-10", lastUsed: "2026-02-28", lastUsedCampaign: "Q1 Open Enrollment Outreach", source: "CSV Upload" },
  { id: "cl_002", name: "Renewal Contacts 2026", count: 500, validCount: 498, created: "2026-01-28", lastUsed: "2026-02-15", lastUsedCampaign: "Benefits Renewal Follow-Up", source: "CSV Upload" },
  { id: "cl_003", name: "New Employees Jan-Feb", count: 200, validCount: 200, created: "2026-02-05", lastUsed: "2026-02-10", lastUsedCampaign: "New Employee Welcome Calls", source: "CRM Sync" },
  { id: "cl_004", name: "Medicare Eligible Clients", count: 850, validCount: 843, created: "2026-02-12", lastUsed: null, lastUsedCampaign: null, source: "CSV Upload" },
];

export interface PhoneNumber {
  id: string;
  number: string;
  friendlyName: string;
  areaCode: string;
  type: "Local" | "Toll-Free";
  status: "Active" | "Pending" | "Failed Verification";
  assignedTo: string | null;
  monthlyCost: string;
  cnamRegistered: boolean;
  spamScore: "clean" | "some-flags" | "flagged";
  stirShaken: "Full Attestation" | "Partial" | "Not Registered";
}

export const phoneNumbers: PhoneNumber[] = [
  { id: "pn_001", number: "(555) 234-5678", friendlyName: "Main Benefits Line", areaCode: "555", type: "Local", status: "Active", assignedTo: "Sarah", monthlyCost: "$1.50/mo", cnamRegistered: true, spamScore: "clean", stirShaken: "Full Attestation" },
  { id: "pn_002", number: "(555) 234-5679", friendlyName: "Enrollment Hotline", areaCode: "555", type: "Local", status: "Active", assignedTo: "James", monthlyCost: "$1.50/mo", cnamRegistered: true, spamScore: "clean", stirShaken: "Full Attestation" },
  { id: "pn_003", number: "(800) 555-0199", friendlyName: "Toll-Free Line", areaCode: "800", type: "Toll-Free", status: "Active", assignedTo: null, monthlyCost: "$3.00/mo", cnamRegistered: false, spamScore: "some-flags", stirShaken: "Partial" },
  { id: "pn_004", number: "(555) 987-6543", friendlyName: "New Number", areaCode: "555", type: "Local", status: "Pending", assignedTo: null, monthlyCost: "$1.50/mo", cnamRegistered: false, spamScore: "clean", stirShaken: "Not Registered" },
];

// Chart data generators
export function generateCallVolumeData(days: number) {
  const data = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date(2026, 2, 5 - i);
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const base = isWeekend ? 120 : 380;
    const trend = (days - i) * 3;
    const noise = Math.floor(Math.random() * 80) - 40;
    const tueThu = (dow >= 2 && dow <= 4) ? 50 : 0;
    data.push({
      date: d.toISOString().slice(0, 10),
      calls: Math.max(50, base + trend + noise + tueThu),
    });
  }
  return data;
}

export const callOutcomeData = [
  { name: "Connected & Completed", value: 42, color: "#10B981" },
  { name: "Voicemail Left", value: 24, color: "#3B82F6" },
  { name: "No Answer", value: 18, color: "#F59E0B" },
  { name: "Transferred to Agent", value: 9, color: "#8B5CF6" },
  { name: "Callback Requested", value: 5, color: "#EC4899" },
  { name: "Failed/Error", value: 2, color: "#EF4444" },
];

export const voiceOptions = [
  { id: "aria", name: "Aria", gender: "Female", accent: "American — Warm & Professional" },
  { id: "marcus", name: "Marcus", gender: "Male", accent: "American — Confident & Clear" },
  { id: "elena", name: "Elena", gender: "Female", accent: "British — Polished" },
  { id: "devon", name: "Devon", gender: "Male", accent: "American — Friendly & Casual" },
  { id: "nina", name: "Nina", gender: "Female", accent: "American — Empathetic & Caring" },
  { id: "carter", name: "Carter", gender: "Male", accent: "American — Authoritative" },
  { id: "priya", name: "Priya", gender: "Female", accent: "American — Energetic & Upbeat" },
  { id: "jackson", name: "Jackson", gender: "Male", accent: "Southern — Warm & Trustworthy" },
];

export const sampleTranscript = [
  { speaker: "agent", text: "Hi, this is Sarah from Benefits First Insurance Group. I'm calling about your upcoming benefits enrollment period. Is this a good time to chat for a couple of minutes?", time: "0:00" },
  { speaker: "caller", text: "Um, yeah, I guess so. Who did you say you were with?", time: "0:08" },
  { speaker: "agent", text: "I'm with Benefits First Insurance Group. We're reaching out to employees at Acme Corp to help make sure everyone has the information they need before open enrollment closes on December 15th.", time: "0:12" },
  { speaker: "caller", text: "Oh okay, yeah. I got an email about that but honestly haven't really looked at it yet.", time: "0:24" },
  { speaker: "agent", text: "That's totally understandable — there's a lot of information to go through! That's actually why I'm calling. I'd love to help you understand your options. Are you currently enrolled in the health plan through your employer?", time: "0:30" },
  { speaker: "caller", text: "Yeah, I've had the basic plan for about two years now. It's been fine, I guess.", time: "0:42" },
  { speaker: "agent", text: "Great! And are there any specific areas where you feel like you might want better coverage? For example, dental, vision, or maybe life insurance?", time: "0:48" },
  { speaker: "caller", text: "Well, actually, my wife and I just had a baby, so I'm thinking we probably need to update things. Maybe add dental and vision for the family?", time: "0:56" },
  { speaker: "agent", text: "Congratulations on the new addition! That's wonderful. And yes, this is actually the perfect time to review your options. Adding a dependent is a qualifying life event, so you have some great flexibility right now.", time: "1:08" },
  { speaker: "caller", text: "Oh, I didn't know that. So I can change my plan now even though it's not technically open enrollment yet?", time: "1:20" },
  { speaker: "agent", text: "Absolutely! With a qualifying life event like a new baby, you typically have 30 days to make changes. I'd love to set up a quick 15-minute call with one of our benefits advisors who can walk you through the specific plans and costs. Would that be helpful?", time: "1:26" },
  { speaker: "caller", text: "Yeah, that would actually be great. I've been meaning to do this but keep putting it off.", time: "1:42" },
  { speaker: "agent", text: "I totally get it — life gets busy, especially with a newborn! How about we schedule something for later this week? Do you have any availability on Thursday or Friday afternoon?", time: "1:48" },
  { speaker: "caller", text: "Thursday works. Maybe around 2 PM?", time: "2:00" },
  { speaker: "agent", text: "Perfect! I've got you down for Thursday, February 12th at 2:00 PM. And can I confirm your email address? We'll send you a calendar invite and some plan comparison materials ahead of time.", time: "2:04" },
  { speaker: "caller", text: "Sure, it's john.martinez@email.com.", time: "2:16" },
  { speaker: "agent", text: "Got it! And just to confirm, that's John Martinez at Acme Corp, correct?", time: "2:20" },
  { speaker: "caller", text: "Yep, that's me.", time: "2:26" },
  { speaker: "agent", text: "Wonderful! Thank you so much for your time, John. We'll send you a confirmation email shortly with all the details. If you have any questions before Thursday, don't hesitate to reach out. Congratulations again on the baby, and have a wonderful day!", time: "2:28" },
  { speaker: "caller", text: "Thanks, Sarah. Have a good one!", time: "2:44" },
];

export function generateHeatmapData() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 12 }, (_, i) => `${i + 8}:00`);
  const data: { day: string; hour: string; value: number }[] = [];
  days.forEach((day, di) => {
    hours.forEach((hour, hi) => {
      const isWeekend = di >= 5;
      const isPrime = !isWeekend && (di >= 1 && di <= 3) && ((hi >= 2 && hi <= 4) || (hi >= 6 && hi <= 8));
      const base = isWeekend ? 15 : 45;
      const bonus = isPrime ? 30 : 0;
      data.push({ day, hour, value: base + bonus + Math.floor(Math.random() * 20) });
    });
  });
  return data;
}
