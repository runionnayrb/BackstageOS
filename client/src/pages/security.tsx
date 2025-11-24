import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-secondary text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/landing">
            <a className="inline-flex items-center space-x-2 mb-6 hover:opacity-80">
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </a>
          </Link>
          <h1 className="text-4xl font-bold mb-4">Security</h1>
          <p className="text-xl opacity-90">How we protect your production data</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="prose prose-lg max-w-none">
          <h2>Data Protection & Encryption</h2>
          <p>
            BackstageOS implements industry-leading security measures to protect your production data. All data transmitted between your device and our servers is encrypted using TLS 1.3, the same encryption standard used by financial institutions and healthcare providers.
          </p>

          <h2>At-Rest Encryption</h2>
          <p>
            Your data is encrypted at rest using AES-256 encryption. This means that even if someone gains unauthorized access to our servers, your information remains protected and unreadable without the proper encryption keys.
          </p>

          <h2>Authentication & Access Control</h2>
          <p>
            We employ multi-factor authentication (MFA) to ensure that only authorized users can access accounts. Your passwords are hashed using bcrypt with multiple rounds, making them resistant to brute-force attacks. We never store passwords in plain text.
          </p>

          <h2>Session Security</h2>
          <p>
            Your session tokens are stored securely and expire after a period of inactivity. We use secure, HTTP-only cookies to prevent cross-site scripting attacks. Each session is tied to your specific device and browser fingerprint.
          </p>

          <h2>Regular Security Audits</h2>
          <p>
            We conduct regular security assessments and penetration testing to identify and fix vulnerabilities. Our systems are monitored 24/7 for suspicious activity and unauthorized access attempts.
          </p>

          <h2>Compliance & Standards</h2>
          <p>
            BackstageOS is designed to comply with GDPR, CCPA, and other data protection regulations. We follow OWASP (Open Web Application Security Project) best practices for secure software development.
          </p>

          <h2>Third-Party Security</h2>
          <p>
            Any third-party services we use for payment processing, email delivery, or cloud infrastructure are carefully vetted for security compliance. We ensure they meet the same security standards we maintain.
          </p>

          <h2>Data Breach Notification</h2>
          <p>
            In the unlikely event of a security incident, we will notify affected users within 72 hours and provide guidance on protecting their accounts. We maintain comprehensive incident response procedures.
          </p>

          <h2>Your Security Responsibilities</h2>
          <p>
            While we provide robust security infrastructure, we recommend:
          </p>
          <ul>
            <li>Using a strong, unique password for your account</li>
            <li>Enabling multi-factor authentication</li>
            <li>Keeping your devices and browsers updated</li>
            <li>Not sharing your login credentials</li>
            <li>Logging out when using shared devices</li>
          </ul>

          <h2>Security Contact</h2>
          <p>
            If you discover a security vulnerability, please contact us at security@backstageos.com. We take security concerns seriously and will respond promptly to reports.
          </p>

          <p className="text-sm text-gray-600 mt-12">
            Last updated: November 2025
          </p>
        </div>
      </div>
    </div>
  );
}
