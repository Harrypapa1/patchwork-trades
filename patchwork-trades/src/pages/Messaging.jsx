import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  onSnapshot,
  doc,
  getDoc 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import emailjs from '@emailjs/browser';

const Messaging = () => {
  const { bookingId } = useParams();
  const { currentUser, userType } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [senderName, setSenderName] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [receiverName, setReceiverName] = useState('');

  // EmailJS configuration
  const EMAILJS_SERVICE_ID = 'service_2m9tka2';
  const EMAILJS_TEMPLATE_ID = 'w5edc68';
  const EMAILJS_PUBLIC_KEY = 'vE2mgUnyEvzyXiv5Z';

  useEffect(() => {
    if (!bookingId) return;
    
    fetchBookingDetails();
    
    // Real-time messages listener
    const messagesQuery = query(
      collection(db, 'messages'),
      where('booking_id', '==', bookingId),
      orderBy('timestamp', 'asc')
    );
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messagesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      // Get booking details
      const bookingDoc = await getDocs(
        query(collection(db, 'bookings'), where('__name__', '==', bookingId))
      );
      
      if (!bookingDoc.empty) {
        const bookingData = bookingDoc.docs[0].data();
        setBooking(bookingData);

        // Get current user's name
        let currentUserName = '';
        if (userType === 'customer') {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          currentUserName = userDoc.exists() ? userDoc.data().name : 'Customer';
        } else {
          const tradesmanDoc = await getDoc(doc(db, 'tradesmen_profiles', currentUser.uid));
          currentUserName = tradesmanDoc.exists() ? tradesmanDoc.data().name : 'Tradesman';
        }
        setSenderName(currentUserName);

        // Get receiver's details (the other person in the conversation)
        const receiverId = bookingData.customer_id === currentUser.uid 
          ? bookingData.tradesman_id 
          : bookingData.customer_id;

        let receiverInfo = {};
        if (userType === 'customer') {
          // Current user is customer, receiver is tradesman
          const tradesmanDoc = await getDoc(doc(db, 'tradesmen_profiles', receiverId));
          if (tradesmanDoc.exists()) {
            receiverInfo = tradesmanDoc.data();
          }
        } else {
          // Current user is tradesman, receiver is customer
          const customerDoc = await getDoc(doc(db, 'users', receiverId));
          if (customerDoc.exists()) {
            receiverInfo = customerDoc.data();
          }
        }

        setReceiverEmail(receiverInfo.email || '');
        setReceiverName(receiverInfo.name || 'User');
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
    }
  };

  const sendEmailNotification = async (messageText) => {
    try {
      const templateParams = {
        sender_name: senderName,
        recipient_name: receiverName,
        message_text: messageText,
        reply_link: `${window.location.origin}/messaging/${bookingId}`,
        to_email: receiverEmail
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      console.log('Email notification sent successfully');
    } catch (error) {
      console.error('Error sending email notification:', error);
      // Don't block the message sending if email fails
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !booking) return;

    try {
      // Send the message to Firebase
      await addDoc(collection(db, 'messages'), {
        booking_id: bookingId,
        sender_id: currentUser.uid,
        receiver_id: booking.customer_id === currentUser.uid ? booking.tradesman_id : booking.customer_id,
        message_text: newMessage,
        timestamp: new Date().toISOString()
      });

      // Send email notification
      if (receiverEmail) {
        await sendEmailNotification(newMessage);
      }
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading messages...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md h-96 flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">Messages</h2>
        <p className="text-sm text-gray-600">
          Conversation with {receiverName} | Booking ID: {bookingId.substring(0, 8)}...
        </p>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center">No messages yet. Start the conversation!</p>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.sender_id === currentUser.uid ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender_id === currentUser.uid
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                <p>{message.message_text}</p>
                <p className="text-xs opacity-75 mt-1">
                  {new Date(message.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Message Input */}
      <form onSubmit={sendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default Messaging;
