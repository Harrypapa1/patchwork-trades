import React, { useState, useEffect, useRef } from 'react';
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
  getDoc,
  updateDoc 
} from 'firebase/firestore';
import { db } from '../config/firebase';

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
  const [senderPhoto, setSenderPhoto] = useState(null);
  const [receiverPhoto, setReceiverPhoto] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollTo({
      top: messagesEndRef.current.scrollHeight,
      behavior: 'smooth'
    });
  };

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
      
      // Mark unread messages as read
      markMessagesAsRead(messagesData);
      
      // Scroll to bottom when messages change
      setTimeout(scrollToBottom, 100);
    });

    return () => unsubscribe();
  }, [bookingId]);

  const markMessagesAsRead = async (messagesData) => {
    if (!currentUser) return;
    
    // Find messages that are unread and sent to current user
    const unreadMessages = messagesData.filter(message => 
      message.receiver_id === currentUser.uid && message.read === false
    );
    
    // Mark them as read
    for (const message of unreadMessages) {
      try {
        await updateDoc(doc(db, 'messages', message.id), {
          read: true
        });
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    }
  };

  const fetchBookingDetails = async () => {
    try {
      // Get booking details
      const bookingDoc = await getDocs(
        query(collection(db, 'bookings'), where('__name__', '==', bookingId))
      );
      
      if (!bookingDoc.empty) {
        const bookingData = bookingDoc.docs[0].data();
        setBooking(bookingData);

        // Get current user's name and photo
        let currentUserName = '';
        let currentUserPhoto = null;
        if (userType === 'customer') {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            currentUserName = userData.name || 'Customer';
            currentUserPhoto = userData.profilePhoto || null;
          }
        } else {
          const tradesmanDoc = await getDoc(doc(db, 'tradesmen_profiles', currentUser.uid));
          if (tradesmanDoc.exists()) {
            const tradesmanData = tradesmanDoc.data();
            currentUserName = tradesmanData.name || 'Tradesman';
            currentUserPhoto = tradesmanData.profilePhoto || null;
          }
        }
        setSenderName(currentUserName);
        setSenderPhoto(currentUserPhoto);

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
        setReceiverPhoto(receiverInfo.profilePhoto || null);
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
    }
  };

  const sendEmailNotification = async (messageText) => {
    try {
      const response = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderName: senderName,
          recipientName: receiverName,
          messageText: messageText,
          replyLink: `${window.location.origin}/messaging/${bookingId}`,
          recipientEmail: receiverEmail
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('Email notification sent successfully:', result);
      } else {
        console.error('Error sending email notification:', result);
      }
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
        timestamp: new Date().toISOString(),
        read: false
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

  // Helper component for profile picture
  const ProfilePicture = ({ photo, name, size = "w-8 h-8" }) => {
    if (photo) {
      return (
        <img 
          src={photo} 
          alt={`${name}'s profile`}
          className={`${size} rounded-full object-cover flex-shrink-0 border border-gray-300`}
        />
      );
    }
    
    return (
      <div className={`${size} rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-medium flex-shrink-0`}>
        {name.charAt(0).toUpperCase()}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading messages...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md h-96 flex flex-col">
      {/* Header with receiver info */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <ProfilePicture 
            photo={receiverPhoto} 
            name={receiverName} 
            size="w-10 h-10"
          />
          <div>
            <h2 className="text-xl font-semibold">Messages</h2>
            <p className="text-sm text-gray-600">
              Conversation with {receiverName} | Booking ID: {bookingId.substring(0, 8)}...
            </p>
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messagesEndRef}>
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center">No messages yet. Start the conversation!</p>
        ) : (
          messages.map(message => {
            const isCurrentUser = message.sender_id === currentUser.uid;
            const messagePhoto = isCurrentUser ? senderPhoto : receiverPhoto;
            const messageName = isCurrentUser ? senderName : receiverName;
            
            return (
              <div
                key={message.id}
                className={`flex gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                {/* Profile picture for received messages (left side) */}
                {!isCurrentUser && (
                  <ProfilePicture 
                    photo={messagePhoto} 
                    name={messageName}
                  />
                )}
                
                {/* Message bubble */}
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isCurrentUser
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-gray-200 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  <p>{message.message_text}</p>
                  <p className="text-xs opacity-75 mt-1">
                    {new Date(message.timestamp).toLocaleString()}
                  </p>
                </div>

                {/* Profile picture for sent messages (right side) */}
                {isCurrentUser && (
                  <ProfilePicture 
                    photo={messagePhoto} 
                    name={messageName}
                  />
                )}
              </div>
            );
          })
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
