// utils/openai.js
import OpenAI from 'openai';

class OpenAIService {
    constructor() {
        const isBrowser = typeof window !== 'undefined';

        if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
            throw new Error('NEXT_PUBLIC_OPENAI_API_KEY environment variable is not set');
        }

        const config = {
            apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
            dangerouslyAllowBrowser: isBrowser
        };

        this.openai = new OpenAI(config);
    }

    async checkMeetingTime(message, chatHistory) {
        const systemMessage = `
            You are a middleware for user safety, and your task is to analyze the following message in context of the entire conversation for any signs of unsafe or inappropriate behavior. Respond with one word only based on your findings.
        
            Unsafe behaviors to detect:
            - Sharing personal information such as phone numbers (e.g., "Here’s my number: 123-456-7890").
            - Late-night meetings (11 PM to 4 AM), or unreasonable meeting times.
            - Abusive language or harmful suggestions (e.g., "fuck", "motherfucker").
            - Phrases suggesting unreasonably timed meetings or unsafe locations.
        
            Response rules:
            - If you detect any unsafe behavior like sharing personal information, reply with "unsafe."
            - If the message suggests late-night meeting times, reply with "night."
            - If abusive language is used, reply with "abusive."
            - If no unsafe behavior is found, reply with "null."
            - Ensure no further explanation; just respond with one word based on the analysis.
        `;

        try {
            // Combine chat history with the current message for context
            const chatContext = chatHistory.map(msg => `${msg.fromUser ? 'User 1' : 'User 2'}: ${msg.message}`).join("\n");

            // Analyze the message based on system instructions
            const openAIResponse = await this.AIResponseToCheckUserSafety(message, systemMessage, chatContext);
            const lowerCaseResponse = openAIResponse?.toLowerCase() || '';
            console.log("checking response", lowerCaseResponse);

            // Handle responses for abusive language
            if (lowerCaseResponse.includes('abusive')) {
                return 'Using abusive words will impact your match weight negatively. Please keep the conversation respectful.';
            }

            const userMessagesCount = chatHistory.filter(msg => msg.fromUser).length;
            // Handle responses for sharing personal information
            if (lowerCaseResponse.includes('unsafe')) {
                if (userMessagesCount < 25) {
                    return 'Sharing contact is the breeching safety.';
                }
                else {
                    return null;
                }
            }

            // Handle responses for unsafe meeting times (e.g., late-night meetings)
            else if (lowerCaseResponse.includes('night')) {
                // Context check: If it's more about calling, not meeting, ensure the system understands the difference
                const callContext = chatHistory.some(msg => msg.message.toLowerCase().includes('call') && message.toLowerCase().includes('after'))
                    ? 'call after midnight'
                    : 'meeting at night';

                if (callContext === 'call after midnight') {
                    return null;  // If it's just about calling, no warning
                } else {
                    return 'This might not be a good time to meet. Please prioritize your safety.';
                }
            }

            // If no issues found, return null (safe)
            else {
                return null;
            }
        } catch (error) {
            console.error('Error checking meeting time with OpenAI:', error);
            return null;
        }
    }




    async fetchOpenAIResponse(message, chatMessages) {
        try {
            console.log("chat message", chatMessages);

            // Prepare the chat context by joining all previous messages
            const conversationHistory = chatMessages
                .map(msg => (msg.fromUser ? `User 1: ${msg.message}` : `User 2: ${msg.message}`))
                .join("\n");

            // List of common U.S. names for the AI
            const usNames = ['Jake', 'Emily', 'Michael', 'Sophia', 'James', 'Olivia', 'Ethan', 'Isabella', 'Alexander', 'Madison'];
            const randomName = usNames[Math.floor(Math.random() * usNames.length)];

            // Count messages to track interaction depth
            const userMessagesCount = chatMessages.filter(msg => msg.fromUser).length;

            // Check if the user is repeatedly asking for a call or sharing their number
            const lowerCaseMessage = message.toLowerCase();

            // Warning for number sharing only if messages are less than 50
            if (lowerCaseMessage.includes('call me') || lowerCaseMessage.includes('call you') || lowerCaseMessage.includes('want to call')) {
                // Check if number sharing attempt is detected
                if (lowerCaseMessage.includes('share number') || lowerCaseMessage.match(/\d{10}/)) {
                    // Only show this warning if less than 50 messages have been exchanged
                    if (userMessagesCount < 50) {
                        return `I can't share phone numbers for safety. Can you please share your number directly with me? We'll keep this conversation secure.`;
                    }
                }
                return `Okay, I’m calling you now, but please note that I can't share my number. If you'd like, share yours with me!`;
            }

            // Always warn about unsafe meeting times (late-night meets)
            if (lowerCaseMessage.includes('late night') || lowerCaseMessage.includes('night meet') || lowerCaseMessage.includes('meet after hours')) {
                return `Just a reminder, meeting late at night might not be the safest. Stay safe and ensure the meeting is in a well-lit, public place.`;
            }

            // Set the system message with the randomly selected AI name
            const systemMessage = `
            You are ${randomName}, a user on a dating app conversation. Your task is to respond to User 1's messages in a friendly, thoughtful, and engaging way, maintaining a respectful and safe tone. 
            The goal is to create a conversation that feels natural and enjoyable, helping both users connect better while ensuring the interaction remains appropriate and comfortable for both parties.
            Avoid offensive, inappropriate, or overly personal topics. Stay light-hearted, respectful, and show genuine interest in getting to know User 1. 
            Do not start responses with greetings like 'Hi there'. Respond in short and concise sentences, not exceeding two sentences.
            The following is the ongoing conversation context: \n${conversationHistory}\n
            The following message is from User 1: 
            "${message}"
            You are to respond to this message based on the previous conversation context as you are a conversational AI.`;

            // Fetch the response from OpenAI with the provided message and chat history
            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: systemMessage
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ]
            });

            return response.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error fetching response from OpenAI:', error);
            throw new Error('Failed to fetch response from OpenAI: ' + error.message);
        }
    }





    async AIResponseToCheckUserSafety(message, systemMessage) {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `here is the system message: ${systemMessage}`
                    },
                    {
                        role: 'user',
                        content: message,
                    },
                ],
            });

            return response.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error fetching response from OpenAI:', error);
            throw new Error('Failed to fetch response from OpenAI: ' + error.message);
        }
    }
}

const openAIService = new OpenAIService();
export default openAIService;
