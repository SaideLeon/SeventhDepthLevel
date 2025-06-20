
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-academic-response-flow.ts';
import '@/ai/flows/generate-simple-response-flow.ts';
import '@/ai/flows/detect-topic-flow.ts';
import '@/ai/flows/detect-query-type-flow.ts';
import '@/ai/flows/generate-session-title-flow.ts';
// import '@/ai/flows/generate-fichamento-flow.ts'; // Fichamento agora é via Groq
import '@/ai/flows/generate-index-flow.ts';
// import '@/ai/flows/generate-introduction-flow.ts'; // Consolidado em generate-academic-response-flow
// import '@/ai/flows/generate-academic-section-flow.ts'; // Consolidado em generate-academic-response-flow
// import '@/ai/flows/generate-conclusion-flow.ts'; // Consolidado em generate-academic-response-flow
// import '@/ai/flows/generate-bibliography-flow.ts'; // Consolidado em generate-academic-response-flow
    
