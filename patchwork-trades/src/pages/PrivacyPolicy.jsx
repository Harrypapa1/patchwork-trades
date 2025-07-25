import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">Last updated: July 25, 2025</p>

        <div className="space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              At Patchwork Trades, we are committed to protecting your privacy and personal data. This Privacy Policy explains how we collect, use, process, and protect your information when you use our platform at https://patchworktrades.com.
            </p>
            <p className="text-gray-700">
              This policy complies with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
            </p>
          </section>

          {/* Data Controller */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Data Controller</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-900">
                <strong>Patchwork Trades</strong> is the data controller responsible for your personal data.<br />
                <strong>Contact:</strong> support@patchworktrades.com
              </p>
            </div>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Information We Collect</h2>
            
            <h3 className="text-lg font-medium text-gray-900 mb-3">Personal Information:</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li><strong>Account Information:</strong> Name, email address, phone number</li>
              <li><strong>Profile Information:</strong> Profile photos, bio, trade specializations</li>
              <li><strong>Professional Details:</strong> Certifications, insurance status, years of experience</li>
              <li><strong>Location Data:</strong> Areas covered for services</li>
              <li><strong>Payment Information:</strong> Processed securely through Stripe (we don't store card details)</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Job-Related Information:</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li><strong>Job Details:</strong> Descriptions, photos, requirements, budgets</li>
              <li><strong>Communications:</strong> Messages, comments, and discussions between users</li>
              <li><strong>Booking Information:</strong> Dates, times, job status, completion records</li>
              <li><strong>Reviews and Ratings:</strong> Feedback provided by customers and tradespeople</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Technical Information:</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent on platform</li>
              <li><strong>Device Information:</strong> Browser type, operating system, IP address</li>
              <li><strong>Cookies:</strong> Small files to improve your experience (see our Cookie Policy)</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. How We Use Your Information</h2>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-green-800 mb-2">Legal Basis for Processing:</h3>
              <p className="text-green-700">
                We process your data based on legitimate interests, contract performance, and consent where required by law.
              </p>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-3">We use your information to:</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Provide our service:</strong> Connect customers with tradespeople, facilitate bookings</li>
              <li><strong>Process payments:</strong> Handle transactions, apply commission, process refunds</li>
              <li><strong>Communication:</strong> Send booking confirmations, updates, and support messages</li>
              <li><strong>Safety & Security:</strong> Verify identities, prevent fraud, resolve disputes</li>
              <li><strong>Platform improvement:</strong> Analyze usage patterns, improve features and user experience</li>
              <li><strong>Marketing:</strong> Send relevant updates about our service (with your consent)</li>
              <li><strong>Legal compliance:</strong> Meet regulatory requirements and respond to legal requests</li>
            </ul>
          </section>

          {/* How We Store Your Data */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. How We Store Your Data</h2>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-purple-800 mb-2">Data Storage:</h3>
              <p className="text-purple-700">
                Your data is stored securely using Google Firebase (Google Cloud Platform) with industry-standard encryption and security measures.
              </p>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Security Measures:</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>Data encrypted in transit and at rest</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication requirements</li>
              <li>Secure backup and recovery procedures</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Data Retention:</h3>
            <p className="text-gray-700 mb-2">We retain your data for as long as necessary to provide our service:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Active accounts:</strong> Data retained while account is active</li>
              <li><strong>Closed accounts:</strong> Most data deleted within 30 days</li>
              <li><strong>Transaction records:</strong> Kept for 7 years for tax and legal purposes</li>
              <li><strong>Support communications:</strong> Retained for 2 years</li>
            </ul>
          </section>

          {/* Who We Share Data With */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Who We Share Your Data With</h2>
            
            <p className="text-gray-700 mb-4">We only share your data when necessary to provide our service or as required by law:</p>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Service Providers:</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li><strong>Stripe:</strong> Payment processing (they have their own privacy policy)</li>
              <li><strong>Resend/Email providers:</strong> Sending notifications and communications</li>
              <li><strong>Google Firebase:</strong> Secure data storage and hosting</li>
              <li><strong>Netlify:</strong> Website hosting and deployment</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Other Users:</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>Profile information is visible to other users for booking purposes</li>
              <li>Job details and communications are shared between customer and tradesperson</li>
              <li>Reviews and ratings are publicly visible</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Legal Requirements:</h3>
            <p className="text-gray-700">
              We may disclose your data if required by law, court order, or to protect our legal rights and the safety of our users.
            </p>
          </section>

          {/* International Transfers */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. International Data Transfers</h2>
            <p className="text-gray-700 mb-4">
              Some of our service providers (like Google Firebase and Stripe) may process your data outside the UK/EEA. When this happens:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>We ensure adequate protection through approved mechanisms</li>
              <li>Providers comply with GDPR-equivalent standards</li>
              <li>Data is protected by appropriate safeguards and security measures</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Your Rights Under UK GDPR</h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-yellow-800 mb-2">You have the right to:</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">📋 Access</h4>
                <p className="text-gray-700 text-sm mb-4">Request a copy of your personal data</p>
                
                <h4 className="font-medium text-gray-900 mb-2">✏️ Rectification</h4>
                <p className="text-gray-700 text-sm mb-4">Correct inaccurate or incomplete data</p>
                
                <h4 className="font-medium text-gray-900 mb-2">🗑️ Erasure</h4>
                <p className="text-gray-700 text-sm mb-4">Request deletion of your data</p>
                
                <h4 className="font-medium text-gray-900 mb-2">⏸️ Restrict Processing</h4>
                <p className="text-gray-700 text-sm">Limit how we use your data</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">📤 Data Portability</h4>
                <p className="text-gray-700 text-sm mb-4">Receive your data in a portable format</p>
                
                <h4 className="font-medium text-gray-900 mb-2">🚫 Object</h4>
                <p className="text-gray-700 text-sm mb-4">Object to processing for legitimate interests</p>
                
                <h4 className="font-medium text-gray-900 mb-2">✋ Withdraw Consent</h4>
                <p className="text-gray-700 text-sm mb-4">Withdraw consent where applicable</p>
                
                <h4 className="font-medium text-gray-900 mb-2">⚖️ Complain</h4>
                <p className="text-gray-700 text-sm">Lodge a complaint with the ICO</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-blue-800">
                <strong>To exercise your rights:</strong> Contact us at support@patchworktrades.com. We will respond within 30 days.
              </p>
            </div>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Children's Privacy</h2>
            <p className="text-gray-700">
              Our service is not intended for children under 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          {/* Marketing Communications */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Marketing Communications</h2>
            <p className="text-gray-700 mb-4">
              We may send you marketing emails about our services, new features, and relevant updates. You can:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Opt out at any time using the unsubscribe link in emails</li>
              <li>Update your preferences in your account settings</li>
              <li>Contact us to stop all marketing communications</li>
            </ul>
          </section>

          {/* Changes to Privacy Policy */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Changes to This Privacy Policy</h2>
            <p className="text-gray-700">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by email or through prominent notices on our platform. The updated policy will be effective from the date posted.
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions about this Privacy Policy or how we handle your data, please contact us:
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-900">
                <strong>Email:</strong> support@patchworktrades.com<br />
                <strong>Website:</strong> https://patchworktrades.com
              </p>
            </div>
          </section>

          {/* ICO Information */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Data Protection Authority</h2>
            <p className="text-gray-700 mb-4">
              If you have concerns about how we handle your data, you can lodge a complaint with the UK's data protection authority:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700">
                <strong>Information Commissioner's Office (ICO)</strong><br />
                Website: https://ico.org.uk<br />
                Helpline: 0303 123 1113
              </p>
            </div>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-gray-500 text-sm">
            © 2025 Patchwork Trades. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;