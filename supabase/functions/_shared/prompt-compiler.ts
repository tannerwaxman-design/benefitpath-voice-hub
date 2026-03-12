// ============================================================
// SYSTEM PROMPT COMPILER
// Takes agent config + tenant info and compiles the full
// system prompt that VAPI's LLM will use during calls.
//
// THIS IS THE COMPETITIVE MOAT. The quality of this prompt
// directly determines how good the AI agent sounds on calls.
// ============================================================

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
