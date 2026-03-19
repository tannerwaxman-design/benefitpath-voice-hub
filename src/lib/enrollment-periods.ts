// ============================================================
// ENROLLMENT PERIOD UTILITIES
// Determines which Medicare enrollment period is currently active
// and provides prompt context for AI agents.
// ============================================================

export type EnrollmentPeriodType = "aep" | "oep" | "none" | "post_aep";

export interface EnrollmentPeriod {
  type: EnrollmentPeriodType;
  label: string;
  shortLabel: string;
  description: string;
  startDate: string; // MM-DD
  endDate: string;   // MM-DD
  daysRemaining: number;
  isActive: boolean;
}

export interface EnrollmentCalendarEntry {
  label: string;
  dates: string;
  description: string;
}

export const ENROLLMENT_CALENDAR: EnrollmentCalendarEntry[] = [
  { label: "OEP (Open Enrollment Period)", dates: "Jan 1 – Mar 31", description: "Switch MA plans or go back to Original Medicare" },
  { label: "No general enrollment (SEPs only)", dates: "Apr 1 – Sep 30", description: "Only Special Enrollment Periods apply" },
  { label: "AEP (Annual Enrollment Period)", dates: "Oct 15 – Dec 7", description: "Biggest enrollment window of the year" },
  { label: "Medigap Open Enrollment", dates: "Oct 1 – Mar 31", description: "Varies by state" },
  { label: "Special Enrollment Periods (SEPs)", dates: "Rolling", description: "Triggered by qualifying life events" },
];

export function getCurrentEnrollmentPeriod(now: Date = new Date()): EnrollmentPeriod {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear();

  // AEP: Oct 15 - Dec 7
  if ((month === 10 && day >= 15) || month === 11 || (month === 12 && day <= 7)) {
    const dec7 = new Date(year, 11, 7);
    const daysLeft = Math.max(0, Math.ceil((dec7.getTime() - now.getTime()) / 86400000));
    return {
      type: "aep",
      label: "Annual Enrollment Period (AEP)",
      shortLabel: "AEP",
      description: "The most important enrollment window of the year.",
      startDate: "10-15",
      endDate: "12-07",
      daysRemaining: daysLeft,
      isActive: true,
    };
  }

  // OEP: Jan 1 - Mar 31
  if (month >= 1 && month <= 3) {
    const mar31 = new Date(year, 2, 31);
    const daysLeft = Math.max(0, Math.ceil((mar31.getTime() - now.getTime()) / 86400000));
    return {
      type: "oep",
      label: "Open Enrollment Period (OEP)",
      shortLabel: "OEP",
      description: "Switch MA plans or go back to Original Medicare + PDP.",
      startDate: "01-01",
      endDate: "03-31",
      daysRemaining: daysLeft,
      isActive: true,
    };
  }

  // Post-AEP: Dec 8-31
  if (month === 12 && day > 7) {
    const oct15 = new Date(year + 1, 9, 15);
    const daysUntil = Math.ceil((oct15.getTime() - now.getTime()) / 86400000);
    return {
      type: "post_aep",
      label: "Post-AEP (No General Enrollment)",
      shortLabel: "Off-Season",
      description: "AEP has ended. SEPs only until OEP starts Jan 1.",
      startDate: "12-08",
      endDate: "12-31",
      daysRemaining: daysUntil,
      isActive: false,
    };
  }

  // No general enrollment: Apr 1 - Oct 14
  const oct15 = new Date(year, 9, 15);
  const daysUntilAEP = Math.max(0, Math.ceil((oct15.getTime() - now.getTime()) / 86400000));
  return {
    type: "none",
    label: "No General Enrollment Period",
    shortLabel: "Off-Season",
    description: "Only Special Enrollment Periods (SEPs) triggered by life events.",
    startDate: "04-01",
    endDate: "10-14",
    daysRemaining: daysUntilAEP,
    isActive: false,
  };
}

export function getUpcomingPeriod(now: Date = new Date()): { label: string; dates: string; daysAway: number } {
  const current = getCurrentEnrollmentPeriod(now);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (current.type === "aep") {
    const jan1 = new Date(year + 1, 0, 1);
    return { label: "Open Enrollment Period (OEP)", dates: `January 1 — March 31, ${year + 1}`, daysAway: Math.ceil((jan1.getTime() - now.getTime()) / 86400000) };
  }
  if (current.type === "oep") {
    const oct15 = new Date(year, 9, 15);
    return { label: "Annual Enrollment Period (AEP)", dates: `October 15 — December 7, ${year}`, daysAway: Math.ceil((oct15.getTime() - now.getTime()) / 86400000) };
  }
  // Off-season or post-AEP
  if (month >= 4 || month === 12) {
    const targetYear = month === 12 ? year + 1 : year;
    const oct15 = new Date(targetYear, 9, 15);
    return { label: "Annual Enrollment Period (AEP)", dates: `October 15 — December 7, ${targetYear}`, daysAway: Math.ceil((oct15.getTime() - now.getTime()) / 86400000) };
  }
  return { label: "Annual Enrollment Period (AEP)", dates: `October 15 — December 7, ${year}`, daysAway: current.daysRemaining };
}

export function getEnrollmentPromptContext(now: Date = new Date()): string {
  const period = getCurrentEnrollmentPeriod(now);

  if (period.type === "aep") {
    return `## CURRENT ENROLLMENT PERIOD: Annual Enrollment Period (AEP)
You are calling during the most important time of year for Medicare enrollment. AEP runs from October 15 to December 7.

KEY BEHAVIORS:
- Lead with urgency: "The annual enrollment window is open right now and closes on December 7th."
- Emphasize that plan options change every year: "Plans and premiums for next year have already been released, so this is the best time to compare."
- If someone says "I'll think about it," remind them of the deadline: "Absolutely, take your time. Just keep in mind that December 7th is the last day to make changes for next year."
- Frame the call as time-sensitive but not pushy.

TALKING POINTS:
- New plans are available that weren't there last year
- Premiums and benefits may have changed on their current plan
- This is the one time per year they can freely switch plans
- After December 7th, they're locked in until next October

DAYS REMAINING: ${period.daysRemaining} days left in the enrollment window. Mention this naturally: "We have ${period.daysRemaining} days left in the enrollment window."`;
  }

  if (period.type === "oep") {
    return `## CURRENT ENROLLMENT PERIOD: Open Enrollment Period (OEP)
OEP runs from January 1 to March 31. During this window, people who are ALREADY enrolled in a Medicare Advantage plan can:
- Switch to a different MA plan
- Drop their MA plan and go back to Original Medicare + PDP

KEY BEHAVIORS:
- This is for people who already enrolled during AEP but want to make a change. Not for new enrollees.
- Lower urgency than AEP but still time-limited: "You have until March 31st to make a one-time change to your Medicare Advantage plan."
- Ask: "How has your new plan been working for you so far? Sometimes people find the plan they chose during enrollment isn't quite what they expected."
- OEP only allows ONE change. Emphasize: "This is your one opportunity to adjust your coverage before next fall."

DAYS REMAINING: ${period.daysRemaining} days left in OEP.`;
  }

  // Off-season (including post-AEP)
  const isPreAEP = new Date().getMonth() + 1 >= 8 && new Date().getMonth() + 1 <= 9;

  let prompt = `## CURRENT ENROLLMENT PERIOD: None (Special Enrollment Periods only)
There is no general enrollment period right now. The only way someone can enroll or change plans is through a Special Enrollment Period (SEP) triggered by a qualifying life event.

KEY BEHAVIORS:
- Do NOT promise they can enroll right now unless they have a qualifying event
- Screen for SEP triggers: "Have you experienced any recent life changes? Things like moving to a new area, losing your current coverage, or turning 65 can open a special window for you to enroll."
- Common SEP triggers: turning 65, moving, losing employer coverage, losing Medicaid, new to Medicare, institutional changes, 5-star plan enrollment
- If they DO have an SEP: "Great news — that qualifies you for a Special Enrollment Period, which means we can look at your options right now."
- If they DON'T have an SEP: "Right now the main enrollment windows are closed, but I'd love to help you get set up before the Annual Enrollment Period opens on October 15th. Can I schedule a consultation for early October so we're ready to go on day one?"
- Use this period to build relationships and pre-book AEP appointments.

DAYS UNTIL AEP: ${period.daysRemaining} days until AEP opens.`;

  if (isPreAEP) {
    prompt += `

PRE-AEP CAMPAIGN GUIDANCE:
We are in pre-AEP season. Shift messaging to AEP prep:
- "Enrollment opens October 15th. Let's get you on the calendar now so you don't have to wait."
- Build a waitlist of contacts to call on October 15th.`;
  }

  prompt += `

SPECIAL ENROLLMENT PERIOD SCREENING:
Always screen for these qualifying life events:
1. Turning 65 (Initial Enrollment Period)
2. Moving to a new service area
3. Losing current coverage (employer, Medicaid, etc.)
4. Released from incarceration
5. Returning to the US after living abroad
6. Plan terminated or reduced services
7. Eligible for Extra Help/LIS
8. 5-star plan enrollment (can switch anytime)

If a qualifying event is confirmed, they typically have 60 days from the event to enroll. Create urgency around that window.`;

  return prompt;
}

export interface CampaignSuggestion {
  title: string;
  description: string;
  objective: string;
  icon: string;
}

export function getCampaignSuggestions(now: Date = new Date()): CampaignSuggestion[] {
  const month = now.getMonth() + 1;
  const period = getCurrentEnrollmentPeriod(now);

  const suggestions: CampaignSuggestion[] = [];

  if (period.type === "aep") {
    suggestions.push({
      title: "AEP Enrollment Push",
      description: "Maximize your enrollment numbers. Call leads who showed interest during pre-AEP and new inbound leads.",
      objective: "appointment_setting",
      icon: "🔥",
    });
  } else if (period.type === "oep") {
    suggestions.push({
      title: "OEP Plan Check-In",
      description: "Reach out to people who enrolled during AEP to see if they're happy with their plan or want to make a change.",
      objective: "enrollment_followup",
      icon: "🔄",
    });
  } else {
    // Off-season
    suggestions.push({
      title: "SEP Lead Generation",
      description: "Target people who recently moved, turned 65, or lost coverage — they may qualify for a Special Enrollment Period.",
      objective: "lead_qualification",
      icon: "🎯",
    });
    suggestions.push({
      title: "Birthday Outreach",
      description: "Call contacts turning 65 in the next 3 months to help them with their Initial Enrollment Period.",
      objective: "appointment_setting",
      icon: "🎂",
    });
  }

  // Pre-AEP suggestions (Aug-Sep)
  if (month >= 8 && month <= 9) {
    suggestions.unshift({
      title: "AEP Pre-Booking",
      description: "Call your contact list now to pre-book consultation appointments starting October 15th. First-movers win during AEP.",
      objective: "appointment_setting",
      icon: "📅",
    });
  }

  return suggestions;
}
