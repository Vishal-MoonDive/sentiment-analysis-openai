// pages/index.js
import { useState, useRef, useEffect } from 'react';
import { FaPaperPlane } from 'react-icons/fa';
import openAIService from '../utils/openai';

const ChatBubble = ({ message, fromUser }) => {
  return (
    <div className={`chat-bubble ${fromUser ? 'user' : 'other'}`}
      style={{
        display: 'flex',
        justifyContent: fromUser ? 'flex-end' : 'flex-start',
        marginBottom: '10px'
      }}>
      <div className={`message ${fromUser ? 'user-message' : 'other-message'}`}
        style={{
          backgroundColor: fromUser ? '#0084ff' : '#e5e5e5',
          color: fromUser ? 'white' : 'black',
          borderRadius: '10px',
          padding: '10px 15px',
          maxWidth: '60%'
        }}>
        {message}
      </div>
    </div>
  );
};

const Home = () => {
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [notification, setNotification] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleMessageSend = async () => {
    if (message.trim() === '' || isLoading) return;

    // Clear previous errors and notifications
    setError('');
    setNotification('');
    setIsLoading(true);

    try {
      // Check for sensitive content with the new format
      const sensitiveCheck = openAIService.checkForSensitiveContent(message);
      if (sensitiveCheck.hasSensitiveContent) {
        setError(sensitiveCheck.reason);
        setIsLoading(false);
        return;
      }

      // Check for meeting time issues
      const meetingNotification = openAIService.checkMeetingTime(message);
      if (meetingNotification) {
        setNotification(meetingNotification);
      }

      // Add user message to chat
      const userMessage = { message, fromUser: true };
      setChatMessages(prevMessages => [...prevMessages, userMessage]);
      setMessage('');

      // Get AI response
      const aiResponse = await openAIService.fetchOpenAIResponse(
        message,
        'Extract context and generate a response.'
      );

      // Add AI response to chat
      setChatMessages(prevMessages => [
        ...prevMessages,
        { message: aiResponse, fromUser: false }
      ]);
    } catch (error) {
      setError('Failed to get AI response: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleMessageSend();
    }
  };

  return (
    <div style={{ width: '60%', height: '100vh', background: '#f0f2f5', padding: '20px', margin: 'auto' }}>
      <h1 style={{ textAlign: 'center', fontSize: '24px', marginBottom: '20px' }}>
        Chat with OpenAI for message analysis.
      </h1>

      <div
        ref={chatContainerRef}
        style={{
          maxHeight: '70vh',
          overflowY: 'scroll',
          marginBottom: '10px',
          padding: '10px',
          background: '#fff',
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
        {chatMessages.map((msg, index) => (
          <ChatBubble key={index} message={msg.message} fromUser={msg.fromUser} />
        ))}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',  // Ensures both the textarea and button are aligned vertically
        borderTop: '1px solid #ddd',
        paddingTop: '10px',
        paddingBottom: '10px', // Adjust bottom padding to ensure no extra spacing
      }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          rows="2"
          placeholder={isLoading ? "Processing..." : "Type a message..."}
          style={{
            borderRadius: '20px',
            padding: '10px',  // Padding inside the textarea, can adjust for spacing
            width: '100%',
            border: '1px solid #ddd',
            fontSize: '14px',
            marginRight: '10px',
            outline: 'none',
            opacity: isLoading ? 0.7 : 1,
            resize: 'none', // Prevent resizing if you want to keep it fixed in size
            display: 'flex',
            alignItems: 'center', // Vertically align the text in the textarea
            justifyContent: 'flex-start', // Align text to the left
            lineHeight: '1.5',  // Optional: Adjust for text alignment within the textarea
          }}
        />
        <button
          onClick={handleMessageSend}
          disabled={isLoading}
          style={{
            backgroundColor: isLoading ? '#ccc' : '#0084ff',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            padding: '12px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center', // Ensures the button icon is vertically centered
            justifyContent: 'center', // Centers the icon horizontally
          }}>
          <FaPaperPlane size={20} />
        </button>
      </div>


      {error && (
        <div style={{ color: 'red', textAlign: 'center', marginTop: '10px' }}>
          {error}
        </div>
      )}

      {notification && (
        <div style={{ color: 'orange', textAlign: 'center', marginTop: '10px' }}>
          {notification}
        </div>
      )}
    </div>
  );
};

export default Home;