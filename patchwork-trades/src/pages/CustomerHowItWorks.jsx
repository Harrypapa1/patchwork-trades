import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CustomerHowItWorks = () => {
  const navigate = useNavigate();
  // Simulated auth state - in real app this would come from useAuth()
  const [userType] = useState('customer'); // Change to 'tradesman' to test restriction
  
  const handleNavigation = (path) => {
    navigate(path);
  };

  // Redirect if not a customer
  if (userType !== 'customer') {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Access Restricted</h2>
          <p className="text-red-600 mb-4">This page is only available to customers.</p>
          <button
            onClick={() => handleNavigation('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">How Patchwork Trades Works</h1>
        <p className="text-xl text-gray-600">Get quality tradesmen for your home projects in 4 simple steps</p>
      </div>

      {/* Quick Start CTA */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-center">
        <h2 className="text-2xl font-semibold text-blue-800 mb-3">Ready to get started?</h2>
        <p className="text-blue-600 mb-4">Find available tradesmen in your area and request quotes today</p>
        <button
          onClick={() => handleNavigation('/browse')}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium text-lg"
        >
          Browse Tradesmen →
        </button>
      </div>

      {/* Steps Section */}
      <div className="space-y-8">
        {/* Step 1 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-blue-600 text-white p-6">
            <div className="flex items-center">
              <div className="bg-white text-blue-600 rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold mr-4">
                1
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Find Available Tradesmen</h2>
                <p className="text-blue-100">Browse verified professionals in your area</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-900">What you can do:</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Filter by trade type (Electrician, Plumber, Carpenter, etc.)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Select dates when you need work done</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>See real-time availability and time slots</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>View profiles, ratings, and previous work</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Check insurance status and qualifications</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Pro Tips:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Green calendar dates have available tradesmen</li>
                  <li>• You can select multiple trade types</li>
                  <li>• Higher-rated tradesmen appear first</li>
                  <li>• Check portfolios to see their work quality</li>
                  <li>• "Fully Insured" tradesmen offer extra protection</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => handleNavigation('/browse')}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Start Browsing →
              </button>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-green-600 text-white p-6">
            <div className="flex items-center">
              <div className="bg-white text-green-600 rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold mr-4">
                2
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Request a Quote</h2>
                <p className="text-green-100">Tell tradesmen exactly what you need</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-900">Quote Request includes:</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Job title and detailed description</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Photo uploads (up to 3 images)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Your specific time slot preference</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Budget expectations (optional)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Urgency level and additional notes</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Writing Great Requests:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Be specific about the problem</li>
                  <li>• Include photos whenever possible</li>
                  <li>• Mention any materials you already have</li>
                  <li>• Note access restrictions (parking, stairs, etc.)</li>
                  <li>• Set realistic budget expectations</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <p className="text-blue-800 text-sm">
                <strong>What happens next:</strong> Your request goes directly to the tradesman, who can either accept their standard rate, propose a custom quote, or ask questions through our messaging system.
              </p>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-purple-600 text-white p-6">
            <div className="flex items-center">
              <div className="bg-white text-purple-600 rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold mr-4">
                3
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Negotiate & Agree</h2>
                <p className="text-purple-100">Work with tradesmen to finalize details</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-900">Quote Response Options:</h3>
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center text-green-700 mb-1">
                      <span className="font-medium">✓ Standard Rate Accepted</span>
                    </div>
                    <p className="text-sm text-gray-600">Tradesman accepts your job at their hourly rate</p>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center text-blue-700 mb-1">
                      <span className="font-medium">💼 Custom Quote</span>
                    </div>
                    <p className="text-sm text-gray-600">Fixed price quote based on your specific job</p>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center text-orange-700 mb-1">
                      <span className="font-medium">💬 Discussion</span>
                    </div>
                    <p className="text-sm text-gray-600">Questions and clarifications through messaging</p>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="bg-orange-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-orange-800 mb-2">You can:</h4>
                  <ul className="text-sm text-orange-700 space-y-1">
                    <li>• Accept quotes you're happy with</li>
                    <li>• Make counter-offers with reasoning</li>
                    <li>• Ask questions through comments</li>
                    <li>• Negotiate until you both agree</li>
                    <li>• Reject quotes that don't work</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Track everything</strong> in your Quote Requests page - see status updates, messages, and manage all your negotiations in one place.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-red-600 text-white p-6">
            <div className="flex items-center">
              <div className="bg-white text-red-600 rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold mr-4">
                4
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Pay & Get Work Done</h2>
                <p className="text-red-100">Secure payment, professional work, guaranteed results</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-900">Payment Process:</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Secure Payment</p>
                      <p className="text-sm text-gray-600">Pay the agreed amount through our secure checkout</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Work Begins</p>
                      <p className="text-sm text-gray-600">Job moves to Active Jobs - track progress and communicate</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Completion & Review</p>
                      <p className="text-sm text-gray-600">Approve work and leave feedback for future customers</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-red-800 mb-2">Your Protection:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Secure payment processing</li>
                    <li>• Verified tradesman profiles</li>
                    <li>• Work progress tracking</li>
                    <li>• Review and rating system</li>
                    <li>• Customer support available</li>
                  </ul>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">After Completion:</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Rate your experience (1-5 stars)</li>
                    <li>• Leave detailed review</li>
                    <li>• Use "Hire Again" for future jobs</li>
                    <li>• Build relationships with trusted tradesmen</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Features */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-8">
        <h2 className="text-2xl font-semibold mb-6 text-center">Additional Features</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📅</span>
            </div>
            <h3 className="font-medium mb-2">Weekly Jobs Overview</h3>
            <p className="text-sm text-gray-600">See your upcoming jobs for this week and completed work from last week</p>
          </div>
          
          <div className="text-center">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="font-medium mb-2">Direct Messaging</h3>
            <p className="text-sm text-gray-600">Chat directly with tradesmen throughout the quote and job process</p>
          </div>
          
          <div className="text-center">
            <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🔄</span>
            </div>
            <h3 className="font-medium mb-2">Hire Again</h3>
            <p className="text-sm text-gray-600">Easily book the same tradesman for future jobs with one click</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 mt-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to get your first job done?</h2>
        <p className="text-blue-100 mb-6">Join thousands of customers who've found reliable tradesmen through Patchwork Trades</p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => handleNavigation('/browse')}
            className="bg-white text-blue-600 px-8 py-3 rounded-lg hover:bg-gray-100 font-medium"
          >
            Browse Tradesmen
          </button>
          <button
            onClick={() => handleNavigation('/quote-requests')}
            className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-400 font-medium border border-blue-400"
          >
            View My Requests
          </button>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-8">
        <h3 className="text-lg font-semibold mb-4 text-center">Need Help?</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">Common Questions:</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• How do I know tradesmen are reliable?</li>
              <li>• What if I'm not happy with the work?</li>
              <li>• Can I change my mind after paying?</li>
              <li>• How do time slots work?</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Get Support:</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• Check our FAQ section</li>
              <li>• Contact customer support</li>
              <li>• Read customer reviews</li>
              <li>• Follow platform updates</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerHowItWorks;
