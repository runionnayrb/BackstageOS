import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-xl opacity-90">How we collect, use, and protect your information</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="prose prose-lg max-w-none">
          <h2>Introduction</h2>
          <p>
            BackstageOS ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
          </p>

          <h2>Information We Collect</h2>
          <h3>User-Provided Information</h3>
          <p>
            When you create an account or use BackstageOS, you may provide:
          </p>
          <ul>
            <li>Account credentials (name, email address)</li>
            <li>Profile information (organization, role, team details)</li>
            <li>Production data (shows, schedules, contacts, scripts, reports)</li>
            <li>Communication preferences and notifications settings</li>
          </ul>

          <h3>Automatically Collected Information</h3>
          <p>
            We automatically collect certain information about your device and usage:
          </p>
          <ul>
            <li>Device information (device type, operating system, browser type)</li>
            <li>Log data (IP address, page views, time spent, clicks)</li>
            <li>Location data (if permitted by your device settings)</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>

          <h2>How We Use Your Information</h2>
          <p>
            We use the information we collect for the following purposes:
          </p>
          <ul>
            <li>Providing and improving the BackstageOS service</li>
            <li>Authenticating your account and verifying your identity</li>
            <li>Responding to your inquiries and providing customer support</li>
            <li>Sending service announcements and updates</li>
            <li>Analyzing usage patterns to improve user experience</li>
            <li>Detecting and preventing fraud or security issues</li>
            <li>Complying with legal obligations</li>
          </ul>

          <h2>Data Sharing & Disclosure</h2>
          <p>
            We do not sell, trade, or rent your personal information to third parties. We may share information:
          </p>
          <ul>
            <li>With team members you authorize in your account</li>
            <li>With service providers who assist with operations (payment processors, cloud hosts)</li>
            <li>When required by law or to protect our legal rights</li>
            <li>With your explicit consent</li>
          </ul>

          <h2>Data Retention</h2>
          <p>
            We retain your data as long as your account is active. If you delete your account, we will remove your data within 30 days, except where we are required by law to retain it. Backups may contain your data for an additional 90 days.
          </p>

          <h2>Your Privacy Rights</h2>
          <p>
            Depending on your location, you may have the following rights:
          </p>
          <ul>
            <li><strong>Access:</strong> Request a copy of the data we hold about you</li>
            <li><strong>Correction:</strong> Request correction of inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your data (right to be forgotten)</li>
            <li><strong>Portability:</strong> Request your data in a portable format</li>
            <li><strong>Opt-out:</strong> Opt out of marketing communications</li>
          </ul>

          <h2>International Data Transfers</h2>
          <p>
            Your information may be transferred to, stored in, and processed in countries other than your country of residence. These countries may have data protection laws that differ from your home country. By using BackstageOS, you consent to the transfer of your information as described in this policy.
          </p>

          <h2>Children's Privacy</h2>
          <p>
            BackstageOS is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected information from a child under 13, we will take steps to delete such information promptly.
          </p>

          <h2>Third-Party Links</h2>
          <p>
            BackstageOS may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies before providing any information.
          </p>

          <h2>California Privacy Rights (CCPA)</h2>
          <p>
            If you are a California resident, you have specific rights under the California Consumer Privacy Act (CCPA). You can request to know, delete, or opt-out of the sale of your personal information. Contact us at privacy@backstageos.com to exercise these rights.
          </p>

          <h2>European Privacy Rights (GDPR)</h2>
          <p>
            If you are in the European Union, you have rights under the General Data Protection Regulation (GDPR). We process your data based on your consent and our legitimate business interests. You have the right to access, correct, delete, or port your data.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our privacy practices, please contact us at:
          </p>
          <p>
            <strong>BackstageOS Privacy Team</strong><br />
            Email: privacy@backstageos.com
          </p>

          <h2>Policy Changes</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date below.
          </p>

          <p className="text-sm text-gray-600 mt-12">
            Last updated: November 2025
          </p>
        </div>
      </div>
    </div>
  );
}
