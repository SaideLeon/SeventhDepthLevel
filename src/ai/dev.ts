
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-academic-response-flow.ts';
import '@/ai/flows/generate-simple-response-flow.ts';
import '@/ai/flows/detect-topic-flow.ts';
import '@/ai/flows/detect-query-type-flow.ts';
import '@/ai/flows/generate-session-title-flow.ts';
// import '@/ai/flows/generate-fichamento-flow.ts'; // Removed, Groq agent handles this
import '@/ai/flows/generate-index-flow.ts';
import '@/ai/flows/generate-introduction-flow.ts';
import '@/ai/flows/generate-academic-section-flow.ts';
import '@/ai/flows/generate-conclusion-flow.ts';
import '@/ai/flows/generate-bibliography-flow.ts';
    
