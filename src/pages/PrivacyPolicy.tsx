import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingNav />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">Last Updated: March 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-foreground/90 text-[15px] leading-relaxed">
          <p>
            Benefit Path ("BenefitPath," "we," "us," or "our") operates the website benefitpath.com and related services (the "Platform"). This Privacy Policy describes how we collect, use, disclose, and protect your personal information when you use our Platform, including our Voice AI calling services.
          </p>
          <p>
            By using our Platform, you agree to the collection and use of information as described in this Privacy Policy. If you do not agree with this Privacy Policy, please do not use our Platform.
          </p>

          <Section title="1. Information We Collect">
            <h4 className="font-semibold mt-4 mb-2">Information You Provide to Us:</h4>
            <p>We collect information that you voluntarily provide when you create an account, use our services, or communicate with us. This includes:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Account registration information (name, email address, phone number, agency name)</li>
              <li>Payment and billing information (processed securely through our payment provider)</li>
              <li>Client and lead information that you upload or enter into the Platform (names, phone numbers, email addresses, insurance preferences, medical provider information)</li>
              <li>Agent profile information (bio, contact details, custom URLs)</li>
              <li>Voice AI configuration data (agent scripts, greeting messages, objection handling responses, knowledge base content, FAQ entries)</li>
            </ul>

            <h4 className="font-semibold mt-4 mb-2">Information Collected Automatically:</h4>
            <p>When you use our Platform, we automatically collect certain information, including:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Device and browser information (IP address, browser type, operating system)</li>
              <li>Usage data (pages visited, features used, time spent on the Platform)</li>
              <li>Cookies and similar tracking technologies (see our Cookies Policy for details)</li>
            </ul>

            <h4 className="font-semibold mt-4 mb-2">Information Collected Through Voice AI Services:</h4>
            <p>When you use our Voice AI calling services, we collect and process:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Call recordings (audio recordings of outbound and inbound calls made through the Platform)</li>
              <li>Call transcripts (text transcriptions of recorded calls)</li>
              <li>Call metadata (date, time, duration, phone numbers, call outcome, caller ID information)</li>
              <li>AI generated analysis (call summaries, sentiment analysis, intent detection, appointment details extracted from conversations)</li>
              <li>Contact responses and data collected during calls (information that contacts voluntarily share during AI-assisted conversations, such as preferred appointment times, email addresses, and insurance preferences)</li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>We use the information we collect for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>To provide, maintain, and improve our Platform and services</li>
              <li>To process your transactions and manage your account</li>
              <li>To facilitate AI-powered outbound and inbound phone calls on your behalf</li>
              <li>To generate call transcripts, summaries, and analytics</li>
              <li>To provide customer support and respond to your inquiries</li>
              <li>To send you service-related communications (billing notices, feature updates, security alerts)</li>
              <li>To detect, prevent, and address technical issues, fraud, or security concerns</li>
              <li>To comply with legal obligations and enforce our Terms and Conditions</li>
              <li>To analyze usage patterns and improve our services</li>
            </ul>
            <p className="font-semibold mt-4">We do NOT sell your personal information or your clients' personal information to third parties.</p>
          </Section>

          <Section title="3. Voice AI Data Handling">
            <h4 className="font-semibold mt-4 mb-2">Call Recording and Storage:</h4>
            <p>All calls made through our Voice AI service are recorded by default. A recording disclosure is played at the beginning of each call to inform the other party. You may configure your recording and disclosure settings within the Platform.</p>
            <p>Call recordings are stored securely using encrypted storage. You may access, download, or delete your call recordings at any time through the Platform. Call recordings are retained for the duration set in your account settings (default: 90 days) unless you choose a different retention period.</p>

            <h4 className="font-semibold mt-4 mb-2">Call Transcripts and Analysis:</h4>
            <p>Call transcripts are generated automatically using speech to text technology. AI generated summaries, sentiment analysis, and extracted data points are created to help you manage your client relationships. These are stored alongside the call recording and follow the same retention policy.</p>

            <h4 className="font-semibold mt-4 mb-2">Third Party Voice Processing:</h4>
            <p>Our Voice AI service uses third party technology providers to facilitate call processing, speech to text transcription, text to speech voice generation, and AI language processing. These providers process call data in accordance with their own privacy and security policies and are bound by contractual obligations to protect your data.</p>
            <p>We do not share the content of your calls, transcripts, or recordings with any third parties for marketing or advertising purposes.</p>

            <h4 className="font-semibold mt-4 mb-2">Do Not Call Compliance:</h4>
            <p>Our Platform includes automated Do Not Call (DNC) list management. When a call recipient requests to be removed from your calling list, the system automatically adds them to your DNC list and prevents future calls. You are responsible for maintaining compliance with all applicable telemarketing laws, including the Telephone Consumer Protection Act (TCPA) and the Telemarketing Sales Rule (TSR).</p>
          </Section>

          <Section title="4. Health Information and HIPAA">
            <p>BenefitPath is designed to serve insurance agents and benefits professionals. While BenefitPath is not a covered entity under HIPAA, we recognize that our users may handle protected health information (PHI) in the course of their business.</p>
            <p>We implement administrative, technical, and physical safeguards to protect sensitive information processed through our Platform, including:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Encryption of data in transit and at rest</li>
              <li>Access controls limiting data access to authorized users only</li>
              <li>Audit logging of data access and modifications</li>
              <li>Secure data storage infrastructure</li>
              <li>Regular security assessments</li>
            </ul>
            <p>If you are a covered entity or business associate under HIPAA, please contact us to discuss a Business Associate Agreement (BAA) if applicable to your use of our services.</p>
            <p className="font-semibold">Important: You are responsible for ensuring that your use of the Platform complies with all applicable privacy and health information laws. Do not upload or collect sensitive health information through the Platform unless you have obtained appropriate consent from the individuals involved.</p>
          </Section>

          <Section title="5. Data Sharing and Disclosure">
            <p>We may share your information in the following circumstances:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Service Providers:</strong> We share data with third party service providers who assist in operating our Platform (payment processing, cloud hosting, voice processing, email delivery). These providers are contractually obligated to protect your data and use it only for the services they provide to us.</li>
              <li><strong>CRM and Calendar Integrations:</strong> If you connect third party services (such as GoHighLevel, HubSpot, Salesforce, Google Calendar, or others) through our Tools feature, data will be shared with those services as configured by you. We are not responsible for the privacy practices of third party services you connect.</li>
              <li><strong>Legal Requirements:</strong> We may disclose your information if required by law, regulation, legal process, or governmental request.</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
              <li><strong>With Your Consent:</strong> We may share your information with third parties when you have given us explicit consent to do so.</li>
            </ul>
          </Section>

          <Section title="6. Data Security">
            <p>We implement industry standard security measures to protect your personal information, including:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>SSL/TLS encryption for all data in transit</li>
              <li>Encryption at rest for stored data</li>
              <li>Regular security monitoring and vulnerability assessments</li>
              <li>Access controls and authentication requirements</li>
              <li>Secure cloud infrastructure hosted in the United States</li>
            </ul>
            <p>No method of transmission or storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.</p>
          </Section>

          <Section title="7. Your Rights and Choices">
            <p>Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you.</li>
              <li><strong>Correction:</strong> Request correction of inaccurate personal information.</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information, subject to legal retention requirements.</li>
              <li><strong>Data Portability:</strong> Request your data in a portable format.</li>
              <li><strong>Opt Out:</strong> Opt out of marketing communications at any time.</li>
            </ul>
            <p>To exercise any of these rights, please contact us at the information provided below.</p>
            <p><strong>California Residents:</strong> Under the California Consumer Privacy Act (CCPA), you have additional rights regarding your personal information, including the right to know what personal information is collected, the right to delete your personal information, and the right to opt out of the sale of personal information. We do not sell personal information.</p>
          </Section>

          <Section title="8. Data Retention">
            <p>We retain your personal information for as long as your account is active or as needed to provide you with our services. Specific retention periods:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Account information: retained while your account is active and for 30 days after account deletion</li>
              <li>Call recordings: retained according to your account settings (default 90 days, configurable from 30 days to 1 year)</li>
              <li>Call transcripts and summaries: retained for the same period as call recordings</li>
              <li>Billing records: retained for 7 years for tax and legal compliance</li>
              <li>Usage logs: retained for 12 months</li>
            </ul>
          </Section>

          <Section title="9. Children's Privacy">
            <p>Our Platform is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected personal information from a child, we will take steps to delete that information.</p>
          </Section>

          <Section title="10. Changes to This Privacy Policy">
            <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on this page and updating the "Last Updated" date. Your continued use of the Platform after changes are posted constitutes your acceptance of the updated Privacy Policy.</p>
          </Section>

          <Section title="11. Contact Us">
            <p>If you have questions about this Privacy Policy or our data practices, please contact us at:</p>
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
