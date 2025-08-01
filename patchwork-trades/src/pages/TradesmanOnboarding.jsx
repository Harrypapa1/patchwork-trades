import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  doc, 
  getDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const TradesmanOnboarding = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  
  // Form state for Stripe Connect onboarding
  const [onboardingForm, setOnboardingForm] = useState({
    businessType: 'individual',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    address: '',
    city: '',
    postcode: '',
    businessName: '',
    businessRegistrationNumber: '',
    bankAccountNumber: '',
    sortCode: '',
    accountHolderName: '',
    taxNumber: '',
    phone: ''
  });

  useEffect(() => {
    fetchProfile();
  }, [currentUser]);

  const fetchProfile = async () => {
    if (!currentUser) return;
    
    try {
      const profileDoc = await getDoc(doc(db, 'tradesmen_profiles', currentUser.uid));
      if (profileDoc.exists()) {
        const profileData = profileDoc.data();
        setProfile(profileData);
        
        // Pre-fill form with existing data
        setOnboardingForm(prev => ({
          ...prev,
          firstName: profileData.name?.split(' ')[0] || '',
          lastName: profileData.name?.split(' ').slice(1).join(' ') || '',
          businessName: profileData.name || '',
          phone: profileData.phone || ''
        }));

        // Check if already onboarded
        if (profileData.stripe_account_id && profileData.payment_enabled) {
          setOnboardingStep(4); // Complete
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Format sort code
    if (name === 'sortCode') {
      const formatted = value.replace(/\D/g, '').replace(/(\d{2})(\d{2})(\d{2})/, '$1-$2-$3');
      if (formatted.length <= 8) {
        setOnboardingForm(prev => ({ ...prev, [name]: formatted }));
      }
      return;
    }
    
    // Format account number
    if (name === 'bankAccountNumber') {
      const numbers = value.replace(/\D/g, '');
      if (numbers.length <= 8) {
        setOnboardingForm(prev => ({ ...prev, [name]: numbers }));
      }
      return;
    }
    
    setOnboardingForm(prev => ({ ...prev, [name]: value }));
  };

  const handleStepSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      if (onboardingStep === 3) {
        // Final step - create Stripe Connect account (demo)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Update profile with payment setup
        await updateDoc(doc(db, 'tradesmen_profiles', currentUser.uid), {
          stripe_account_id: `acct_${Math.random().toString(36).substr(2, 16)}`,
          payment_enabled: true,
          payment_setup_completed_at: new Date().toISOString(),
          bank_account_last_4: onboardingForm.bankAccountNumber.slice(-4),
          business_type: onboardingForm.businessType,
          updated_at: new Date().toISOString()
        });
        
        setOnboardingStep(4);
      } else {
        setOnboardingStep(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error in onboarding step:', error);
      alert('There was an error processing your information. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-8">Loading payment setup...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Payment Setup</h1>
      
      {/* Progress Indicator */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step < onboardingStep ? 'bg-green-500 text-white' :
                step === onboardingStep ? 'bg-blue-500 text-white' :
                'bg-gray-300 text-gray-600'
              }`}>
                {step < onboardingStep ? '✓' : step}
              </div>
              {step < 4 && (
                <div className={`w-16 h-1 mx-2 ${
                  step < onboardingStep ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Business Info</span>
          <span>Personal Details</span>
          <span>Bank Account</span>
          <span>Complete</span>
        </div>
      </div>

      {/* Step 1: Business Information */}
      {onboardingStep === 1 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Business Information</h2>
          <p className="text-gray-600 mb-6">
            Tell us about your business structure to set up payments correctly.
          </p>
          
          <form onSubmit={handleStepSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Business Type *
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="businessType"
                    value="individual"
                    checked={onboardingForm.businessType === 'individual'}
                    onChange={handleInputChange}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">Individual (Sole Trader)</div>
                    <div className="text-sm text-gray-600">
                      You work for yourself and are personally responsible for your business
                    </div>
                  </div>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="businessType"
                    value="company"
                    checked={onboardingForm.businessType === 'company'}
                    onChange={handleInputChange}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">Limited Company</div>
                    <div className="text-sm text-gray-600">
                      Your business is incorporated and registered with Companies House
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {onboardingForm.businessType === 'company' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business/Company Name *
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={onboardingForm.businessName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ABC Plumbing Ltd"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Registration Number
                  </label>
                  <input
                    type="text"
                    name="businessRegistrationNumber"
                    value={onboardingForm.businessRegistrationNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="12345678"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-medium"
              >
                Continue
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2: Personal Details */}
      {onboardingStep === 2 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Personal Details</h2>
          <p className="text-gray-600 mb-6">
            We need your personal information for identity verification and tax purposes.
          </p>
          
          <form onSubmit={handleStepSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={onboardingForm.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={onboardingForm.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth *
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={onboardingForm.dateOfBirth}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <input
                type="text"
                name="address"
                value={onboardingForm.address}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={onboardingForm.city}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postcode *
                </label>
                <input
                  type="text"
                  name="postcode"
                  value={onboardingForm.postcode}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={onboardingForm.phone}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="07123 456789"
              />
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setOnboardingStep(1)}
                className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 font-medium"
              >
                Back
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-medium"
              >
                Continue
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 3: Bank Account */}
      {onboardingStep === 3 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Bank Account Details</h2>
          <p className="text-gray-600 mb-6">
            Add your bank account to receive payments from completed jobs.
          </p>
          
          <form onSubmit={handleStepSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Holder Name *
              </label>
              <input
                type="text"
                name="accountHolderName"
                value={onboardingForm.accountHolderName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Smith"
              />
              <p className="text-sm text-gray-500 mt-1">
                Must match the name on your bank account
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Code *
                </label>
                <input
                  type="text"
                  name="sortCode"
                  value={onboardingForm.sortCode}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="12-34-56"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number *
                </label>
                <input
                  type="text"
                  name="bankAccountNumber"
                  value={onboardingForm.bankAccountNumber}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="12345678"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                National Insurance Number (Optional)
              </label>
              <input
                type="text"
                name="taxNumber"
                value={onboardingForm.taxNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="AB123456C"
              />
              <p className="text-sm text-gray-500 mt-1">
                Helps with tax reporting (recommended)
              </p>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center text-blue-800 mb-2">
                <span className="text-lg mr-2">🔒</span>
                <span className="font-semibold">Your Information is Secure</span>
              </div>
              <p className="text-blue-700 text-sm">
                All sensitive information is encrypted and stored securely. We use bank-level security to protect your details.
              </p>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setOnboardingStep(2)}
                className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 font-medium"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={processing}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 font-medium"
              >
                {processing ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Setting up...
                  </div>
                ) : (
                  'Complete Setup'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 4: Complete */}
      {onboardingStep === 4 && (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-6xl text-green-500 mb-4">🎉</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Payment Setup Complete!</h2>
          <p className="text-lg text-gray-600 mb-6">
            You're now ready to receive payments from completed jobs.
          </p>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-green-800 mb-3">What happens next:</h3>
            <div className="text-left space-y-2 text-green-700">
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                Payments from jobs will be automatically transferred to your bank account
              </div>
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                You'll receive payments within 2-3 business days of job completion
              </div>
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                View your earnings and payment history in your dashboard
              </div>
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                All transactions are secure and protected
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/earnings-overview')}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              View Earnings Dashboard
            </button>
            <button
              onClick={() => navigate('/tradesman-dashboard')}
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-medium"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradesmanOnboarding;