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

    checkForPhoneNumber(message) {
        // List of spelled-out numbers that should be excluded
        const spelledOutNumbers = [
            'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'
        ];

        // Normalize the message to lowercase
        const sanitizedMessage = message.toLowerCase();

        // Check for the presence of any spelled-out numbers
        const countSpelledOutNumbers = spelledOutNumbers.filter(word => sanitizedMessage.includes(word)).length;

        // If the count of spelled-out numbers is 5 or more, reject it
        if (countSpelledOutNumbers >= 5) {
            return true; // Phone number detected (spelled out or numeric)
        }

        // Remove non-numeric characters for digit count checking
        const digitsOnlyMessage = sanitizedMessage.replace(/\D/g, '');

        // If the digit count is 5 or more, return true
        if (digitsOnlyMessage.length >= 5) {
            return true;
        }

        // Otherwise, return false
        return false;
    }

    checkForSensitiveContent(message) {
        // Check for phone numbers
        if (this.checkForPhoneNumber(message)) {
            return {
                hasSensitiveContent: true,
                warning: 'This message contains sensitive content (phone number). It will still be sent, but be cautious about security.'
            };
        }

        // Check for SSN patterns
        const ssnPattern = /\b\d{3}[-]?\d{2}[-]?\d{4}\b/;
        if (ssnPattern.test(message)) {
            return {
                hasSensitiveContent: true,
                warning: 'This message contains sensitive content (SSN). It will still be sent, but avoid sharing personal information.'
            };
        }

        // No sensitive content found
        return {
            hasSensitiveContent: false,
            warning: null
        };
    }

    async checkMeetingTime(message) {
        try {
            const systemMessage = `Please analyze the following message to determine if the suggested meeting time is unsafe:
            Unsafe meeting times include:
            - Between 11 PM and 4 AM (late night).
            - Phrases like "tonight," "after midnight," or "late night" that imply a late-night meeting time.
            Context clarification:
            - "Night" refers to 8 PM to 11 PM.
            - "Late night" refers to 11 PM to 4 AM.
            - "After 12" refers to midnight unless explicitly stated otherwise.
            - Consider phrases like "tonight" or "today at night" to indicate the user's current day.`;

            const openAIResponse = await this.fetchOpenAIResponse(message, systemMessage);

            if (openAIResponse && openAIResponse.toLowerCase().includes('not')) {
                return 'This might not be a good time to meet. Please prioritize your safety.';
            } else if (openAIResponse && openAIResponse.toLowerCase().includes('null')) {
                return null;
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error checking meeting time with OpenAI:', error);
            return null;
        }
    }

    async fetchOpenAIResponse(message, systemMessage) {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `You are simulating a conversation between two users on a dating app who have recently matched. Your role is to assist User 2 in responding to User 1 while ensuring the safety and appropriateness of the messages.
                        The following is the conversation from User 1 to User 2:
                        "${message}"`
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
