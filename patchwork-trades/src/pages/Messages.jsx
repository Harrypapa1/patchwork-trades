import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  orderBy,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const Messages = () => {
  const { currentUser, userType } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    fetchConversations();
    
    // Set up real-time listener for messages to update unread counts
    const messagesQuery = query(
      collection(db, 'messages'),
      where('receiver_id', '==', currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(messagesQuery, () => {
      fetchConversations();
    });

    return () => unsubscribe();
  }, [currentUser]);

  const fetchConversations = async () => {
    if (!currentUser) return;

    try {
      // Get all messages where user is sender or receiver
      const sentMessagesQuery = query(
        collection(db, 'messages'),
        where('sender_id', '==', currentUser.uid)
      );
      
      const receivedMessagesQuery = query(
        collection(db, 'messages'),
        where('receiver_id', '==', currentUser.uid)
      );

      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(sentMessagesQuery),
        getDocs(receivedMessagesQuery)
      ]);

      const allMessages = [
        ...sentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...receivedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      ];

      // Group messages by booking_id
      const conversationMap = {};
      
      for (const message of allMessages) {
        const bookingId = message.booking_id;
        
        if (!conversationMap[bookingId]) {
          conversationMap[bookingId] = {
            bookingId,
            messages: [],
            lastMessage: null,
            lastMessageTime: null,
            otherUserId: null,
            otherUserName: 'Loading...',
            otherUserPhoto: null,
            unreadCount: 0
          };
        }
        
        conversationMap[bookingId].messages.push(message);
        
        // Count unread messages (received by current user and not read)
        if (message.receiver_id === currentUser.uid && message.read === false) {
          conversationMap[bookingId].unreadCount++;
        }
        
        // Track the other user
        const otherUserId = message.sender_id === currentUser.uid 
          ? message.receiver_id 
          : message.sender_id;
        conversationMap[bookingId].otherUserId = otherUserId;
      }

      // Get the latest message for each conversation and fetch other user names + photos
      const conversationsList = [];
      
      for (const conversation of Object.values(conversationMap)) {
        // Sort messages by timestamp to get the latest
        conversation.messages.sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        conversation.lastMessage = conversation.messages[0];
        conversation.lastMessageTime = conversation.lastMessage?.timestamp;

        // Fetch other user's name and profile photo
        try {
          let otherUserDoc;
          if (userType === 'customer') {
            // If current user is customer, other user is tradesman
            otherUserDoc = await getDoc(doc(db, 'tradesmen_profiles', conversation.otherUserId));
          } else {
            // If current user is tradesman, other user is customer
            otherUserDoc = await getDoc(doc(db, 'users', conversation.otherUserId));
          }
          
          if (otherUserDoc.exists()) {
            const userData = otherUserDoc.data();
            conversation.otherUserName = userData.name || 'Unknown User';
            conversation.otherUserPhoto = userData.profilePhoto || null;
          } else {
            conversation.otherUserName = 'Unknown User';
            conversation.otherUserPhoto = null;
          }
        } catch (error) {
          console.error('Error fetching user details:', error);
          conversation.otherUserName = 'Unknown User';
          conversation.otherUserPhoto = null;
        }

        conversationsList.push(conversation);
      }

      // Sort conversations by last message time (newest first)
      conversationsList.sort((a, b) => 
        new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
      );

      setConversations(conversationsList);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const messageDate = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  const truncateMessage = (message, maxLength = 50) => {
    if (!message) return '';
    return message.length > maxLength 
      ? message.substring(0, maxLength) + '...' 
      : message;
  };

  // Helper component for profile picture
  const ProfilePicture = ({ photo, name, size = "w-12 h-12" }) => {
    if (photo) {
      return (
        <img 
          src={photo} 
          alt={`${name}'s profile`}
          className={`${size} rounded-full object-cover flex-shrink-0 border-2 border-gray-300`}
        />
      );
    }
    
    return (
      <div className={`${size} rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-lg font-medium flex-shrink-0 border-2 border-gray-300`}>
        {name.charAt(0).toUpperCase()}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading messages...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>
      
      {conversations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-500 mb-4">No messages yet.</p>
          <Link 
            to="/browse"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-block"
          >
            Browse Tradesmen
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md">
          {conversations.map(conversation => (
            <Link
              key={conversation.bookingId}
              to={`/messaging/${conversation.bookingId}`}
              className={`block border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors ${
                conversation.unreadCount > 0 ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Profile Picture */}
                <ProfilePicture 
                  photo={conversation.otherUserPhoto} 
                  name={conversation.otherUserName}
                />
                
                {/* Conversation Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className={`font-semibold text-lg truncate ${
                      conversation.unreadCount > 0 ? 'text-blue-700' : ''
                    }`}>
                      {conversation.otherUserName}
                    </h3>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      Booking: {conversation.bookingId.substring(0, 8)}...
                    </span>
                  </div>
                  
                  <p className={`text-sm mb-1 truncate ${
                    conversation.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-600'
                  }`}>
                    {conversation.lastMessage?.sender_id === currentUser.uid ? 'You: ' : ''}
                    {truncateMessage(conversation.lastMessage?.message_text)}
                  </p>
                  
                  <p className="text-xs text-gray-400">
                    {formatMessageTime(conversation.lastMessageTime)}
                  </p>
                </div>
                
                {/* Unread Badge and Arrow */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {conversation.unreadCount > 0 && (
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                      {conversation.unreadCount}
                    </span>
                  )}
                  <svg 
                    className="w-5 h-5 text-gray-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 5l7 7-7 7" 
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Messages;
