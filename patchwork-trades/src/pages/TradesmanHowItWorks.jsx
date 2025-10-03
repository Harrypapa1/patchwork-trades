import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TradesmanHowItWorks = () => {
  const navigate = useNavigate();
  const [userType] = useState('tradesman');
  
  const handleNavigation = (path) => {
    navigate(path);
  };

  if (userType !== 'tradesman') {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Access Restricted</h2>
          <p className="text-red-600 mb-4">This page is only available to tradesmen.</p>
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
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">How to Grow Your Trade Business</h1>
        <p className="text-xl text-gray-600">Build your professional reputation and earn more through Patchwork Trades</p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-center">
        <h2 className="text-2xl font-semibold text-green-800 mb-3">Start earning today!</h2>
        <p className="text-green-600 mb-4">Set up your profile and availability to receive your first quote requests</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => handleNavigation('/manage-availability')}
            className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-medium"
          >
            Set Availability →
          </button>
          <button
            onClick={() => handleNavigation('/earnings-overview')}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            View Earnings →
          </button>
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-green-600 text-white p-6">
            <div className="flex items-center">
              <div className="bg-white text-green-600 rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold mr-4">
                1
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Build Your Professional Profile</h2>
                <p className="text-green-100">Showcase your skills and attract quality customers</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-900">Essential Profile Elements:</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Professional photo and trade type</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Years of experience and hourly rate</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Insurance status and certifications</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Services offered and specializations</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Work portfolio with photos</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Profile Success Tips:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Use a clear, professional photo</li>
                  <li>• Set competitive but fair hourly rates</li>
                  <li>• "Fully Insured" status attracts more customers</li>
                  <li>• Upload high-quality work examples</li>
                  <li>• List all certifications and qualifications</li>
                  <li>• Update your bio with personality and expertise</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <p className="text-blue-800 text-sm">
                <strong>Professional Tip:</strong> Complete profiles with insurance status and work portfolios receive 3x more quote requests than basic profiles.
              </p>
            </div>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => handleNavigation('/tradesman-dashboard')}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
              >
                Edit My Profile →
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-blue-600 text-white p-6">
            <div className="flex items-center">
              <div className="bg-white text-blue-600 rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold mr-4">
                2
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Set Your Availability</h2>
                <p className="text-blue-100">Control when you work with flexible time slots</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-900">Three Daily Time Slots:</h3>
                <div className="space-y-3">
                  <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                    <div className="flex items-center text-blue-800 mb-1">
                      <span className="font-medium">🌅 Morning (9am-1pm)</span>
                    </div>
                    <p className="text-sm text-blue-600">4 hours - Perfect for earlier starts</p>
                  </div>
                  
                  <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                    <div className="flex items-center text-blue-800 mb-1">
                      <span className="font-medium">☀️ Afternoon (1pm-5pm)</span>
                    </div>
                    <p className="text-sm text-blue-600">4 hours - Most popular time slot</p>
                  </div>
                  
                  <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                    <div className="flex items-center text-blue-800 mb-1">
                      <span className="font-medium">🌆 Evening (5pm-8pm)</span>
                    </div>
                    <p className="text-sm text-blue-600">3 hours - After-work convenience</p>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-gray-800 mb-2">Availability Strategy:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Click time slots to toggle availability</li>
                    <li>• Set different days for different services</li>
                    <li>• Mobile-optimized calendar for on-the-go updates</li>
                    <li>• See booked jobs (red) vs available slots (green)</li>
                    <li>• More available slots = more quote requests</li>
                  </ul>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">💡 Earning Tip:</h4>
                  <p className="text-sm text-yellow-700">
                    Tradesmen with consistent availability across multiple time slots earn 40% more than those with limited availability.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => handleNavigation('/manage-availability')}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Manage Availability →
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-purple-600 text-white p-6">
            <div className="flex items-center">
              <div className="bg-white text-purple-600 rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold mr-4">
                3
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Respond to Quote Requests</h2>
                <p className="text-purple-100">Win jobs with smart quoting strategies</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-900">Response Options:</h3>
                <div className="space-y-4">
                  <div className="border border-green-200 rounded-lg p-3 bg-green-50">
                    <div className="flex items-center text-green-700 mb-1">
                      <span className="font-medium">✅ Accept Standard Rate</span>
                    </div>
                    <p className="text-sm text-green-600">Use your hourly rate for straightforward jobs</p>
                  </div>
                  
                  <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                    <div className="flex items-center text-blue-700 mb-1">
                      <span className="font-medium">💼 Custom Quote</span>
                    </div>
                    <p className="text-sm text-blue-600">Fixed price for complex or material-heavy jobs</p>
                  </div>
                  
                  <div className="border border-orange-200 rounded-lg p-3 bg-orange-50">
                    <div className="flex items-center text-orange-700 mb-1">
                      <span className="font-medium">💬 Ask Questions</span>
                    </div>
                    <p className="text-sm text-orange-600">Clarify details before quoting</p>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="bg-purple-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-purple-800 mb-2">Winning Quote Strategies:</h4>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>• Respond quickly (within 2 hours when possible)</li>
                    <li>• Ask clarifying questions to show expertise</li>
                    <li>• Explain your pricing and what's included</li>
                    <li>• Mention relevant experience or certifications</li>
                    <li>• Be open to negotiation on larger jobs</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">Quote Request Details Include:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Job description and photos</li>
                    <li>• Customer's budget expectations</li>
                    <li>• Urgency level and preferred time slot</li>
                    <li>• Customer location and access notes</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => handleNavigation('/quote-requests')}
                className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700"
              >
                View Quote Requests →
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-red-600 text-white p-6">
            <div className="flex items-center">
              <div className="bg-white text-red-600 rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold mr-4">
                4
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Complete Jobs & Get Paid</h2>
                <p className="text-red-100">Deliver quality work and build your reputation</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-900">Job Workflow:</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Customer Pays</p>
                      <p className="text-sm text-gray-600">Quote accepted → customer pays → job starts</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Track Progress</p>
                      <p className="text-sm text-gray-600">Update job status and add progress notes</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Complete & Review</p>
                      <p className="text-sm text-gray-600">Mark complete, get customer approval and reviews</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                      4
                    </div>
                    <div>
                      <p className="font-medium">Payment Processing</p>
                      <p className="text-sm text-gray-600">Automatic payment to your bank account</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-green-800 mb-2">Your Benefits:</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Payment guaranteed before work starts</li>
                    <li>• Track all earnings in one dashboard</li>
                    <li>• Build review history for future jobs</li>
                    <li>• "Hire Again" feature for repeat customers</li>
                    <li>• Professional payment processing</li>
                  </ul>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">Quality Standards:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Communicate clearly throughout the job</li>
                    <li>• Arrive on time for your booked slot</li>
                    <li>• Take before/after photos when helpful</li>
                    <li>• Clean up and leave areas tidy</li>
                    <li>• Follow up to ensure customer satisfaction</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => handleNavigation('/active-jobs')}
                className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
              >
                View Active Jobs →
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mt-8">
        <h2 className="text-2xl font-semibold mb-6 text-center">Grow Your Business</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">⭐</span>
            </div>
            <h3 className="font-medium mb-2">Build Your Reputation</h3>
            <p className="text-sm text-gray-600">Collect 5-star reviews and showcase your best work to attract premium customers</p>
          </div>
          
          <div className="text-center">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-medium mb-2">Track Earnings</h3>
            <p className="text-sm text-gray-600">Monitor weekly, monthly and total earnings with detailed payment history</p>
          </div>
          
          <div className="text-center">
            <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="font-medium mb-2">Marketing Tools</h3>
            <p className="text-sm text-gray-600">Get personalized business cards and marketing materials to grow offline</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg p-8 mt-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-4">Your Earning Potential</h2>
          <p className="text-green-100">Real examples from successful Patchwork Trades tradesmen</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white bg-opacity-10 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold mb-2">£45/hour</div>
            <div className="text-green-100 text-sm">Average Electrician Rate</div>
            <div className="text-xs text-green-200 mt-1">3 slots/day = £540/day</div>
          </div>
          
          <div className="bg-white bg-opacity-10 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold mb-2">£1,200</div>
            <div className="text-blue-100 text-sm">Average Weekly Earnings</div>
            <div className="text-xs text-blue-200 mt-1">Top tradesmen earn £2,000+</div>
          </div>
          
          <div className="bg-white bg-opacity-10 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold mb-2">89%</div>
            <div className="text-purple-100 text-sm">Customer Satisfaction</div>
            <div className="text-xs text-purple-200 mt-1">Leading to repeat bookings</div>
          </div>
        </div>
        
        <div className="text-center mt-6">
          <button
            onClick={() => handleNavigation('/earnings-overview')}
            className="bg-white text-green-600 px-8 py-3 rounded-lg hover:bg-gray-100 font-medium"
          >
            View My Earnings
          </button>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-8">
        <h3 className="text-lg font-semibold mb-4 text-center">Success Tips from Top-Earning Tradesmen</h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-medium mb-2 text-green-700">💰 Maximize Earnings:</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• Keep availability updated across multiple time slots</li>
              <li>• Respond to quote requests within 2 hours</li>
              <li>• Use custom quotes for material-heavy jobs</li>
              <li>• Build relationships for repeat customers</li>
              <li>• Maintain 4.5+ star rating for premium positioning</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2 text-blue-700">🏆 Stand Out from Competition:</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• Upload high-quality portfolio photos</li>
              <li>• Get "Fully Insured" certification badge</li>
              <li>• Write detailed service descriptions</li>
              <li>• Ask satisfied customers for reviews</li>
              <li>• Share your profile link on social media</li>
            </ul>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
          <p className="text-yellow-800 text-sm text-center">
            <strong>Platform Tip:</strong> Tradesmen who complete their profile 100% and maintain high availability get featured first in customer searches.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TradesmanHowItWorks;
