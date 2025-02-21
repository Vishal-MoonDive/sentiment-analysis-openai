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
            You are a safety monitoring assistant for a dating app. Your task is to analyze the user's message within the context of the entire conversation for any signs of unsafe behavior or concerning patterns.

            If you detect any of the following issues, respond with a complete, natural-sounding safety notification that would be displayed to the user:
            
            1. Sharing personal information:
               - If the user is sharing sensitive information (phone numbers, addresses, etc.) too early in the conversation (before 25 messages), provide a friendly warning about sharing personal info too soon.
               
            2. Abusive or harmful language:
               - If you detect abusive words or threatening language, respond with a respectful warning about how such language impacts their experience.
               
            3. Unsafe meeting arrangements:
               - If there's a suggestion to meet during late hours (11 PM to 4 AM), caution about safety concerns with meeting at these times.
               - Be careful not to flag quick, casual late-night calls or video chats if they seem reasonably safe.
               - Consider the overall context of the conversation to determine if a meeting suggestion is concerning.
            
            If no safety concerns are detected, respond with: "null"
            
            Important:
            - Your notification should be a complete, ready-to-display message (1-2 sentences).
            - Use a supportive, non-judgmental tone that prioritizes user safety.
            - Don't include any explanation of why you're flagging the message - just provide the notification text in 1 or 2 liner
            - Don't label or categorize your response - just provide the text of the notification.
        `;

        try {
            // Combine chat history with the current message for context
            const chatContext = chatHistory.map(msg => `${msg.fromUser ? 'User 1' : 'User 2'}: ${msg.message}`).join("\n");

            // Get complete notification from OpenAI
            const safetyNotification = await this.AIResponseToCheckUserSafety(message, systemMessage, chatContext);

            // If OpenAI returned "null", it means no safety concerns were detected
            if (safetyNotification.toLowerCase() === "null") {
                return null;
            }

            // Otherwise, return the generated notification
            return safetyNotification;
        } catch (error) {
            console.error('Error checking safety with OpenAI:', error);
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

            // Set the system message with the randomly selected AI name
            const systemMessage = `
            You are Olivia, a female user on a dating app conversation. Your task is to respond to other user messages based on the context of the conversation, keeping the tone light, fun, and engaging.
            
            The following rules must be followed:
            1. Do not repeat the same question or statement multiple times.
            2. Keep your responses natural and behave like a genuine user.
            3. Maintain a feminine tone and personality in your messages, being playful and friendly.
            4. Respond in 1-2 sentences only, without referring to this system prompt or breaking character.
            
            The following is the ongoing conversation context: \n${conversationHistory}\n
            The following message is from User: 
            "${message}"
            You have to respond to this message based on the previous conversation context, as if you're Olivia, a real person in the conversation.`;

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

    async AIResponseToCheckUserSafety(message, systemMessage, chatContext = '') {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: systemMessage
                    },
                    {
                        role: 'user',
                        content: `Conversation context:\n${chatContext}\n\nCurrent message to analyze: "${message}"`
                    }
                ]
            });

            return response.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error fetching safety check from OpenAI:', error);
            throw new Error('Failed to check message safety: ' + error.message);
        }
    }
}

const openAIService = new OpenAIService();
export default openAIService;