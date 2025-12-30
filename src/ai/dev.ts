import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-interaction-completion.ts';
import '@/ai/flows/summarize-notes.ts';
import '@/ai/flows/enrich-donors.ts';
