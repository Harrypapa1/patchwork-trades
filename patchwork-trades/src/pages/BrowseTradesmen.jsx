import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const BrowseTradesmen = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [tradesmen, setTradesmen] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTradesmen();
  }, []);

  const fetchTradesmen = async () => {
    try {
      const tradesmenSnapshot = await getDocs(collection(db, 'tradesmen_profiles'));
      const tradesmenData = [];
      
      for (const tradesmanDoc of tradesmenSnapshot.docs) {
        const tradesmanData = tradesmanDoc.data();
        
        // Fetch availability for this tradesman
        const availabilityQuery = query(
          collection(db, 'availability'),
          where('tradesman_id', '==', tradesmanDoc.id),
          where('is_booked', '==', false)
        );
        const availabilitySnapshot = await getDocs(availabilityQuery);
        const availableDates = availabilitySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        tradesmenData.push({
          id: tradesmanDoc.id,
          ...tradesmanData,
          availableDates
        });
      }
      
      setTradesmen(tradesmenData);
    } catch (error) {
      console.error('Error fetching tradesmen:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = (tradesmanId, availabilityId) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    navigate('/booking-confirmation', {
      state: { tradesmanId, availabilityId }
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading tradesmen...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Browse Tradesmen</h1>
      
      {tradesmen.length === 0 ? (
        <p className="text-gray-500">No tradesmen available at the moment.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tradesmen.map(tradesman => (
            <div key={tradesman.id} className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-2">{tradesman.name}</h3>
              <p className="text-gray-600 mb-1"><strong>Trade:</strong> {tradesman.tradeType}</p>
              <p className="text-gray-600 mb-1"><strong>Area:</strong> {tradesman.areaCovered}</p>
              <p className="text-gray-600 mb-4">{tradesman.bio}</p>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Available Dates:</h4>
                {tradesman.availableDates.length === 0 ? (
                  <p className="text-gray-500 text-sm">No dates available</p>
                ) : (
                  <div className="space-y-2">
                    {tradesman.availableDates.map(date => (
                      <div key={date.id} className="flex justify-between items-center">
                        <span className="text-sm">{date.date_available}</span>
                        <button
                          onClick={() => handleBooking(tradesman.id, date.id)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          Book
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrowseTradesmen;