import React from 'react';

const CookiePolicy = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Cookie Policy</h1>
        <p className="text-gray-600 mb-8">Last updated: July 25, 2025</p>

        <div className="space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. What Are Cookies?</h2>
            <p className="text-gray-700 mb-4">
              Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They help websites remember your preferences and improve your browsing experience.
            </p>
            <p className="text-gray-700">
              This Cookie Policy explains how Patchwork Trades uses cookies and similar technologies on our website at https://patchworktrades.com.
            </p>
          </section>

          {/* Types of Cookies We Use */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Types of Cookies We Use</h2>
            
            <div className="space-y-6">
              {/* Essential Cookies */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-red-800 mb-2">🔒 Essential Cookies (Always Active)</h3>
                <p className="text-red-700 mb-3">
                  These cookies are necessary for our website to function properly. They cannot be disabled.
                </p>
                <div className="text-red-700 text-sm">
                  <p><strong>Purpose:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Keep you logged in to your account</li>
                    <li>Remember your authentication status</li>
                    <li>Maintain your session during browsing</li>
                    <li>Ensure website security and prevent fraud</li>
                    <li>Remember your preferences during your visit</li>
                  </ul>
                  <p className="mt-2"><strong>Examples:</strong> Authentication tokens, session identifiers, security cookies</p>
                </div>
              </div>

              {/* Functional Cookies */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">⚙️ Functional Cookies</h3>
                <p className="text-blue-700 mb-3">
                  These cookies enhance your experience by remembering your choices and preferences.
                </p>
                <div className="text-blue-700 text-sm">
                  <p><strong>Purpose:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Remember your preferred language settings</li>
                    <li>Save your location/area preferences for searches</li>
                    <li>Remember notification preferences</li>
                    <li>Improve loading times for returning visitors</li>
                  </ul>
                  <p className="mt-2"><strong>Duration:</strong> Usually 30 days to 1 year</p>
                </div>
              </div>

              {/* Performance Cookies */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-800 mb-2">📊 Performance Cookies</h3>
                <p className="text-green-700 mb-3">
                  These cookies help us understand how visitors use our website so we can improve it.
                </p>
                <div className="text-green-700 text-sm">
                  <p><strong>Purpose:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Count visitors and page views</li>
                    <li>Track which pages are most popular</li>
                    <li>Identify technical issues and errors</li>
                    <li>Measure website performance and loading speeds</li>
                    <li>Understand user journey and behavior patterns</li>
                  </ul>
                  <p className="mt-2"><strong>Note:</strong> This information is collected anonymously and cannot identify you personally</p>
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">🎯 Marketing Cookies (Optional)</h3>
                <p className="text-yellow-700 mb-3">
                  Currently, we do not use marketing or advertising cookies on our platform.
                </p>
                <div className="text-yellow-700 text-sm">
                  <p><strong>Future Use:</strong></p>
                  <p>If we decide to use marketing cookies in the future, we will:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Ask for your explicit consent first</li>
                    <li>Update this policy with full details</li>
                    <li>Provide easy opt-out options</li>
                    <li>Only work with reputable advertising partners</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Third-Party Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Third-Party Services</h2>
            <p className="text-gray-700 mb-4">
              Some features on our website use services from trusted third-party providers. These may set their own cookies:
            </p>
            
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">🔒 Firebase Authentication (Google)</h4>
                <p className="text-gray-700 text-sm mb-2">
                  <strong>Purpose:</strong> Secure user login and account management
                </p>
                <p className="text-gray-700 text-sm">
                  <strong>Privacy Policy:</strong> <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">💳 Stripe Payment Processing</h4>
                <p className="text-gray-700 text-sm mb-2">
                  <strong>Purpose:</strong> Secure payment processing and fraud prevention
                </p>
                <p className="text-gray-700 text-sm">
                  <strong>Privacy Policy:</strong> <a href="https://stripe.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Stripe Privacy Policy</a>
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">🌐 Netlify Hosting</h4>
                <p className="text-gray-700 text-sm mb-2">
                  <strong>Purpose:</strong> Website hosting and performance optimization
                </p>
                <p className="text-gray-700 text-sm">
                  <strong>Privacy Policy:</strong> <a href="https://www.netlify.com/privacy/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Netlify Privacy Policy</a>
                </p>
              </div>
            </div>
          </section>

          {/* How to Manage Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. How to Manage Cookies</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">⚠️ Important Note</h3>
              <p className="text-blue-700">
                While you can control most cookies through your browser settings, disabling essential cookies may prevent our website from working properly. You may not be able to log in, book services, or access your account.
              </p>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Browser Settings:</h3>
            <p className="text-gray-700 mb-4">
              You can control cookies through your browser settings. Here are links to cookie management for popular browsers:
            </p>
            
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <p className="text-gray-700">
                  <strong>🌐 Chrome:</strong> <a href="https://support.google.com/chrome/answer/95647" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Cookie settings</a>
                </p>
                <p className="text-gray-700">
                  <strong>🦊 Firefox:</strong> <a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Cookie settings</a>
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-gray-700">
                  <strong>🔷 Safari:</strong> <a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Cookie settings</a>
                </p>
                <p className="text-gray-700">
                  <strong>🌐 Edge:</strong> <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Cookie settings</a>
                </p>
              </div>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Mobile Devices:</h3>
            <p className="text-gray-700 mb-4">
              On mobile devices, cookie management is usually found in your browser app's settings under "Privacy" or "Site Settings."
            </p>
          </section>

          {/* Cookie Consent */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Your Consent</h2>
            <p className="text-gray-700 mb-4">
              By continuing to use our website, you consent to our use of cookies as described in this policy. We may ask for your explicit consent for certain types of cookies when required by law.
            </p>
            
            <div className="space-y-3">
              <p className="text-gray-700">✅ <strong>Essential cookies:</strong> No consent required (necessary for service)</p>
              <p className="text-gray-700">✅ <strong>Functional cookies:</strong> Implied consent through continued use</p>
              <p className="text-gray-700">✅ <strong>Performance cookies:</strong> Implied consent through continued use</p>
              <p className="text-gray-700">⏸️ <strong>Marketing cookies:</strong> Currently not used (would require explicit consent)</p>
            </div>
          </section>

          {/* Data Protection */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Data Protection & Security</h2>
            <p className="text-gray-700 mb-4">
              We take the security of your information seriously:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Cookies are transmitted securely using encryption</li>
              <li>We regularly review and update our cookie practices</li>
              <li>We only use cookies that are necessary or beneficial to your experience</li>
              <li>We work with trusted, reputable third-party service providers</li>
              <li>We comply with UK GDPR and data protection laws</li>
            </ul>
          </section>

          {/* Updates to Cookie Policy */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Updates to This Policy</h2>
            <p className="text-gray-700">
              We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our practices. We will notify you of any significant changes by updating the "Last updated" date at the top of this policy or by sending you a notification.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Questions & Contact</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions about our use of cookies or this Cookie Policy, please contact us:
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-900">
                <strong>Email:</strong> support@patchworktrades.com<br />
                <strong>Website:</strong> https://patchworktrades.com
              </p>
            </div>
          </section>

          {/* More Information */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. More Information</h2>
            <p className="text-gray-700 mb-4">
              For more information about cookies and online privacy, you can visit:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><a href="https://ico.org.uk/for-the-public/online/cookies/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">ICO guidance on cookies</a></li>
              <li><a href="https://www.allaboutcookies.org/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">All About Cookies</a></li>
              <li><a href="https://www.youronlinechoices.com/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Your Online Choices</a></li>
            </ul>
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

export default CookiePolicy;