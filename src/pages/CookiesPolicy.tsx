import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";

export default function CookiesPolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingNav />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-foreground mb-2">Cookies Policy</h1>
        <p className="text-muted-foreground mb-10">Last Updated: March 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-foreground/90 text-[15px] leading-relaxed">
          <p>
            This Cookies Policy explains how Benefit Path ("BenefitPath," "we," "us," or "our") uses cookies and similar technologies on our website benefitpath.com (the "Website").
          </p>

          <Section title="What Are Cookies?">
            <p>Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and to provide information to website owners.</p>
          </Section>

          <Section title="How We Use Cookies">
            <p>We use the following types of cookies on our Website:</p>

            <h4 className="font-semibold mt-4 mb-2">Strictly Necessary Cookies</h4>
            <p>These cookies are essential for the operation of our Website. They enable basic functions like page navigation, secure login, and account access. The Website cannot function properly without these cookies.</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Session cookies that keep you logged into your account</li>
              <li>Security cookies that help protect your account from unauthorized access</li>
            </ul>

            <h4 className="font-semibold mt-4 mb-2">Functionality Cookies</h4>
            <p>These cookies allow our Website to remember choices you make (such as your language preference or display settings) and provide enhanced, personalized features.</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Cookies that remember your dashboard preferences</li>
              <li>Cookies that remember your login email for convenience</li>
            </ul>

            <h4 className="font-semibold mt-4 mb-2">Analytics and Performance Cookies</h4>
            <p>These cookies help us understand how visitors interact with our Website by collecting and reporting information. This helps us improve the Website's performance and user experience.</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Google Analytics cookies that track page views, session duration, and user behavior</li>
              <li>Performance cookies that help us identify and fix errors</li>
            </ul>

            <h4 className="font-semibold mt-4 mb-2">Third Party Cookies</h4>
            <p>Some cookies may be set by third party services that appear on our pages. We do not control these third party cookies. Third party services we use that may set cookies include:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Google Analytics (website analytics)</li>
              <li>Stripe (payment processing)</li>
              <li>Intercom or similar services (customer support chat, if applicable)</li>
            </ul>
          </Section>

          <Section title="Managing Cookies">
            <p>Most web browsers allow you to control cookies through their settings. You can typically:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>View what cookies are stored on your device</li>
              <li>Delete individual cookies or all cookies</li>
              <li>Block third party cookies</li>
              <li>Block all cookies from specific or all websites</li>
              <li>Delete all cookies when you close your browser</li>
            </ul>
            <p>Please note that blocking or deleting cookies may impact your experience on our Website. Some features may not function properly if cookies are disabled.</p>

            <h4 className="font-semibold mt-4 mb-2">Browser-Specific Instructions:</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</li>
              <li><strong>Firefox:</strong> Settings → Privacy &amp; Security → Cookies and Site Data</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
              <li><strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data</li>
            </ul>
          </Section>

          <Section title="Changes to This Cookies Policy">
            <p>We may update this Cookies Policy from time to time. Any changes will be posted on this page with an updated "Last Updated" date.</p>
          </Section>

          <Section title="Contact Us">
            <p>If you have questions about our use of cookies, please contact us at:</p>
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
