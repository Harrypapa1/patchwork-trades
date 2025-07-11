import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const Reviews = () => {
  const { tradesmanId } = useParams();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tradesmanId) return;
    
    fetchReviews();
  }, [tradesmanId]);

  const fetchReviews = async () => {
    try {
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('tradesman_id', '==', tradesmanId)
      );
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const reviewsData = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`text-lg ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}>
        ★
      </span>
    ));
  };

  if (loading) {
    return <div className="text-center py-8">Loading reviews...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Reviews</h1>
      
      {reviews.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-500">No reviews yet for this tradesman.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-3">
                <div className="flex mr-3">
                  {renderStars(review.rating)}
                </div>
                <span className="text-gray-600">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <p className="text-gray-800 mb-2">{review.comments}</p>
              
              {review.customer_name && (
                <p className="text-sm text-gray-600">
                  - {review.customer_name}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reviews;