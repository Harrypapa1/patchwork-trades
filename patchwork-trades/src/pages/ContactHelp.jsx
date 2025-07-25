import React, { useState } from 'react';

const ContactHelp = () => {
  const [openFAQ, setOpenFAQ] = useState(null);

  const toggleFAQ = (index) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const faqs = [
    {
      category: "Getting Started",
      questions: [
        {
          question: "How do I book a tradesman?",
          answer: "1. Browse available tradesmen in your area\n2. Click 'Request Quote' on a tradesman's profile\n3. Fill in your job details, photos, and requirements\n4. Submit your request and wait for the tradesman to respond\n5. Negotiate the price if needed\n6. Accept the quote to book the job"
        },
        {
          question: "How do I sign up as a tradesman?",
          answer: "1. Click 'Sign Up' and select 'Tradesman'\n2. Provide your basic information and trade type\n3. Complete your profile with certifications, experience, and hourly rate\n4. Upload portfolio photos of your work\n5. Set your availability calendar\n6. Start receiving booking requests!"
        },
        {
          question: "Is Patchwork Trades free to use?",
          answer: "Yes! It's free to sign up and browse tradesmen. Customers don't pay any booking fees. Tradesmen only pay a 5% commission on completed jobs - much lower than competitors who charge 15-20%."
        },
        {
          question: "How do I know if a tradesman is qualified?",
          answer: "All tradesmen provide information about their:\n• Years of experience\n• Certifications and qualifications\n• Insurance status (public liability, professional indemnity)\n• Portfolio of previous work\n• Customer reviews and ratings\n\nWe encourage customers to verify credentials directly with tradesmen."
        }
      ]
    },
    {
      category: "Booking & Pricing",
      questions: [
        {
          question: "How does the pricing work?",
          answer: "1. Each tradesman sets their own hourly rate\n2. You can request quotes for fixed-price jobs\n3. Negotiate prices through our platform\n4. Final price is agreed before work begins\n5. Payment is held securely until job completion\n6. Tradesmen receive 95% (we take 5% commission)"
        },
        {
          question: "Can I negotiate the price?",
          answer: "Absolutely! Our platform includes a professional negotiation system:\n• Tradesman sends initial quote\n• You can accept, reject, or counter-offer\n• Provide reasoning for your counter-offer\n• Continue negotiating until both parties agree\n• All negotiations are recorded for transparency"
        },
        {
          question: "When do I pay?",
          answer: "Payment is taken when you accept a quote, but held securely until:\n• The job is marked as complete by both parties\n• You're satisfied with the work\n• Any disputes are resolved\n\nThis protects both customers and tradesmen."
        },
        {
          question: "What payment methods do you accept?",
          answer: "We accept all major payment methods through Stripe:\n• Debit cards (Visa, Mastercard)\n• Credit cards (Visa, Mastercard, American Express)\n• Digital wallets (Apple Pay, Google Pay)\n• Bank transfers (where supported)\n\nAll payments are processed securely with industry-standard encryption."
        }
      ]
    },
    {
      category: "Cancellations & Changes",
      questions: [
        {
          question: "What are the cancellation fees?",
          answer: "Our fair cancellation policy protects both parties:\n\n📅 More than 7 days notice: 10% fee\n📅 2-7 days notice: 20% fee\n📅 Less than 2 days notice: 50% fee\n\nThese fees compensate tradesmen for:\n• Blocked calendar time\n• Turning down other work\n• Preparation time invested\n\nRemaining amount is refunded within 3-5 business days."
        },
        {
          question: "Can I reschedule a booking?",
          answer: "Yes! Contact your tradesman directly through the job comments to discuss rescheduling. If you both agree to a new date:\n• No cancellation fees apply\n• Job continues as normal\n• New date is updated in the system\n\nIf you can't agree on a new date, standard cancellation terms apply."
        },
        {
          question: "What if the tradesman cancels?",
          answer: "If a tradesman cancels:\n• You receive a full refund immediately\n• The cancellation is recorded on their profile\n• It may affect their future reviews and bookings\n• We may provide compensation for inconvenience\n\nProfessional tradesmen rarely cancel except for genuine emergencies."
        },
        {
          question: "Can I modify my job requirements after booking?",
          answer: "Minor changes can be discussed directly with your tradesman. For major changes:\n• Use the job comments to discuss modifications\n• Tradesman may provide a new quote for additional work\n• Both parties must agree to any price changes\n• Significant changes may require creating a new booking"
        }
      ]
    },
    {
      category: "During & After Work",
      questions: [
        {
          question: "How do I communicate with my tradesman?",
          answer: "Each job has its own dedicated comment thread where you can:\n• Ask questions about the work\n• Share additional requirements or photos\n• Discuss scheduling and timing\n• Track progress updates\n• Resolve any issues\n\nAll communication is recorded for transparency and support purposes."
        },
        {
          question: "What if I'm not satisfied with the work?",
          answer: "If you're not satisfied:\n1. First, discuss concerns directly with the tradesman\n2. Use the job comments to document issues\n3. Contact our support team if you can't resolve it\n4. We'll mediate and make a fair determination\n5. Refunds or additional work may be arranged\n6. Serious issues may result in account action"
        },
        {
          question: "How do I leave a review?",
          answer: "After job completion:\n1. You'll see a 'Leave Review' button in your Booked Jobs\n2. Rate the tradesman (1-5 stars)\n3. Write honest feedback about:\n   • Work quality and professionalism\n   • Timeliness and communication\n   • Value for money\n   • Overall experience\n4. Reviews help other customers make informed decisions"
        },
        {
          question: "Can I hire the same tradesman again?",
          answer: "Yes! If you had a good experience:\n1. Click 'Hire Again' in your completed jobs\n2. This takes you directly to their profile\n3. You can request another quote immediately\n4. Previous good relationships often lead to better prices\n5. Build ongoing relationships with trusted tradesmen"
        }
      ]
    },
    {
      category: "Safety & Trust",
      questions: [
        {
          question: "How do you verify tradesmen?",
          answer: "While tradesmen provide qualification details, we recommend customers:\n• Check insurance certificates directly\n• Verify certifications with issuing bodies\n• Ask for references from recent work\n• Start with smaller jobs to build trust\n• Report any concerns to our support team\n\nWe're working on enhanced verification features."
        },
        {
          question: "What if there's a dispute?",
          answer: "Our dispute resolution process:\n1. Direct communication is encouraged first\n2. Document everything in job comments\n3. Contact support@patchworktrades.com with details\n4. We review all evidence and communications\n5. We make a fair determination within 5-7 business days\n6. Our decision on payment disputes is final\n7. Serious disputes may result in account suspension"
        },
        {
          question: "Is my personal information safe?",
          answer: "Yes, we take privacy seriously:\n• Data encrypted and stored securely with Firebase\n• Payment details handled by Stripe (never stored by us)\n• Personal information only shared between job participants\n• Full Privacy Policy available on our website\n• GDPR compliant with user rights protection\n• You can request data deletion at any time"
        },
        {
          question: "What insurance should tradesmen have?",
          answer: "We recommend tradesmen have:\n• Public Liability Insurance (minimum £1M)\n• Professional Indemnity Insurance (where applicable)\n• Employer's Liability (if they have employees)\n• Trade-specific insurance (e.g., Gas Safe for gas work)\n\nCustomers should verify insurance directly before work begins."
        }
      ]
    },
    {
      category: "Technical Issues",
      questions: [
        {
          question: "I can't log in to my account",
          answer: "Try these steps:\n1. Check your email and password are correct\n2. Use 'Forgot Password' to reset if needed\n3. Clear your browser cache and cookies\n4. Try a different browser or device\n5. Check if you signed up as Customer or Tradesman\n6. Contact support if still having issues"
        },
        {
          question: "Photos won't upload",
          answer: "Common photo upload issues:\n• File size too large (max 5MB per image)\n• Unsupported format (use JPG, PNG, or GIF)\n• Slow internet connection\n• Browser issues (try refreshing or different browser)\n• Clear browser cache and try again\n\nContact support if problems persist."
        },
        {
          question: "The website isn't working properly",
          answer: "Try these troubleshooting steps:\n1. Refresh the page (Ctrl+F5 or Cmd+Shift+R)\n2. Clear browser cache and cookies\n3. Try a different browser (Chrome, Firefox, Safari)\n4. Check your internet connection\n5. Try on a different device\n6. Contact support with details of the problem"
        }
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Contact & Help</h1>
        
        {/* Contact Information */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Get in Touch</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Support Email */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="text-3xl mr-3">📧</div>
                <h3 className="text-lg font-semibold text-blue-800">Email Support</h3>
              </div>
              <p className="text-blue-700 mb-3">
                For all questions, issues, or support requests:
              </p>
              <p className="text-blue-900 font-semibold text-lg">
                support@patchworktrades.com
              </p>
              <p className="text-blue-600 text-sm mt-2">
                We aim to respond within 24 hours during business days
              </p>
            </div>

            {/* Response Times */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="text-3xl mr-3">⏰</div>
                <h3 className="text-lg font-semibold text-green-800">Response Times</h3>
              </div>
              <div className="text-green-700 space-y-2">
                <p><strong>General inquiries:</strong> Within 24 hours</p>
                <p><strong>Technical issues:</strong> Within 12 hours</p>
                <p><strong>Payment disputes:</strong> Within 48 hours</p>
                <p><strong>Urgent safety concerns:</strong> Within 2 hours</p>
              </div>
            </div>
          </div>

          {/* When to Contact Us */}
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-3">When to Contact Support</h3>
            <div className="grid md:grid-cols-2 gap-4 text-yellow-700">
              <div>
                <p className="font-medium mb-2">Technical Issues:</p>
                <ul className="text-sm space-y-1">
                  <li>• Login or account problems</li>
                  <li>• Website not working properly</li>
                  <li>• Payment processing issues</li>
                  <li>• Photo upload failures</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">Disputes & Concerns:</p>
                <ul className="text-sm space-y-1">
                  <li>• Work quality disputes</li>
                  <li>• Payment disagreements</li>
                  <li>• Safety or conduct concerns</li>
                  <li>• Cancellation issues</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Frequently Asked Questions</h2>
          
          {faqs.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-3">
                  {category.category}
                </span>
              </h3>
              
              <div className="space-y-3">
                {category.questions.map((faq, faqIndex) => {
                  const uniqueIndex = `${categoryIndex}-${faqIndex}`;
                  return (
                    <div key={uniqueIndex} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleFAQ(uniqueIndex)}
                        className="w-full px-6 py-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium text-gray-900 pr-4">
                            {faq.question}
                          </h4>
                          <span className="text-gray-500 text-xl">
                            {openFAQ === uniqueIndex ? '−' : '+'}
                          </span>
                        </div>
                      </button>
                      
                      {openFAQ === uniqueIndex && (
                        <div className="px-6 pb-4">
                          <div className="border-t border-gray-100 pt-4">
                            <p className="text-gray-700 whitespace-pre-line">
                              {faq.answer}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* Still Need Help */}
        <section className="mt-12 bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Still Need Help?</h3>
          <p className="text-gray-700 mb-4">
            Can't find the answer you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a 
              href="mailto:support@patchworktrades.com"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Email Support Team
            </a>
            <p className="text-gray-600 text-sm">
              or send us an email at: <strong>support@patchworktrades.com</strong>
            </p>
          </div>
        </section>

        {/* Platform Information */}
        <section className="mt-12 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">About Patchwork Trades</h3>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl mb-2">🔧</div>
              <h4 className="font-medium text-gray-900">5% Commission</h4>
              <p className="text-gray-600 text-sm">Much lower than competitors</p>
            </div>
            <div>
              <div className="text-2xl mb-2">🛡️</div>
              <h4 className="font-medium text-gray-900">Secure Platform</h4>
              <p className="text-gray-600 text-sm">Your data and payments protected</p>
            </div>
            <div>
              <div className="text-2xl mb-2">🤝</div>
              <h4 className="font-medium text-gray-900">Fair Policies</h4>
              <p className="text-gray-600 text-sm">Protecting both customers and tradesmen</p>
            </div>
          </div>
        </section>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-gray-500 text-sm">
            © 2025 Patchwork Trades. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContactHelp;