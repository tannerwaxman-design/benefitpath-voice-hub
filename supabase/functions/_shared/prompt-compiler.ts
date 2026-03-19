// ============================================================
// SYSTEM PROMPT COMPILER
// Takes agent config + tenant info and compiles the full
// system prompt that VAPI's LLM will use during calls.
//
// THIS IS THE COMPETITIVE MOAT. The quality of this prompt
// directly determines how good the AI agent sounds on calls.
// ============================================================

function getEnrollmentPromptContext(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear();

  // AEP: Oct 15 - Dec 7
  if ((month === 10 && day >= 15) || month === 11 || (month === 12 && day <= 7)) {
    const dec7 = new Date(year, 11, 7);
    const daysLeft = Math.max(0, Math.ceil((dec7.getTime() - now.getTime()) / 86400000));
    return `## CURRENT ENROLLMENT PERIOD: Annual Enrollment Period (AEP)
You are calling during the most important time of year for Medicare enrollment. AEP runs from October 15 to December 7.

KEY BEHAVIORS:
- Lead with urgency: "The annual enrollment window is open right now and closes on December 7th."
- Emphasize that plan options change every year.
- If someone says "I'll think about it," remind them of the deadline.

DAYS REMAINING: ${daysLeft} days left in the enrollment window.`;
  }

  // OEP: Jan 1 - Mar 31
  if (month >= 1 && month <= 3) {
    const mar31 = new Date(year, 2, 31);
    const daysLeft = Math.max(0, Math.ceil((mar31.getTime() - now.getTime()) / 86400000));
    return `## CURRENT ENROLLMENT PERIOD: Open Enrollment Period (OEP)
OEP runs from January 1 to March 31. People already in a Medicare Advantage plan can switch or drop to Original Medicare.

KEY BEHAVIORS:
- Lower urgency than AEP but still time-limited.
- OEP only allows ONE change.

DAYS REMAINING: ${daysLeft} days left in OEP.`;
  }

  // No general enrollment: Apr 1 - Oct 14 or Dec 8-31
  const oct15Target = month === 12 ? new Date(year + 1, 9, 15) : new Date(year, 9, 15);
  const daysUntilAEP = Math.max(0, Math.ceil((oct15Target.getTime() - now.getTime()) / 86400000));

  let prompt = `## CURRENT ENROLLMENT PERIOD: None (Special Enrollment Periods only)
No general enrollment period right now. Screen for SEP triggers: turning 65, moving, losing coverage, etc.

DAYS UNTIL AEP: ${daysUntilAEP} days until AEP opens.`;

  if (month >= 8 && month <= 9) {
    prompt += `\n\nPRE-AEP SEASON: Shift messaging to AEP prep and pre-book consultations for October 15th.`;
  }

  return prompt;
}

interface AgentConfig {
  agent_name: string;
  agent_title: string | null;
  company_name_override: string | null;
  tone: string;
  enthusiasm_level: number;
  filler_words_enabled: boolean;
  call_objective: string;
  conversation_stages: Array<{
    name: string;
    script: string;
    questions: string[];
    order: number;
  }>;
  objection_handling: Array<{
    objection: string;
    response: string;
  }>;
  knowledge_base_text: string | null;
  faq_pairs: Array<{
    question: string;
    answer: string;
  }>;
  transfer_enabled: boolean;
  transfer_triggers: string[];
  transfer_announcement: string | null;
  closing_script: string | null;
  voicemail_enabled: boolean;
  voicemail_script: string | null;
  require_verbal_consent: boolean;
  consent_script_override: string | null;
  recording_enabled_override: boolean | null;
  recording_disclosure_override: string | null;
  primary_cta: string;
  fallback_cta: string | null;
  soa_enabled?: boolean;
  soa_script?: string | null;
  soa_plan_types?: string[];
  soa_timing?: string;
}

interface TenantConfig {
  company_name: string;
  industry: string;
  recording_disclosure_enabled: boolean;
  recording_disclosure_text: string | null;
  require_consent: boolean;
  consent_script: string | null;
}

function formatObjective(objective: string): string {
  const objectives: Record<string, string> = {
    appointment_setting:
      "Schedule an appointment or consultation with a benefits advisor. Get a confirmed date, time, and email address.",
    lead_qualification:
      "Determine if the contact is a qualified lead. Assess their current situation, needs, timeline, and decision-making authority.",
    enrollment_followup:
      "Follow up on benefits enrollment. Confirm they received materials, answer questions, and help them complete enrollment if needed.",
    policy_renewal:
      "Remind the contact about their upcoming policy renewal. Review current coverage and discuss any changes or upgrades.",
    survey:
      "Conduct a brief satisfaction survey. Ask the prepared questions, record responses, and thank them for their time.",
    payment_reminder:
      "Remind the contact about an upcoming or overdue payment. Provide payment options and offer to help resolve any issues.",
    general_info:
      "Provide general information about the company's services. Answer questions and offer to connect them with a specialist if needed.",
    custom: "Follow the custom conversation flow defined below.",
  };
  return objectives[objective] || objectives.custom;
}

function formatCTA(cta: string): string {
  const ctas: Record<string, string> = {
    book_appointment: "offer to schedule an appointment at a convenient time",
    confirm_enrollment: "help them complete their enrollment",
    collect_info: "collect their contact information for follow-up",
    transfer: "transfer them to a live specialist",
    send_email: "offer to send detailed information via email",
    custom: "follow the custom fallback instructions",
  };
  return ctas[cta] || ctas.custom;
}

export function compileSystemPrompt(
  agent: AgentConfig,
  tenant: TenantConfig
): string {
  const companyName = agent.company_name_override || tenant.company_name;
  const sections: string[] = [];

  // === IDENTITY ===
  let identity = `You are ${agent.agent_name}`;
  if (agent.agent_title) identity += `, a ${agent.agent_title}`;
  identity += ` at ${companyName}.`;
  identity += ` You are making outbound phone calls on behalf of ${companyName}.`;
  sections.push(identity);

  // === PERSONALITY & STYLE ===
  let personality = "## YOUR PERSONALITY AND COMMUNICATION STYLE\n";
  personality += `Your tone is ${agent.tone}. `;

  if (agent.tone === "professional") {
    personality +=
      "Speak clearly, confidently, and respectfully. Maintain a business-appropriate demeanor throughout.\n";
  } else if (agent.tone === "friendly") {
    personality +=
      "Be warm, approachable, and personable. Use the caller's first name. Make them feel comfortable.\n";
  } else if (agent.tone === "conversational") {
    personality +=
      "Speak naturally, like you're chatting with a neighbor. Keep it relaxed but purposeful.\n";
  } else if (agent.tone === "empathetic") {
    personality +=
      "Be gentle, understanding, and patient. Acknowledge emotions. Listen actively and validate concerns.\n";
  }

  if (agent.enthusiasm_level <= 3) {
    personality +=
      "Keep your energy calm and measured. Don't be overly excited.\n";
  } else if (agent.enthusiasm_level <= 6) {
    personality +=
      "Maintain a balanced, pleasant energy level. Be engaged but not pushy.\n";
  } else {
    personality +=
      "Be upbeat and energetic. Show genuine enthusiasm about helping them.\n";
  }

  if (agent.filler_words_enabled) {
    personality +=
      'Use occasional natural filler words to sound more human (like "um", "let me think", "well", "you know"). Don\'t overdo it — just enough to sound natural, not scripted.\n';
  } else {
    personality +=
      "Speak clearly and directly without filler words. Be crisp and articulate.\n";
  }

  personality += "\nIMPORTANT NATURALNESS RULES:\n";
  personality +=
    "- Never say you are an AI, robot, or virtual assistant. You are a real person calling from the company.\n";
  personality +=
    "- If asked 'Are you a robot?', say something like 'Ha, no, I'm a real person calling from " +
    companyName +
    ". How can I help you today?'\n";
  personality +=
    "- Use contractions (I'm, you're, we'll, that's) to sound natural.\n";
  personality +=
    "- Vary your sentence length. Mix short and long sentences.\n";
  personality +=
    "- React naturally to what the caller says. If they make a joke, acknowledge it briefly.\n";
  personality +=
    "- If you don't know something, say 'That's a great question, let me make a note of that and have one of our specialists follow up with you on that specifically.'\n";

  sections.push(personality);

  // === OBJECTIVE ===
  let objective = "## YOUR OBJECTIVE FOR THIS CALL\n";
  objective += formatObjective(agent.call_objective) + "\n";
  objective += `\nIf the primary objective cannot be achieved, your fallback is to ${formatCTA(agent.fallback_cta || "send_email")}.\n`;
  objective +=
    "\nALWAYS be working toward the objective, but never be pushy. Guide the conversation naturally.\n";
  sections.push(objective);

  // === CONVERSATION FLOW ===
  if (agent.conversation_stages && agent.conversation_stages.length > 0) {
    let flow = "## CONVERSATION FLOW\n";
    flow +=
      "Follow these stages in order, but be flexible. If the caller takes the conversation in a different direction, adapt naturally and return to the flow when appropriate.\n";

    const sortedStages = [...agent.conversation_stages].sort(
      (a, b) => a.order - b.order
    );

    for (const stage of sortedStages) {
      flow += `\n### Stage: ${stage.name}\n`;
      flow += `${stage.script}\n`;

      if (stage.questions && stage.questions.length > 0) {
        flow += "Questions to ask during this stage:\n";
        for (const q of stage.questions) {
          flow += `- ${q}\n`;
        }
        flow +=
          "Ask these questions naturally within the conversation. Don't read them like a checklist.\n";
      }
    }

    sections.push(flow);
  }

  // === OBJECTION HANDLING ===
  if (agent.objection_handling && agent.objection_handling.length > 0) {
    let objections = "## HANDLING OBJECTIONS\n";
    objections +=
      "When the caller pushes back, don't argue. Acknowledge their concern, then respond:\n";

    for (const obj of agent.objection_handling) {
      objections += `\nWhen they say something like "${obj.objection}":\n`;
      objections += `→ ${obj.response}\n`;
    }

    objections +=
      "\nFor any objection not listed above: Acknowledge it sincerely, briefly restate the value you're offering, and ask if there's anything specific you can address. If they're firm, respect it and move to the fallback CTA.\n";

    sections.push(objections);
  }

  // === KNOWLEDGE BASE ===
  if (agent.knowledge_base_text) {
    let kb = "## COMPANY KNOWLEDGE BASE\n";
    kb +=
      "Use this information to answer questions accurately. Do NOT make up information that isn't here. If you don't have the answer, offer to have a specialist follow up.\n\n";
    kb += agent.knowledge_base_text + "\n";
    sections.push(kb);
  }

  // === FAQs ===
  if (agent.faq_pairs && agent.faq_pairs.length > 0) {
    let faqs = "## FREQUENTLY ASKED QUESTIONS\n";
    faqs +=
      "If the caller asks any of these questions, use these answers:\n\n";

    for (const faq of agent.faq_pairs) {
      faqs += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
    }

    sections.push(faqs);
  }

  // === TRANSFER RULES ===
  if (agent.transfer_enabled) {
    let transfer = "## WHEN TO TRANSFER TO A LIVE AGENT\n";
    transfer +=
      "Transfer the call to a live person when ANY of these happen:\n";

    const triggerDescriptions: Record<string, string> = {
      human_requested:
        "The caller explicitly asks to speak with a real person or a human",
      high_intent:
        "The caller shows strong buying signals (wants to sign up, enroll, or purchase right now)",
      frustrated:
        "The caller sounds frustrated, angry, or upset (raise in voice, repeated complaints, profanity)",
      unanswered_questions:
        "You cannot answer their question after two attempts and they seem unsatisfied",
      competitor_mention:
        "The caller mentions a competitor by name and is comparing options",
      sensitive_topic:
        "The caller brings up sensitive medical details, legal concerns, or financial hardship",
    };

    for (const trigger of agent.transfer_triggers) {
      const desc = triggerDescriptions[trigger] || trigger;
      transfer += `- ${desc}\n`;
    }

    if (agent.transfer_announcement) {
      transfer += `\nBefore transferring, say: "${agent.transfer_announcement}"\n`;
    }

    transfer +=
      "\nDuring the transfer, stay on the line briefly and introduce the caller to the live agent with a quick summary of the conversation.\n";

    sections.push(transfer);
  }

  // === COMPLIANCE (ALWAYS INCLUDED) ===
  let compliance = "## COMPLIANCE RULES — ALWAYS FOLLOW THESE\n";
  compliance +=
    "These rules are NON-NEGOTIABLE. Violating them could result in legal issues.\n\n";

  if (
    agent.recording_enabled_override !== false &&
    tenant.recording_disclosure_enabled
  ) {
    const disclosureText =
      agent.recording_disclosure_override || tenant.recording_disclosure_text;
    if (disclosureText) {
      compliance += `If anyone asks about call recording, say: "${disclosureText}"\n\n`;
    }
  }

  if (agent.require_verbal_consent) {
    const consentText =
      agent.consent_script_override || tenant.consent_script;
    if (consentText) {
      compliance += `Before proceeding with the main conversation, get verbal consent: "${consentText}"\n`;
      compliance +=
        "If they do NOT give consent, thank them for their time and end the call politely.\n\n";
    }
  }

  compliance += "DO NOT CALL COMPLIANCE:\n";
  compliance +=
    '- If the caller says ANYTHING like "stop calling", "do not call", "take me off your list", "remove my number", "don\'t call again", or similar → IMMEDIATELY comply.\n';
  compliance += `- Say: "I completely understand, and I apologize for any inconvenience. I'm removing your number from our call list right now. You will not receive any more calls from us. Have a great day."\n`;
  compliance +=
    "- Then end the call. No further persuasion. No exceptions.\n\n";

  compliance += "OTHER COMPLIANCE RULES:\n";
  compliance +=
    "- NEVER provide medical, legal, or financial advice. You can share general information but always recommend they speak with a qualified professional.\n";
  compliance +=
    "- NEVER make guarantees about coverage, pricing, eligibility, or outcomes.\n";
  compliance +=
    "- NEVER pressure someone into a decision. If they need time to think, respect that.\n";
  compliance += `- ALWAYS identify yourself honestly as calling from ${companyName}.\n`;
  compliance +=
    "- If asked who you work for, be transparent and honest.\n";
  compliance +=
    "- Do NOT collect Social Security numbers, credit card numbers, or bank account numbers on the call.\n";

  sections.push(compliance);

  // === SOA (SCOPE OF APPOINTMENT) — MEDICARE COMPLIANCE ===
  if (agent.soa_enabled) {
    let soa = "## CMS SCOPE OF APPOINTMENT COMPLIANCE\n";
    soa += "You MUST collect verbal Scope of Appointment consent BEFORE discussing any specific Medicare plan types, carrier names, premiums, or benefits.\n\n";

    // Determine timing instruction
    if (agent.soa_timing === "after_greeting") {
      soa += "After your greeting and confirming the caller's identity, say the SOA script EXACTLY as written. Do not paraphrase it. The wording matters for compliance.\n\n";
    } else if (agent.soa_timing === "end_of_call") {
      soa += "Before booking any appointment or concluding the call, collect SOA consent using the script below.\n\n";
    } else if (agent.soa_timing === "on_interest") {
      soa += "If the lead expresses interest in specific plans, collect SOA consent using the script below BEFORE discussing any plan details.\n\n";
    }

    // Insert the script with plan types filled in
    const planTypesStr = (agent.soa_plan_types || []).join(", ");
    const filledScript = (agent.soa_script || "").replace("[SELECTED_PLAN_TYPES]", planTypesStr);
    soa += `SOA SCRIPT (say this EXACTLY):\n"${filledScript}"\n\n`;

    soa += "Wait for a clear verbal response:\n";
    soa += '- If they say "yes," "sure," "go ahead," "that\'s fine," or any affirmative:\n';
    soa += '  Record the consent and proceed. Say: "Thank you. Let\'s take a look at what\'s available for you."\n';
    soa += '- If they say "no," "I\'m not sure," or hesitate:\n';
    soa += '  Do NOT proceed with plan-specific discussion. Say: "No problem at all. I completely understand. What I can do is send you some general information about your options, and if you\'d like to go over the details later, we can set up a time that works for you. Would you like me to send that to your email?"\n';
    soa += '- If they ask "What does that mean?" or seem confused:\n';
    soa += '  Explain: "It just means I\'m letting you know this is a conversation about Medicare insurance, and I need your okay before I go into specific plan details. It\'s a federal requirement to make sure you\'re comfortable with what we discuss."\n\n';

    soa += "CRITICAL: If SOA consent is NOT given, you must NOT:\n";
    soa += "- Name any specific carrier (Aetna, UnitedHealthcare, Humana, etc.)\n";
    soa += "- Quote any premium amounts\n";
    soa += "- Compare specific plan benefits\n";
    soa += "- Discuss specific drug formularies\n";
    soa += "- Recommend any particular plan\n\n";

    soa += "You CAN still discuss:\n";
    soa += "- General Medicare information (what Part A, B, C, D cover)\n";
    soa += "- The enrollment timeline\n";
    soa += "- The process of how a consultation works\n";
    soa += "- General categories of plans without naming carriers\n";

    sections.push(soa);
  }

  // === REAL-TIME LEAD ASSESSMENT ===
  let leadAssessment = "## REAL-TIME LEAD ASSESSMENT\n";
  leadAssessment += "As the conversation progresses, continuously assess the lead's interest level and adjust your approach:\n\n";
  leadAssessment += "HIGH INTEREST SIGNALS (adjust to be more direct, push for appointment):\n";
  leadAssessment += "- Asks specific questions about plans, pricing, or coverage\n";
  leadAssessment += "- Mentions upcoming enrollment or life changes\n";
  leadAssessment += '- Says things like "tell me more," "how does that work," "what are my options"\n';
  leadAssessment += "- Asks about their specific medications or doctors being covered\n\n";
  leadAssessment += "MEDIUM INTEREST SIGNALS (stay warm, focus on value):\n";
  leadAssessment += "- Gives short but not dismissive answers\n";
  leadAssessment += '- Says "maybe" or "I\'ll think about it"\n';
  leadAssessment += "- Asks how long the call will take\n";
  leadAssessment += '- Mentions they\'re "kind of busy but go ahead"\n\n';
  leadAssessment += "LOW INTEREST SIGNALS (pivot to softer CTA, offer email/callback):\n";
  leadAssessment += '- Very short answers ("yeah," "uh huh," "okay")\n';
  leadAssessment += "- Sounds distracted or disengaged\n";
  leadAssessment += '- Says "I\'m not really looking right now"\n';
  leadAssessment += "- Long pauses before answering\n\n";
  leadAssessment += "DEAD SIGNALS (wrap up gracefully, respect their wishes):\n";
  leadAssessment += '- "I\'m not interested"\n';
  leadAssessment += '- "Stop calling me"\n';
  leadAssessment += '- "I already told someone no"\n';
  leadAssessment += "- Hangs up\n\n";
  leadAssessment += "Adjust your approach based on these signals:\n";
  leadAssessment += "- High interest → Be more specific, ask qualifying questions, push for appointment\n";
  leadAssessment += "- Medium interest → Focus on the one most compelling benefit, ask one easy question\n";
  leadAssessment += "- Low interest → Offer to send an email instead, suggest a specific callback time\n";
  leadAssessment += "- Dead → Thank them, end the call politely\n";
  sections.push(leadAssessment);

  // === ENROLLMENT PERIOD CONTEXT ===
  const enrollmentContext = getEnrollmentPromptContext();
  sections.push(enrollmentContext);

  // === CLOSING ===
  if (agent.closing_script) {
    let closing = "## WRAPPING UP THE CALL\n";
    closing += `When ending the call, say something like: "${agent.closing_script}"\n`;
    closing +=
      "Adapt this based on the conversation — make it feel natural, not scripted.\n";
    closing +=
      "Always end on a positive note, even if the call didn't achieve the primary objective.\n";
    sections.push(closing);
  }

  // === VOICEMAIL ===
  if (agent.voicemail_enabled && agent.voicemail_script) {
    let vm = "## VOICEMAIL MESSAGE\n";
    vm += `If you reach voicemail, leave this message: "${agent.voicemail_script}"\n`;
    vm +=
      "Keep voicemails under 30 seconds. Speak clearly and at a moderate pace.\n";
    vm +=
      "Always include your name, the company name, a brief reason for calling, and a callback number.\n";
    sections.push(vm);
  }

  return sections.join("\n\n");
}
