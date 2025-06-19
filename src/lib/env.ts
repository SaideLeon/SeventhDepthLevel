
import dotenv from 'dotenv';

dotenv.config();

interface EnvironmentVariables {
  GROQ_API_KEY?: string;
}

export const env: EnvironmentVariables = {
  GROQ_API_KEY: process.env.GROQ_API_KEY,
};
