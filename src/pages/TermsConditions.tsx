import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";

export default function TermsConditions() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingNav />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-foreground mb-2">Terms &amp; Conditions</h1>
        <p className="text-muted-foreground mb-10">Last Updated: March 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-foreground/90 text-[15px] leading-relaxed">
          <p>
            These Terms and Conditions ("Terms") govern your use of the Benefit Path website and platform located at benefitpath.com (the "Platform"), operated by Benefit Path ("BenefitPath," "we," "us," or "our"). By accessing or using the Platform, you agree to be bound by these Terms. If you do not agree to these Terms, do not use the Platform.
          </p>

          <Section title="1. Account Registration">
            <p>To use our services, you must create an account. You agree to provide accurate, current, and complete information during registration and to keep your account information updated. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.</p>
            <p>You must be at least 18 years old to create an account. If you are using the Platform on behalf of a business or organization, you represent that you have the authority to bind that entity to these Terms.</p>
          </Section>

          <Section title="2. Services">
            <p>BenefitPath provides a platform for insurance agents and benefits professionals that includes:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Personalized agent pages with custom URLs</li>
              <li>Client submission and data collection tools</li>
              <li>Voice AI outbound and inbound calling services</li>
              <li>Campaign management and contact list management</li>
              <li>Call recording, transcription, and analytics</li>
              <li>CRM and calendar integrations</li>
              <li>Team management tools</li>
            </ul>
            <p>We reserve the right to modify, suspend, or discontinue any part of our services at any time with reasonable notice.</p>
          </Section>

          <Section title="3. Subscription and Payment">
            <p>Access to BenefitPath services requires a paid subscription. By subscribing, you agree to pay the applicable fees as described at the time of purchase.</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Subscriptions are billed on a monthly recurring basis.</li>
              <li>Payment is due at the beginning of each billing cycle.</li>
              <li>Voice AI usage beyond your plan's included minutes will be billed at the overage rate specified in your plan.</li>
              <li>You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing cycle. No refunds are provided for partial months.</li>
              <li>We reserve the right to change our pricing with 30 days' notice.</li>
            </ul>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree to use the Platform only for lawful purposes and in accordance with these Terms. You agree NOT to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the Platform to make calls that violate the Telephone Consumer Protection Act (TCPA), Telemarketing Sales Rule (TSR), or any applicable federal, state, or local telemarketing laws</li>
              <li>Call numbers on the National Do Not Call Registry unless you have an established business relationship or prior express consent</li>
              <li>Use the Platform to harass, threaten, or defraud any person</li>
              <li>Upload or transmit content that is unlawful, harmful, defamatory, or otherwise objectionable</li>
              <li>Attempt to gain unauthorized access to the Platform or its systems</li>
              <li>Use the Platform to send unsolicited commercial communications (spam)</li>
              <li>Misrepresent your identity or the purpose of your calls</li>
              <li>Use the Platform in a way that could damage, disable, or impair our services</li>
              <li>Resell or redistribute access to the Platform without our written permission</li>
              <li>Use the Platform to collect sensitive personal information (such as Social Security numbers, credit card numbers, or bank account information) during AI-assisted calls</li>
            </ul>
          </Section>

          <Section title="5. Voice AI Specific Terms">
            <p><strong>Call Recording Consent:</strong> You are responsible for ensuring that all calls made through the Voice AI service comply with applicable recording consent laws. Many states require one-party or two-party consent for call recording. The Platform provides configurable recording disclosure features, but it is your responsibility to ensure compliance with the laws in your jurisdiction and the jurisdiction of the person being called.</p>
            <p><strong>AI Disclosure:</strong> The Voice AI service uses artificial intelligence to conduct conversations. While the AI is designed to sound natural and professional, you acknowledge that calls are conducted by an AI system, not a human. You are responsible for determining whether and how to disclose this to the people being called, in accordance with applicable laws and regulations.</p>
            <p><strong>Call Content:</strong> You are responsible for the content of your AI agent's scripts, greetings, objection handling responses, and knowledge base information. You agree not to configure your AI agent to make false or misleading claims, provide medical, legal, or financial advice, or violate any applicable laws or regulations.</p>
            <p><strong>DNC Compliance:</strong> You are responsible for maintaining compliance with Do Not Call regulations. The Platform provides DNC list management tools, but you are ultimately responsible for ensuring your calling practices comply with all applicable laws.</p>
          </Section>

          <Section title="6. Intellectual Property">
            <p>The Platform and its original content (excluding content provided by users), features, and functionality are owned by BenefitPath and are protected by copyright, trademark, and other intellectual property laws.</p>
            <p>You retain ownership of all content you upload to the Platform, including agent configurations, knowledge base content, and contact data. By uploading content, you grant us a limited license to use, store, and process that content solely for the purpose of providing our services to you.</p>
          </Section>

          <Section title="7. Limitation of Liability">
            <p>To the maximum extent permitted by law, BenefitPath shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities, arising from your use of the Platform.</p>
            <p>Our total liability for any claim arising from your use of the Platform shall not exceed the amount you paid to us in the 12 months preceding the claim.</p>
            <p>BenefitPath is not responsible for the outcome of calls made through the Voice AI service, including but not limited to missed appointments, inaccurate information provided by the AI, or any decisions made based on AI generated analysis or recommendations.</p>
          </Section>

          <Section title="8. Indemnification">
            <p>You agree to indemnify and hold harmless BenefitPath, its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable legal fees) arising from your use of the Platform, your violation of these Terms, or your violation of any applicable laws, including but not limited to TCPA, TSR, and state telemarketing laws.</p>
          </Section>

          <Section title="9. Termination">
            <p>We may suspend or terminate your account if we reasonably believe you have violated these Terms, engaged in illegal activity, or pose a risk to our Platform or other users. You may terminate your account at any time by contacting us or through your account settings.</p>
            <p>Upon termination, your right to use the Platform ceases immediately. We will retain your data in accordance with our Privacy Policy and applicable law.</p>
          </Section>

          <Section title="10. Disclaimer">
            <p>The Platform is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the Platform will be uninterrupted, error free, or completely secure.</p>
            <p>The Voice AI service uses artificial intelligence, which may produce inaccurate, incomplete, or inappropriate responses. We do not guarantee the accuracy, reliability, or quality of AI generated content, including call transcripts, summaries, or analysis.</p>
          </Section>

          <Section title="11. Governing Law">
            <p>These Terms are governed by the laws of the Commonwealth of Pennsylvania, without regard to its conflict of law provisions. Any disputes arising from these Terms or your use of the Platform shall be resolved in the courts located in Lancaster County, Pennsylvania.</p>
          </Section>

          <Section title="12. Changes to These Terms">
            <p>We may update these Terms from time to time. We will notify you of material changes by posting the updated Terms on this page and updating the "Last Updated" date. Your continued use of the Platform after changes are posted constitutes your acceptance of the updated Terms.</p>
          </Section>

          <Section title="13. Contact Us">
            <p>If you have questions about these Terms, please contact us at:</p>
            <p>
              Benefit Path<br />
              Email: support@benefitpath.com
            </p>
          </Section>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
