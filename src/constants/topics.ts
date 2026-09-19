// Conversation prompts by level. The learner answers in the language they are practising.
import type { SkillLevel } from '@/lib/types';

export const topics: Record<SkillLevel, string[]> = {
  beginner: [
    'Describe your morning routine.',
    'What did you eat today?',
    'Introduce your family.',
    'Describe your home, room by room.',
    'What is the weather like today?',
    'What do you do at work or school?',
    'Name five things in the room you are in.',
    'What is your favourite food, and why?',
    'What do you usually do at the weekend?',
    'Describe your best friend.',
    'Tell me about your favourite season.',
    'What time do you get up, and what do you do first?',
  ],
  intermediate: [
    'Tell me about the last trip you took.',
    'What would you do with a free day and no plans?',
    'Describe a typical celebration in your country.',
    'What is a skill you would like to learn, and why?',
    'Tell me about a book, film or series you liked recently.',
    'What was your favourite subject at school?',
    'Describe the town or city you grew up in.',
    'What do you find hard about the language you are practising?',
    'Give me directions from your home to the nearest shop.',
    'What is a habit you want to change?',
    'Describe your dream job.',
    'Tell me about a funny thing that happened to you.',
  ],
  advanced: [
    'What is a common misunderstanding foreigners have about your country?',
    'Should social media be regulated? Argue one side.',
    'Describe a decision that changed your life.',
    'What does your language have that the other language is missing?',
    'Explain a local tradition to someone who has never heard of it.',
    'Is it better to rent or to buy a home where you live?',
    'What would you change about the schools in your country?',
    'Tell a story from your childhood in as much detail as you can.',
    'How has your city changed in the last ten years?',
    'Describe a problem at work and how you solved it.',
    'What makes a good language partner?',
    'Debate: cities should ban cars from their centres.',
  ],
};

export function randomTopic(level: SkillLevel, avoid?: string): string {
  const pool = topics[level].filter((item) => item !== avoid);
  return pool[Math.floor(Math.random() * pool.length)];
}
