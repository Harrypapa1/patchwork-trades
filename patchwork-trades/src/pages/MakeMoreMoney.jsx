import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

const MakeMoreMoney = () => {
  const { currentUser } = useAuth();
  const [tradesmanProfile, setTradesmanProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading your business growth tools...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg p-8 mb-8">
        <h1 className="text-4xl font-bold mb-4">💰 Make More Money with Patchwork</h1>
        <p className="text-xl mb-6">Transform your trade business with our proven strategies. Get 3x more bookings and keep 100% of your earnings!</p>
        <div className="grid md:grid-cols-3 gap-4 text-center">
          <div className="bg-white/20 rounded p-4">
            <div className="text-2xl font-bold">0%</div>
            <div>Commission Forever</div>
          </div>
          <div className="bg-white/20 rounded p-4">
            <div className="text-2xl font-bold">3x</div>
            <div>More Bookings</div>
          </div>
          <div className="bg-white/20 rounded p-4">
            <div className="text-2xl font-bold">100%</div>
            <div>Keep Your Earnings</div>
          </div>
        </div>
      </div>

      {/* Quick Wins Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">🚀 Quick Wins - Start Today!</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-bold text-lg mb-2">✅ Update Your Calendar Daily</h3>
            <p className="text-gray-700">Available tradesmen get 5x more bookings. Keep your calendar current to appear in more searches.</p>
          </div>
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-bold text-lg mb-2">📸 Add More Photos</h3>
            <p className="text-gray-700">Profiles with 5+ photos get 400% more inquiries. Show your best work!</p>
          </div>
          <div className="border-l-4 border-purple-500 pl-4">
            <h3 className="font-bold text-lg mb-2">⚡ Respond Within 2 Hours</h3>
            <p className="text-gray-700">Fast responders win 80% more jobs. Check quotes regularly and respond quickly!</p>
          </div>
          <div className="border-l-4 border-orange-500 pl-4">
            <h3 className="font-bold text-lg mb-2">🌟 Ask for Reviews</h3>
            <p className="text-gray-700">5-star tradesmen charge 30% more. Always ask satisfied customers for reviews.</p>
          </div>
        </div>
      </div>

      {/* Profile Optimization */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">🎯 Optimize Your Profile for Success</h2>
        
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-3">📝 Perfect Your Description</h3>
            <div className="space-y-2 text-sm">
              <p><strong>✅ Do:</strong> "25 years experience. Fully insured. Same-day quotes. Tidy, professional work with 5-year guarantee."</p>
              <p><strong>❌ Don't:</strong> "Good plumber, reasonable prices, call me."</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-3">📸 Photo Strategy That Works</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold mb-2">Essential Photos:</p>
                <ul className="space-y-1">
                  <li>• Professional headshot (builds trust)</li>
                  <li>• Before/after work examples</li>
                  <li>• You working on-site</li>
                  <li>• Your van/tools (shows professionalism)</li>
                  <li>• Certificates/qualifications</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-2">Photo Tips:</p>
                <ul className="space-y-1">
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

      {/* Customer Communication Scripts */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">💬 What to Say to Win More Jobs</h2>
        
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-3">🎯 Winning Quote Response Template</h3>
            <div className="bg-white p-4 rounded border-l-4 border-green-500 italic text-gray-700">
              "Hi [Customer Name], thanks for your quote request! I've got 25 years experience in [trade] and I'm fully insured with a 5-year guarantee on all work. I can start [date] and typically complete jobs like this in [timeframe]. I'd love to discuss your specific needs - when would be a good time for a quick call? Best regards, [Your Name]"
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-3">📞 Phone Call Conversation Starters</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Opening:</strong> "I saw your job request on Patchwork. I specialize in exactly this type of work..."</p>
              <p><strong>Build Trust:</strong> "I'm fully insured and all my work comes with a guarantee. Happy to show you references from recent customers..."</p>
              <p><strong>Close:</strong> "I can start this [day] and have it completed by [date]. Shall I put you in the diary?"</p>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-3">⭐ Why Choose Patchwork (Tell Your Customers)</h3>
            <div className="text-sm space-y-1">
              <p>• "I use Patchwork because there's no commission fees - I can offer you better prices"</p>
              <p>• "Patchwork vets all tradesmen - you're getting quality professionals"</p>
              <p>• "The platform makes everything smooth - quotes, scheduling, everything in one place"</p>
              <p>• "I've got great reviews on here from customers just like you"</p>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Advantages */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">🏆 Why Patchwork Beats the Competition</h2>
        
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
        
        <div className="mt-4 p-4 bg-green-50 rounded border-l-4 border-green-500">
          <p className="font-bold text-green-800">💡 Tell customers: "I save 15-20% on fees with Patchwork, so I can offer you better prices!"</p>
        </div>
      </div>

      {/* Personalized Marketing Materials */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">🎨 Personalized Marketing Materials Just for You!</h2>
        
        {tradesmanProfile && (
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">Your Personal Patchwork Marketing Kit</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">📄 Business Card Template</h4>
                <div className="bg-white p-4 rounded shadow border">
                  <div className="text-lg font-bold text-blue-600">{tradesmanProfile.name}</div>
                  <div className="text-sm text-gray-600">{tradesmanProfile.trade_type}</div>
                  <div className="text-xs mt-2">Find me on Patchwork Trades</div>
                  <div className="text-xs text-blue-600">{profileUrl}</div>
                  <div className="mt-2 text-xs bg-yellow-100 px-2 py-1 rounded">⭐ 0% Commission Platform</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">📱 QR Code for Your Van</h4>
                <div className="bg-white p-4 rounded shadow border text-center">
                  <div className="w-24 h-24 bg-gray-200 mx-auto mb-2 rounded flex items-center justify-center">
                    QR Code Here
                  </div>
                  <div className="text-xs">Scan to see {tradesmanProfile.name}'s profile</div>
                  <div className="text-xs text-green-600 font-bold">0% Commission Platform</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded">
            <h4 className="font-bold mb-2">📄 Flyer Templates</h4>
            <p className="text-sm text-gray-700">Ready-to-print flyers with your details</p>
            <button className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-sm">Download PDF</button>
          </div>
          
          <div className="bg-green-50 p-4 rounded">
            <h4 className="font-bold mb-2">📱 Social Media Posts</h4>
            <p className="text-sm text-gray-700">Instagram & Facebook ready images</p>
            <button className="mt-2 bg-green-600 text-white px-3 py-1 rounded text-sm">Get Images</button>
          </div>
          
          <div className="bg-purple-50 p-4 rounded">
            <h4 className="font-bold mb-2">✉️ Email Signature</h4>
            <p className="text-sm text-gray-700">Professional email footer template</p>
            <button className="mt-2 bg-purple-600 text-white px-3 py-1 rounded text-sm">Copy Code</button>
          </div>
        </div>
      </div>

      {/* Daily Routine Integration */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">⏰ Make Patchwork Part of Your Daily Routine</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl mb-2">🌅</div>
            <h3 className="font-bold mb-2">Morning (8-9 AM)</h3>
            <ul className="text-sm space-y-1 text-left">
              <li>• Check new quote requests</li>
              <li>• Update your availability</li>
              <li>• Respond to any messages</li>
              <li>• Plan your day around jobs</li>
            </ul>
          </div>
          
          <div className="text-center">
            <div className="text-3xl mb-2">☀️</div>
            <h3 className="font-bold mb-2">Midday (12-1 PM)</h3>
            <ul className="text-sm space-y-1 text-left">
              <li>• Quick check for urgent quotes</li>
              <li>• Update job progress</li>
              <li>• Take photos of work in progress</li>
              <li>• Share profile on social media</li>
            </ul>
          </div>
          
          <div className="text-center">
            <div className="text-3xl mb-2">🌅</div>
            <h3 className="font-bold mb-2">Evening (6-7 PM)</h3>
            <ul className="text-sm space-y-1 text-left">
              <li>• Upload photos of completed work</li>
              <li>• Ask customers for reviews</li>
              <li>• Set availability for tomorrow</li>
              <li>• Plan next day's schedule</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Success Stories */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">🏆 Success Stories from Patchwork Tradesmen</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                JM
              </div>
              <div>
                <div className="font-bold">John - Electrician</div>
                <div className="text-sm text-gray-600">London</div>
              </div>
            </div>
            <p className="text-sm italic">"Switched from MyBuilder 6 months ago. Now I'm earning £800 more per month just from keeping 100% of my fees. The leads are higher quality too!"</p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                ST
              </div>
              <div>
                <div className="font-bold">Sarah - Plumber</div>
                <div className="text-sm text-gray-600">Manchester</div>
              </div>
            </div>
            <p className="text-sm italic">"The platform is so much faster than others. I get notifications instantly and can respond quickly. My booking rate has tripled!"</p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg p-8 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to 3x Your Business?</h2>
        <p className="text-xl mb-6">Start implementing these strategies today and watch your bookings soar!</p>
        <div className="space-x-4">
          <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100">
            Update My Profile Now
          </button>
          <button className="bg-yellow-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-yellow-600">
            Download Marketing Kit
          </button>
        </div>
      </div>
    </div>
  );
};

export default MakeMoreMoney;