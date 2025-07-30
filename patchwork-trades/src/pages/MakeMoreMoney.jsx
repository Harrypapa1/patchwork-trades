return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Business Growth Tools</h1>

      {/* Personalized Marketing Materials - Moved to Top */}
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

      {/* Quick Wins Section */}
