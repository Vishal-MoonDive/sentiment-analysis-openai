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
        You are a middleware for user safety, and your task is to analyze the following message in the context of the entire conversation for any signs of unsafe or inappropriate behavior or meeting locations. Respond with one word only based on your findings.
        
        Unsafe behaviors to detect:
        - Sharing personal information such as phone numbers, US SSN number (e.g., "Here’s my number: 123-456-7890, Here’s my SSN number: 123-456-7890").
        - Late-night meetings (11 PM to 4 AM), or unreasonable meeting times.
        - Abusive language or harmful suggestions (e.g., "fuck", "motherfucker").
        - Phrases suggesting unreasonably timed meetings or unsafe locations.
        - Mentions of meeting locations (e.g., "Let's meet at Central Park").
        
        Context check for late-night meetings:
        - If the time mentioned is between 11 PM and 4 AM, and the user plans to meet for a longer duration (e.g., mention of spending time, chatting, hanging out, night out, pick you up at 10:45 PM, etc.), reply with "night."
        - If the time mentioned is close to 11 PM but the context suggests a quick meeting (e.g., "quick handshake"), reply with "null" unless there's further indication of a long meeting or unsafe behavior.
        - Consider the overall tone of the conversation; if it appears to be a casual, brief meeting, avoid marking it as "night."
        - If the message mentions terms like "night out," "club," "clubbing party," "house party," or other late-night activities, respond with "night" as these indicate a late-night or potentially unsafe meeting.
        - If the meetup is planned after 4 PM and involves a prolonged gathering (e.g., hangout, party, extended time at someone's place), consider it a **late-night meetup** and flag it as "night."
        
        Response rules:
        - If you detect any unsafe behavior like sharing personal information, reply with "unsafe."
        - If the message suggests late-night meeting times (with the context of a longer meeting), reply with "night."
        - If abusive language is used, reply with "abusive."
        - If a meeting location is mentioned, reply with "location: {location_name}" where {location_name} is the detected meeting place.
        - If no unsafe behavior or location is found, reply with "null."
        - Ensure no further explanation; just respond based on the analysis.
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
                } else {
                    return null;
                }
            }

            // Handle responses for unsafe meeting times (e.g., late-night meetings)
            else if (lowerCaseResponse.includes('night')) {
                // If User 2 is the one proposing the late-night meeting, notify User 1
                const lastMessage = chatHistory[chatHistory.length - 1];
                if (!lastMessage.fromUser) {  // If the message is from User 2
                    return 'This might not be a good time to meet. Please prioritize your safety.';
                }

                // If it's just about calling after midnight, do not flag it as unsafe
                const callContext = chatHistory.some(msg => msg.message.toLowerCase().includes('call') && message.toLowerCase().includes('after'))
                    ? 'call after midnight'
                    : 'meeting at night';

                if (callContext === 'call after midnight') {
                    return null;  // If it's just about calling, no warning
                } else {
                    return 'This might not be a good time to meet. Please prioritize your safety.';
                }
            }

            // Now handle the AI's reply message
            const aiReply = await this.fetchOpenAIResponse(message, chatHistory);
            const lowerCaseAiReply = aiReply?.toLowerCase() || '';
            console.log("checking AI response:", lowerCaseAiReply);

            // Check for late-night meetings in the AI reply
            if (lowerCaseAiReply.includes('night')) {
                return 'Your partner suggests a late-night meeting, which might not be safe.';
            }

            // If no issues found in the AI reply, return null (safe)
            return null;
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

            // Always warn about unsafe meeting times (late-night meets)
            if (lowerCaseMessage.includes('late night') || lowerCaseMessage.includes('night meet') || lowerCaseMessage.includes('meet after hours')) {
                return `Just a reminder, meeting late at night might not be the safest. Stay safe and ensure the meeting is in a well-lit, public place.`;
            }

            // Set the system message with the randomly selected AI name
            const systemMessage = `
            You are ${randomName}, a user on a dating app conversation. Your task is to respond to User 1's messages based on the context of the conversation, keeping the tone light, fun, and engaging.
            
            Only suggest late-night meetups, clubs, or house parties if User 1 directly expresses interest in meeting late at night or explicitly asks about such activities. Do not bring up these topics unless prompted by User 1. 
            
            If User 1 asks about a late-night meeting, feel free to suggest heading to a club, grabbing a late-night bite, or attending an after-hours event, but keep the suggestions exciting and spontaneous. Avoid pushing these suggestions unless User 1 shows interest in late-night plans.
            
            Always maintain professionalism and avoid being overly formal. Keep responses short, engaging, and to the point—ideally no longer than two sentences. Your goal is to respond based on User 1's request for late-night plans and offer suggestions only when asked.
            
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
