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
            BackstageOS implements industry-leading security measures to protect your production data. All data transmitted between your device and our servers is encrypted using TLS 1.3, the same encryption standard used by financial institutions and healthcare providers. This means that any information traveling from your browser to our servers is protected from interception or eavesdropping.
          </p>
          <p className="mb-4">
            Our encryption protocols are constantly updated and monitored to ensure they remain ahead of security threats. We use certificate pinning to prevent man-in-the-middle attacks and enforce strict HTTPS requirements across all connections. Your data is never transmitted over unencrypted channels.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-white">At-Rest Encryption</h2>
          <p className="mb-4">
            Your data is encrypted at rest using AES-256 encryption, the same standard used by government agencies and classified systems. This means that even if someone gains unauthorized access to our physical servers or storage systems, your information remains protected and unreadable without the proper encryption keys.
          </p>
          <p className="mb-4">
            We maintain separate encryption keys for each user and regularly rotate these keys to minimize risk. Encryption keys are stored in a secure, isolated key management system with restricted access. Even BackstageOS employees cannot access your encrypted data without proper authorization and authentication. Our encryption implementation undergoes regular security audits to ensure its integrity.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-white">Authentication & Access Control</h2>
          <p className="mb-4">
            We employ multi-factor authentication (MFA) to ensure that only authorized users can access accounts. Your passwords are hashed using bcrypt with multiple rounds, making them resistant to brute-force attacks. We never store passwords in plain text, and we implement rate limiting on login attempts to prevent automated attacks.
          </p>
          <p className="mb-4">
            Our access control system follows the principle of least privilege, ensuring users only have access to the specific resources and features they need. Account recovery processes are thoroughly vetted to prevent unauthorized account takeovers. We also monitor for unusual login patterns and alert users of suspicious activity. Administrative access requires additional verification steps and is logged for audit purposes.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-white">Session Security</h2>
          <p className="mb-4">
            Your session tokens are stored securely and expire after a period of inactivity to minimize the window of vulnerability if a token is compromised. We use secure, HTTP-only cookies to prevent cross-site scripting attacks, ensuring that malicious scripts cannot access your authentication tokens.
          </p>
          <p className="mb-4">
            Each session is tied to your specific device and browser fingerprint, adding an additional layer of protection against session hijacking. Session tokens are regenerated upon login and contain cryptographic signatures that validate their authenticity. We implement CSRF (Cross-Site Request Forgery) protection on all state-changing operations, and users are automatically logged out after extended periods of inactivity. Real-time session monitoring alerts you if your account is accessed from unexpected locations or devices.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-white">Regular Security Audits</h2>
          <p className="mb-4">
            We conduct regular security assessments and penetration testing to identify and fix vulnerabilities before they can be exploited. Our systems are monitored 24/7 for suspicious activity and unauthorized access attempts, with automated alerting systems that trigger immediate investigation.
          </p>
          <p className="mb-4">
            Our security team performs code reviews on all changes before deployment, with a particular focus on authentication, encryption, and data handling logic. We maintain a vulnerability disclosure program that encourages responsible reporting of security issues. Third-party security experts conduct annual comprehensive audits of our infrastructure and codebase. All security incidents are logged and tracked, with root cause analysis performed to prevent recurrence.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-white">Compliance & Standards</h2>
          <p className="mb-4">
            BackstageOS is designed to comply with GDPR, CCPA, and other data protection regulations. We follow OWASP (Open Web Application Security Project) best practices for secure software development, ensuring our application adheres to established security standards.
          </p>
          <p className="mb-4">
            Our infrastructure meets SOC 2 compliance requirements for security, availability, and confidentiality. We maintain detailed documentation of our security practices and conduct regular compliance assessments. Our privacy policy aligns with all major data protection frameworks, and we provide users with tools to control their data, including export and deletion capabilities. We also comply with accessibility standards to ensure all users can interact securely with our platform.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-white">Third-Party Security</h2>
          <p className="mb-4">
            Any third-party services we use for payment processing, email delivery, or cloud infrastructure are carefully vetted for security compliance. We ensure they meet the same security standards we maintain and regularly audit their compliance status.
          </p>
          <p className="mb-4">
            Our vendor management program requires that all third-party providers maintain appropriate security certifications and undergo regular security assessments. We use service-level agreements with specific security requirements and have the right to audit any third-party systems that handle your data. Data sharing with third parties is minimized and only occurs when necessary for service delivery. We maintain control over our data at all times and can migrate away from any vendor while retaining full access to our information.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-white">Data Breach Notification</h2>
          <p className="mb-4">
            In the unlikely event of a security incident, we will notify affected users within 72 hours and provide guidance on protecting their accounts. We maintain comprehensive incident response procedures to minimize impact and ensure swift resolution.
          </p>
          <p className="mb-4">
            Our incident response team is trained and prepared to handle security events at any time. We conduct regular incident response drills to ensure preparedness. Upon discovery of any unauthorized access, we immediately isolate affected systems, begin forensic investigation, and notify relevant authorities if required by law. We provide affected users with credit monitoring services and clear guidance on protective steps they can take. Post-incident, we perform thorough root cause analysis and implement additional safeguards to prevent similar incidents in the future.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-white">Infrastructure Redundancy & Business Continuity</h2>
          <p className="mb-4">
            BackstageOS maintains comprehensive backup and disaster recovery systems to ensure your production data is never lost and remains accessible even in the face of infrastructure failures. Your complete application codebase is continuously synchronized to a distributed version control system—an industry-standard backup mechanism used by millions of development teams worldwide.
          </p>
          <p className="mb-4">
            This means that even if our primary hosting platform experiences unexpected downtime or issues, your entire application architecture and configuration remain safely preserved in this independent backup system. Your production database is backed up continuously with multiple redundant copies stored in geographically distributed locations. In the event of any infrastructure failure, we can rapidly restore your application and data from these backups, minimizing any potential disruption.
          </p>
          <p className="mb-4">
            This multi-layered approach ensures there is no single point of failure for your critical production information. Your data security and business continuity are protected by inherently resilient systems designed for maximum uptime and data preservation. You can have confidence that your work and data are not only encrypted and protected but also backed up in multiple independent locations, ensuring they survive any single point of failure.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-white">Your Security Responsibilities</h2>
          <p className="mb-4">
            While we provide robust security infrastructure, we recognize that security is a shared responsibility. You play an important role in protecting your account and data. We recommend the following best practices:
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li>Using a strong, unique password for your account that combines uppercase, lowercase, numbers, and special characters</li>
            <li>Enabling multi-factor authentication to add an additional layer of protection beyond your password</li>
            <li>Keeping your devices, operating systems, and browsers updated with the latest security patches</li>
            <li>Not sharing your login credentials with anyone, even trusted colleagues or team members</li>
            <li>Logging out when using shared devices and never saving login information on public computers</li>
            <li>Being cautious of phishing emails and verifying the authenticity of unexpected communication</li>
            <li>Using a reputable password manager to securely store and manage your credentials</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-white">Security Contact</h2>
          <p className="mb-4">
            If you discover a security vulnerability or have security concerns, please contact us at security@backstageos.com. We take security concerns seriously and will respond promptly to reports. For responsible disclosure, we ask that you provide us with reasonable time to address the issue before public disclosure.
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
