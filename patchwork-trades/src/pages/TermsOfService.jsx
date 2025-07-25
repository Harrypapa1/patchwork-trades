import React from 'react';

const TermsOfService = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
        <p className="text-gray-600 mb-8">Last updated: July 25, 2025</p>

        <div className="space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              Welcome to Patchwork Trades ("we," "our," or "us"). These Terms of Service ("Terms") govern your use of our website at https://patchworktrades.com and our services that connect customers with qualified tradespeople.
            </p>
            <p className="text-gray-700">
              By accessing or using Patchwork Trades, you agree to be bound by these Terms. If you disagree with any part of these terms, you may not access our service.
            </p>
          </section>

          {/* Platform Role */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Platform Role & Liability</h2>
            <p className="text-gray-700 mb-4">
              <strong>Patchwork Trades is a platform service only.</strong> We connect customers with independent tradespeople but do not provide the actual trade services ourselves.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800">
                <strong>Important:</strong> We are not responsible for the quality, safety, or completion of work performed by tradespeople. All work is carried out by independent contractors.
              </p>
            </div>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>We facilitate introductions between customers and tradespeople</li>
              <li>We provide a booking and communication platform</li>
              <li>We process payments and hold funds in escrow</li>
              <li>We are not liable for disputes regarding work quality or completion</li>
              <li>All tradespeople are independent contractors, not our employees</li>
            </ul>
          </section>

          {/* Commission & Fees */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Commission & Fees</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 font-semibold">
                Patchwork Trades charges a 5% commission on all completed jobs.
              </p>
            </div>
            <div className="space-y-3 text-gray-700">
              <p><strong>How it works:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Commission is automatically deducted from the final job payment</li>
                <li>Customers pay the full agreed amount</li>
                <li>Tradespeople receive 95% of the agreed amount</li>
                <li>Commission is only charged on completed jobs</li>
                <li>No commission is charged on cancelled jobs</li>
              </ul>
            </div>
          </section>

          {/* Cancellation Policy */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Cancellation Policy</h2>
            <p className="text-gray-700 mb-4">
              We understand that circumstances change. Our cancellation policy protects both customers and tradespeople fairly:
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-red-800 mb-2">Customer Cancellation Fees:</h3>
              <ul className="text-red-700 space-y-1">
                <li><strong>More than 7 days notice:</strong> 10% cancellation fee</li>
                <li><strong>2-7 days notice:</strong> 20% cancellation fee</li>
                <li><strong>Less than 2 days notice:</strong> 50% cancellation fee</li>
              </ul>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-orange-800 mb-2">Tradesman Cancellations:</h3>
              <ul className="text-orange-700 space-y-1">
                <li>May negatively impact reviews and future bookings</li>
                <li>Compensation may be deducted from future earnings</li>
                <li>Should only occur in genuine emergencies</li>
              </ul>
            </div>

            <p className="text-gray-700">
              <strong>Rationale:</strong> Cancellation fees compensate tradespeople for blocked calendar time, declined alternative work, and preparation time invested.
            </p>
          </section>

          {/* User Responsibilities */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. User Responsibilities</h2>
            
            <h3 className="text-lg font-medium text-gray-900 mb-3">For Customers:</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>Provide accurate job descriptions and requirements</li>
              <li>Be present and available during scheduled work times</li>
              <li>Provide safe access to work areas</li>
              <li>Pay agreed amounts promptly upon job completion</li>
              <li>Leave honest reviews based on actual experience</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-3">For Tradespeople:</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Maintain valid insurance and certifications as claimed</li>
              <li>Provide work to industry standards</li>
              <li>Honor agreed prices and completion dates</li>
              <li>Communicate professionally with customers</li>
              <li>Complete jobs as specified in the agreement</li>
            </ul>
          </section>

          {/* Payment Terms */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Payment Terms</h2>
            <div className="space-y-3 text-gray-700">
              <p><strong>Payment Process:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Payments are processed securely through Stripe</li>
                <li>Funds are held in escrow until job completion</li>
                <li>Payment is released when customer marks job as complete</li>
                <li>Disputes must be raised within 48 hours of completion</li>
                <li>Refunds for cancelled jobs processed within 3-5 business days</li>
              </ul>
            </div>
          </section>

          {/* Dispute Resolution */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Dispute Resolution</h2>
            <p className="text-gray-700 mb-4">
              While we strive to prevent disputes, we provide a fair resolution process:
            </p>
            <ol className="list-decimal list-inside text-gray-700 space-y-2">
              <li>Direct communication between customer and tradesperson is encouraged first</li>
              <li>If unresolved, contact our support team at support@patchworktrades.com</li>
              <li>We will mediate and make a fair determination based on evidence provided</li>
              <li>Our decision regarding payment disputes is final</li>
              <li>Serious disputes may result in account suspension or termination</li>
            </ol>
          </section>

          {/* Prohibited Uses */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Prohibited Uses</h2>
            <p className="text-gray-700 mb-4">You may not use Patchwork Trades:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>To circumvent our platform and avoid commission fees</li>
              <li>To post false or misleading information</li>
              <li>To harass, abuse, or discriminate against other users</li>
              <li>To engage in fraudulent activities</li>
              <li>To violate any applicable laws or regulations</li>
              <li>To damage our platform's reputation or functionality</li>
            </ul>
          </section>

          {/* Account Termination */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Account Termination</h2>
            <p className="text-gray-700 mb-4">
              We reserve the right to suspend or terminate accounts that violate these Terms, including:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Repeated policy violations</li>
              <li>Fraudulent activity or payment disputes</li>
              <li>Consistently poor reviews or professional conduct</li>
              <li>Attempts to circumvent platform fees</li>
            </ul>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Limitation of Liability</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700">
                <strong>To the maximum extent permitted by law:</strong> Patchwork Trades shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or use, arising from your use of our service. Our total liability shall not exceed the amount of fees paid to us in the 12 months preceding the claim.
              </p>
            </div>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Changes to Terms</h2>
            <p className="text-gray-700">
              We may update these Terms from time to time. We will notify users of any material changes by email or through prominent notices on our platform. Continued use of our service after changes constitutes acceptance of new Terms.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Governing Law</h2>
            <p className="text-gray-700">
              These Terms shall be governed by and construed in accordance with the laws of England and Wales. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Contact Us</h2>
            <p className="text-gray-700">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-blue-900">
                <strong>Email:</strong> support@patchworktrades.com<br />
                <strong>Website:</strong> https://patchworktrades.com
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

export default TermsOfService;