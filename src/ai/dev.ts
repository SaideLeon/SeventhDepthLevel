
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-academic-response-flow.ts';
import '@/ai/flows/generate-simple-response-flow.ts';
import '@/ai/flows/detect-topic-flow.ts';
// import '@/ai/flows/decide-search-flow.ts'; // Removed this line
import '@/ai/flows/detect-query-type-flow.ts';

    
