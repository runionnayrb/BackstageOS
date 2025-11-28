import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import Layout from "@/components/layout/layout";

export default function TermsPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Link to="/projects" className="inline-flex items-center space-x-2 mb-6 hover:opacity-80 cursor-pointer">
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-xl opacity-90">The rules and conditions for using BackstageOS</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto py-12 px-4 text-slate-900 dark:text-slate-50">
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Agreement to Terms</h2>
          <p>
            By accessing and using BackstageOS, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
          </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Use License</h2>
          <p>
            Permission is granted to temporarily download one copy of the materials (information or software) on BackstageOS for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
          </p>
          <ul>
            <li>Modify or copy the materials</li>
            <li>Use the materials for any commercial purpose or for any public display</li>
            <li>Attempt to decompile or reverse engineer any software contained on BackstageOS</li>
            <li>Remove any copyright or other proprietary notations from the materials</li>
            <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
            <li>Violate any applicable laws or regulations related to access to or use of BackstageOS</li>
            <li>Harass or cause distress or inconvenience to any person</li>
            <li>Disrupt the normal flow of dialogue within our website</li>
          </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Disclaimer</h2>
          <p>
            The materials on BackstageOS are provided on an 'as is' basis. BackstageOS makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Limitations</h2>
          <p>
            In no event shall BackstageOS or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on BackstageOS, even if BackstageOS or an authorized representative has been notified orally or in writing of the possibility of such damage.
          </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Accuracy of Materials</h2>
          <p>
            The materials appearing on BackstageOS could include technical, typographical, or photographic errors. BackstageOS does not warrant that any of the materials on the site are accurate, complete, or current. BackstageOS may make changes to the materials contained on the site at any time without notice.
          </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Materials Copyright</h2>
          <p>
            The materials on BackstageOS are copyrighted. BackstageOS reserves the right to change these terms and conditions of use at any time without notice.
          </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">User Accounts</h2>
          <p>
            When you create an account, you are responsible for:
          </p>
          <ul>
            <li>Providing accurate and complete information</li>
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>Accepting responsibility for all activities under your account</li>
            <li>Notifying us of unauthorized access</li>
          </ul>
          <p>
            We reserve the right to terminate accounts that violate these terms or for any other reason.
          </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">User Content</h2>
          <p>
            You retain all rights to any content you create within BackstageOS ("User Content"). However, you grant BackstageOS a worldwide, non-exclusive license to use, reproduce, modify, and distribute your User Content for the purposes of providing and improving the service.
          </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Prohibited Content</h2>
          <p>
            You agree not to upload, post, or transmit any content that:
          </p>
          <ul>
            <li>Is illegal, fraudulent, or harmful</li>
            <li>Violates third-party intellectual property rights</li>
            <li>Contains malware, viruses, or harmful code</li>
            <li>Is obscene, defamatory, or harassing</li>
            <li>Violates privacy or confidentiality rights</li>
          </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Intellectual Property</h2>
          <p>
            BackstageOS and its original content, features, and functionality are owned by BackstageOS, its creators, and other providers of such material and are protected by international copyright, trademark, and other intellectual property laws.
          </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Third-Party Services</h2>
          <p>
            BackstageOS may integrate with third-party services (payment processors, cloud providers, etc.). Your use of these services is subject to their terms of service and privacy policies. We are not responsible for their practices.
          </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Payment Terms</h2>
          <p>
            If you subscribe to paid features of BackstageOS:
          </p>
          <ul>
            <li>You authorize us to charge your payment method on a recurring basis</li>
            <li>You agree to keep your billing information current and accurate</li>
            <li>Refunds are subject to our refund policy</li>
            <li>We may change pricing with 30 days' notice</li>
          </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Termination</h2>
          <p>
            We may terminate or suspend your account and access to BackstageOS at any time, for any reason, with or without cause and without notice. Upon termination, you must cease use of the service. Your data may be deleted after a 30-day retention period.
          </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Limitation of Liability</h2>
          <p>
            In no event shall BackstageOS, its directors, employees, or agents be liable to you for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use BackstageOS.
          </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless BackstageOS from any claims, damages, or costs arising from your use of the service, violation of these terms, or violation of any third-party rights.
          </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Governing Law</h2>
          <p>
            These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which BackstageOS operates, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
          </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Entire Agreement</h2>
          <p>
            These terms and conditions constitute the entire agreement between you and BackstageOS regarding the use of the service and supersede all prior negotiations, representations, and agreements.
          </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Severability</h2>
          <p>
            If any provision of these terms is found to be invalid or unenforceable, that provision shall be severed, and the remaining provisions shall continue in full force and effect.
          </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Contact Us</h2>
          <p>
            If you have questions about these Terms of Service, please contact us at:
          </p>
          <p>
            <strong>BackstageOS Legal Team</strong><br />
            Email: legal@backstageos.com
          </p>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 mt-8">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Last updated: November 2025
          </p>
        </div>
      </div>
    </div>
    </Layout>
  );
}
