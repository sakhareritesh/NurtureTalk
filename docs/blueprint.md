# **App Name**: NurtureTalk

## Core Features:

- NGO-Focused Chat: Engage in conversations, answering queries and providing information exclusively related to NGO activities and relevant topics. Refuses queries outside of this scope by informing users that their query is outside the system's context.
- Contextual Awareness: Maintains conversation context throughout the interaction using Pinecone as a vector database to provide coherent and relevant responses. Reasoning tool ensures the LLM utilizes previous turns of conversation effectively.
- PDF Report Generation: Generates PDF reports upon user request, summarizing key aspects of the conversation. Utilizes tool-calling for generating summary from current conversation, then converting summary into PDF for download.
- Interactive UI: A clean and intuitive interface for seamless interaction with the chatbot.
- Message Display: Displays messages in a chronological format, distinguishing between user and bot messages.
- Downloadable Reports: Provides options to download generated PDF reports.

## Style Guidelines:

- Primary color: Soft blue (#7BB5C7) for a calm and trustworthy feel, representing reliability and openness.
- Background color: Light, desaturated blue (#F0F4F5) to provide a gentle backdrop that doesn't distract from the content.
- Accent color: Warm coral (#E9967A) to highlight important interactive elements and calls to action, contrasting against the primary blue.
- Body font: 'PT Sans', a humanist sans-serif, for easy readability and a modern feel.
- Headline font: 'PT Sans', a humanist sans-serif, complementing body font for clear hierarchy
- Use clear and simple icons representing different topics related to NGOs, with a style that matches the overall clean aesthetic.
- A clean and organized layout, with a clear separation between user input, bot output, and report options.
- Subtle animations on user interactions, such as sending a message or generating a report, to provide feedback and a smoother experience.