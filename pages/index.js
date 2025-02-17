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
          backgroundColor: fromUser ? '#F8ECDE' : '#e5e5e5',
          color: 'black',
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
  const [warning, setWarning] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef(null);

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
    setWarning('');
    setIsLoading(true);

    try {

      // Check for meeting time issues
      const meetingNotification = await openAIService.checkMeetingTime(message, chatMessages);
      if (meetingNotification) {
        setNotification(meetingNotification);
      }

      // Add user message to chat
      const userMessage = { message, fromUser: true };
      setChatMessages(prevMessages => [...prevMessages, userMessage]);
      setMessage('');

      // Get AI response
      const aiResponse = await openAIService.fetchOpenAIResponse(message, chatMessages);

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
    <div style={{ width: '60%', height: '100vh', background: '#F8ECDE', padding: '20px', margin: 'auto' }}>
      <h1 style={{ textAlign: 'center', fontSize: '24px', marginBottom: '20px', fontWeight: 'bold', color:'#EC7A34'}}>
        Chat with OpenAI for message analysis.
      </h1>

      <div ref={chatContainerRef} style={{
        maxHeight: '70vh',
        minHeight: '70vh',
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
        alignItems: 'center',
        borderTop: '1px solid #ddd',
        paddingTop: '10px',
        paddingBottom: '10px',
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
            padding: '10px',
            width: '100%',
            border: '1px solid #ddd',
            fontSize: '14px',
            marginRight: '10px',
            outline: 'none',
            opacity: isLoading ? 0.7 : 1,
            resize: 'none',
          }}
        />
        <button
          onClick={handleMessageSend}
          disabled={isLoading || !message.trim()}
          style={{
            background: '#EC7A34',
            border: 'none',
            padding: '10px',
            borderRadius: '50%',
            cursor: isLoading || !message.trim() ? 'not-allowed' : 'pointer',
            color: 'white',
            fontSize: '18px',
          }}>
          <FaPaperPlane />
        </button>
      </div>

      {warning && <div style={{ color: 'orange', marginTop: '10px' }}><strong>Warning: </strong>{warning}</div>}
      {notification && <div style={{ color: 'green', marginTop: '10px' }}><strong>Safety Notification: </strong>{notification}</div>}
      {error && <div style={{ color: 'red', marginTop: '10px' }}><strong>Error: </strong>{error}</div>}
    </div>
  );
};

export default Home;
