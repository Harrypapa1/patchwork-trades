import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

const MakeMoreMoney = () => {
  const { currentUser } = useAuth();
  const [tradesmanProfile, setTradesmanProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (currentUser) {
        try {
          const docRef = doc(db, 'tradesmen_profiles', currentUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setTradesmanProfile(docSnap.data());
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, [currentUser]);

  const profileUrl = `https://patchworktrades.com/tradesman/${currentUser?.uid}`;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen px-4">
        <div className="text-lg text-center">Loading your business growth tools...</div>
      </div>
    );
  }

  return (
    <div className={`${isMobileView ? 'max-w-full px-4' : 'max-w-6xl mx-auto px-4'} py-6`}>
      <h1 className={`${isMobileView ? 'text-2xl' : 'text-3xl'} font-bold mb-6 text-gray-800 text-center`}>
        Business Growth Tools
      </h1>

      {/* Personalized Marketing Materials - Mobile Optimized */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
        <h2 className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold mb-4 text-gray-800 text-center`}>
          🎨 Your Personal Marketing Kit
        </h2>
        
        {tradesmanProfile && (
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 mb-6">
            <h3 className={`font-bold ${isMobileView ? 'text-lg' : 'text-xl'} mb-4 text-center`}>
              Personalized for {tradesmanProfile.name}
            </h3>
            
            {/* Business Card & QR Code - Mobile Stack */}
            <div className={`grid gap-4 mb-6 ${isMobileView ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h4 className="font-semibold mb-3 text-center">📄 Your Business Card</h4>
                <div className="bg-white p-4 rounded border-2 border-gray-200">
                  <div className="text-lg font-bold text-blue-600 text-center">{tradesmanProfile.name}</div>
                  <div className="text-sm text-gray-600 text-center">{tradesmanProfile.trade_type}</div>
                  <div className="text-xs mt-2 text-center">Find me on Patchwork Trades</div>
                  <div className="text-xs text-blue-600 text-center break-all">{profileUrl}</div>
                  <div className="mt-2 text-center">
                    <span className="text-xs bg-yellow-100 px-2 py-1 rounded">⭐ 0% Commission Platform</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h4 className="font-semibold mb-3 text-center">📱 QR Code for Your Van</h4>
                <div className="bg-white p-4 rounded border-2 border-gray-200 text-center">
                  <div className="w-20 h-20 bg-gray-200 mx-auto mb-2 rounded flex items-center justify-center text-xs">
                    QR Code
                  </div>
                  <div className="text-xs">Scan to see {tradesmanProfile.name}'s profile</div>
                  <div className="text-xs text-green-600 font-bold mt-1">0% Commission Platform</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Marketing Tools - Mobile Stack */}
        <div className={`grid gap-4 ${isMobileView ? 'grid-cols-1' : 'md:grid-cols-3'}`}>
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <h4 className="font-bold mb-2">📄 Flyer Templates</h4>
            <p className="text-sm text-gray-700 mb-3">Ready-to-print flyers with your details</p>
            <button 
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors w-full"
              style={{ minHeight: '44px' }}
            >
              Download PDF
            </button>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <h4 className="font-bold mb-2">📱 Social Media Posts</h4>
            <p className="text-sm text-gray-700 mb-3">Instagram & Facebook ready images</p>
            <button 
              className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors w-full"
              style={{ minHeight: '44px' }}
            >
              Get Images
            </button>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <h4 className="font-bold mb-2">✉️ Email Signature</h4>
            <p className="text-sm text-gray-700 mb-3">Professional email footer template</p>
            <button 
              className="bg-purple-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-purple-700 transition-colors w-full"
              style={{ minHeight: '44px' }}
            >
              Copy Code
            </button>
          </div>
        </div>
      </div>

      {/* Quick Wins Section - Mobile Optimized */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
        <h2 className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold mb-4 text-gray-800 text-center`}>
          🚀 Quick Wins - Start Today!
        </h2>
        <div className={`grid gap-4 ${isMobileView ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
          <div className="border-l-4 border-green-500 pl-4 py-2">
            <h3 className="font-bold text-lg mb-2">✅ Update Your Calendar Daily</h3>
            <p className="text-gray-700 text-sm">Available tradesmen get 5x more bookings. Keep your calendar current to appear in more searches.</p>
          </div>
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <h3 className="font-bold text-lg mb-2">📸 Add More Photos</h3>
            <p className="text-gray-700 text-sm">Profiles with 5+ photos get 400% more inquiries. Show your best work!</p>
          </div>
          <div className="border-l-4 border-purple-500 pl-4 py-2">
            <h3 className="font-bold text-lg mb-2">⚡ Respond Within 2 Hours</h3>
            <p className="text-gray-700 text-sm">Fast responders win 80% more jobs. Check quotes regularly and respond quickly!</p>
          </div>
          <div className="border-l-4 border-orange-500 pl-4 py-2">
            <h3 className="font-bold text-lg mb-2">🌟 Ask for Reviews</h3>
            <p className="text-gray-700 text-sm">5-star tradesmen charge 30% more. Always ask satisfied customers for reviews.</p>
          </div>
        </div>
      </div>

      {/* Profile Optimization - Mobile Optimized */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
        <h2 className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold mb-4 text-gray-800 text-center`}>
          🎯 Optimize Your Profile for Success
        </h2>
        
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-3">📝 Perfect Your Description</h3>
            <div className="space-y-3 text-sm">
              <div className="bg-green-50 p-3 rounded border-l-4 border-green-500">
                <p className="font-medium mb-1">✅ Good Example:</p>
                <p className="italic">"25 years experience. Fully insured. Same-day quotes. Tidy, professional work with 5-year guarantee."</p>
              </div>
              <div className="bg-red-50 p-3 rounded border-l-4 border-red-500">
                <p className="font-medium mb-1">❌ Bad Example:</p>
                <p className="italic">"Good plumber, reasonable prices, call me."</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-3">📸 Photo Strategy That Works</h3>
            
            {/* Mobile: Stack the photo tips */}
            <div className={`space-y-4 ${isMobileView ? '' : 'md:grid md:grid-cols-2 md:gap-4 md:space-y-0'}`}>
              <div className="bg-white p-3 rounded">
                <p className="font-semibold mb-2 text-green-600">Essential Photos:</p>
                <ul className="space-y-1 text-sm">
                  <li>• Professional headshot (builds trust)</li>
                  <li>• Before/after work examples</li>
                  <li>• You working on-site</li>
                  <li>• Your van/tools (shows professionalism)</li>
                  <li>• Certificates/qualifications</li>
                </ul>
              </div>
              <div className="bg-white p-3 rounded">
                <p className="font-semibold mb-2 text-blue-600">Photo Tips:</p>
                <ul className="space-y-1 text-sm">
                  <li>• Good lighting is crucial</li>
                  <li>• Clean, tidy workspace</li>
                  <li>• Show the quality difference</li>
                  <li>• Include satisfied customers (with permission)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Communication Scripts - Mobile Optimized */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
        <h2 className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold mb-4 text-gray-800 text-center`}>
          💬 What to Say to Win More Jobs
        </h2>
        
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-3">🎯 Winning Quote Response Template</h3>
            <div className="bg-white p-4 rounded border-l-4 border-green-500">
              <p className="italic text-gray-700 text-sm leading-relaxed">
                "Hi [Customer Name], thanks for your quote request! I've got 25 years experience in [trade] and I'm fully insured with a 5-year guarantee on all work. I can start [date] and typically complete jobs like this in [timeframe]. I'd love to discuss your specific needs - when would be a good time for a quick call? Best regards, [Your Name]"
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-3">📞 Phone Call Tips</h3>
            <div className="space-y-3 text-sm">
              <div className="bg-white p-3 rounded">
                <p className="font-medium text-blue-600 mb-1">Opening:</p>
                <p>"I saw your job request on Patchwork. I specialize in exactly this type of work..."</p>
              </div>
              <div className="bg-white p-3 rounded">
                <p className="font-medium text-green-600 mb-1">Build Trust:</p>
                <p>"I'm fully insured and all my work comes with a guarantee. Happy to show you references from recent customers..."</p>
              </div>
              <div className="bg-white p-3 rounded">
                <p className="font-medium text-purple-600 mb-1">Close:</p>
                <p>"I can start this [day] and have it completed by [date]. Shall I put you in the diary?"</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-3">⭐ Why Choose Patchwork (Tell Your Customers)</h3>
            <div className="text-sm space-y-2">
              <div className="bg-white p-3 rounded">
                <p>• "I use Patchwork because there's no commission fees - I can offer you better prices"</p>
              </div>
              <div className="bg-white p-3 rounded">
                <p>• "Patchwork vets all tradesmen - you're getting quality professionals"</p>
              </div>
              <div className="bg-white p-3 rounded">
                <p>• "The platform makes everything smooth - quotes, scheduling, everything in one place"</p>
              </div>
              <div className="bg-white p-3 rounded">
                <p>• "I've got great reviews on here from customers just like you"</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Advantages - Mobile Optimized */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
        <h2 className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold mb-4 text-gray-800 text-center`}>
          🏆 Why Patchwork Beats the Competition
        </h2>
        
        {/* Mobile: Stack comparison instead of table */}
        {isMobileView ? (
          <div className="space-y-4">
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
              <h3 className="font-bold text-lg text-green-700 mb-3 text-center">🏆 Patchwork Trades</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Commission Fee:</span>
                  <span className="font-bold text-green-600">0% Forever</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Fees:</span>
                  <span className="font-bold text-green-600">£0</span>
                </div>
                <div className="flex justify-between">
                  <span>Lead Quality:</span>
                  <span className="text-green-600">⭐⭐⭐⭐⭐</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Speed:</span>
                  <span className="font-bold text-green-600">Lightning Fast</span>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-bold text-lg text-red-700 mb-3 text-center">MyBuilder</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Commission Fee:</span>
                  <span className="font-bold text-red-600">15%</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Fees:</span>
                  <span className="font-bold text-red-600">£35+</span>
                </div>
                <div className="flex justify-between">
                  <span>Lead Quality:</span>
                  <span>⭐⭐⭐</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Speed:</span>
                  <span>Slow</span>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-bold text-lg text-red-700 mb-3 text-center">Checkatrade</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Commission Fee:</span>
                  <span className="font-bold text-red-600">5%</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Fees:</span>
                  <span className="font-bold text-red-600">£100+</span>
                </div>
                <div className="flex justify-between">
                  <span>Lead Quality:</span>
                  <span>⭐⭐⭐⭐</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Speed:</span>
                  <span>Average</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Desktop: Keep table format
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-3">Feature</th>
                  <th className="text-center p-3 text-green-600">Patchwork</th>
                  <th className="text-center p-3">MyBuilder</th>
                  <th className="text-center p-3">Checkatrade</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3 font-medium">Commission Fee</td>
                  <td className="p-3 text-center text-green-600 font-bold">0% Forever</td>
                  <td className="p-3 text-center text-red-600">15%</td>
                  <td className="p-3 text-center text-red-600">5%</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-3 font-medium">Monthly Fees</td>
                  <td className="p-3 text-center text-green-600 font-bold">£0</td>
                  <td className="p-3 text-center text-red-600">£35+</td>
                  <td className="p-3 text-center text-red-600">£100+</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Lead Quality</td>
                  <td className="p-3 text-center text-green-600">⭐⭐⭐⭐⭐</td>
                  <td className="p-3 text-center">⭐⭐⭐</td>
                  <td className="p-3 text-center">⭐⭐⭐⭐</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-3 font-medium">Platform Speed</td>
                  <td className="p-3 text-center text-green-600">Lightning Fast</td>
                  <td className="p-3 text-center">Slow</td>
                  <td className="p-3 text-center">Average</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-4 p-4 bg-green-50 rounded border-l-4 border-green-500">
          <p className="font-bold text-green-800 text-center">
            💡 Tell customers: "I save 15-20% on fees with Patchwork, so I can offer you better prices!"
          </p>
        </div>
      </div>

      {/* Daily Routine Integration - Mobile Optimized */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
        <h2 className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold mb-4 text-gray-800 text-center`}>
          ⏰ Make Patchwork Part of Your Daily Routine
        </h2>
        
        <div className={`grid gap-4 ${isMobileView ? 'grid-cols-1' : 'md:grid-cols-3'}`}>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <div className="text-4xl mb-3">🌅</div>
            <h3 className="font-bold mb-3 text-lg">Morning (8-9 AM)</h3>
            <ul className="text-sm space-y-2 text-left">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Check new quote requests</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Update your availability</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Respond to any messages</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Plan your day around jobs</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
            <div className="text-4xl mb-3">☀️</div>
            <h3 className="font-bold mb-3 text-lg">Midday (12-1 PM)</h3>
            <ul className="text-sm space-y-2 text-left">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Quick check for urgent quotes</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Update job progress</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Take photos of work in progress</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Share profile on social media</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <div className="text-4xl mb-3">🌆</div>
            <h3 className="font-bold mb-3 text-lg">Evening (6-7 PM)</h3>
            <ul className="text-sm space-y-2 text-left">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Upload photos of completed work</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Ask customers for reviews</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Set availability for tomorrow</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Plan next day's schedule</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Success Stories - Mobile Optimized */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
        <h2 className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold mb-4 text-gray-800 text-center`}>
          🏆 Success Stories from Patchwork Tradesmen
        </h2>
        
        <div className={`grid gap-4 ${isMobileView ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold mr-3 text-lg">
                JM
              </div>
              <div>
                <div className="font-bold">John - Electrician</div>
                <div className="text-sm text-gray-600">London</div>
              </div>
            </div>
            <p className="text-sm italic leading-relaxed">
              "Switched from MyBuilder 6 months ago. Now I'm earning £800 more per month just from keeping 100% of my fees. The leads are higher quality too!"
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-3 text-lg">
                ST
              </div>
              <div>
                <div className="font-bold">Sarah - Plumber</div>
                <div className="text-sm text-gray-600">Manchester</div>
              </div>
            </div>
            <p className="text-sm italic leading-relaxed">
              "The platform is so much faster than others. I get notifications instantly and can respond quickly. My booking rate has tripled!"
            </p>
          </div>
        </div>
      </div>

      {/* Bottom padding for mobile */}
      {isMobileView && <div className="h-20"></div>}
    </div>
  );
};

export default MakeMoreMoney;
