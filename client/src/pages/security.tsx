export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <p className="text-sm opacity-75 tracking-wide">Backstage<span className="font-semibold">OS</span></p>
          </div>
          <h1 className="text-4xl font-bold mb-4">Security</h1>
          <p className="text-xl opacity-90">How we protect your production data</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto py-12 px-4 text-slate-900 dark:text-slate-50">
        <div className="space-y-8">
          <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-white">Data Protection & Encryption</h2>
          <p className="mb-4">
            BackstageOS implements industry-leading security measures to protect your production data. All data transmitted between your device and our servers is encrypted using TLS 1.3, the same encryption standard used by financial institutions and healthcare providers.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-white">At-Rest Encryption</h2>
          <p className="mb-4">
            Your data is encrypted at rest using AES-256 encryption. This means that even if someone gains unauthorized access to our servers, your information remains protected and unreadable without the proper encryption keys.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-white">Authentication & Access Control</h2>
          <p className="mb-4">
            We employ multi-factor authentication (MFA) to ensure that only authorized users can access accounts. Your passwords are hashed using bcrypt with multiple rounds, making them resistant to brute-force attacks. We never store passwords in plain text.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-white">Session Security</h2>
          <p className="mb-4">
            Your session tokens are stored securely and expire after a period of inactivity. We use secure, HTTP-only cookies to prevent cross-site scripting attacks. Each session is tied to your specific device and browser fingerprint.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-white">Regular Security Audits</h2>
          <p className="mb-4">
            We conduct regular security assessments and penetration testing to identify and fix vulnerabilities. Our systems are monitored 24/7 for suspicious activity and unauthorized access attempts.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-white">Compliance & Standards</h2>
          <p className="mb-4">
            BackstageOS is designed to comply with GDPR, CCPA, and other data protection regulations. We follow OWASP (Open Web Application Security Project) best practices for secure software development.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-white">Third-Party Security</h2>
          <p className="mb-4">
            Any third-party services we use for payment processing, email delivery, or cloud infrastructure are carefully vetted for security compliance. We ensure they meet the same security standards we maintain.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-white">Data Breach Notification</h2>
          <p className="mb-4">
            In the unlikely event of a security incident, we will notify affected users within 72 hours and provide guidance on protecting their accounts. We maintain comprehensive incident response procedures.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-white">Your Security Responsibilities</h2>
          <p className="mb-4">
            While we provide robust security infrastructure, we recommend:
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li>Using a strong, unique password for your account</li>
            <li>Enabling multi-factor authentication</li>
            <li>Keeping your devices and browsers updated</li>
            <li>Not sharing your login credentials</li>
            <li>Logging out when using shared devices</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-white">Security Contact</h2>
          <p className="mb-4">
            If you discover a security vulnerability, please contact us at security@backstageos.com. We take security concerns seriously and will respond promptly to reports.
          </p>

        </div>
        
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 mt-8">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Last updated: November 2025
          </p>
        </div>
      </div>
    </div>
  );
}
