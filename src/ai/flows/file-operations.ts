
'use server';
/**
 * @fileOverview A Genkit flow for server-side file operations.
 *
 * - performFileOperation - A function that handles reading and writing files on the server.
 * - FileOperationInput - The input type for the performFileOperation function.
 * - FileOperationOutput - The return type for the performFileOperation function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fs from 'fs';
import path from 'path';

export const FileOperationInputSchema = z.object({
  operation: z.enum(['read', 'write']).describe("The file operation to perform."),
  content: z.string().optional().describe("The content to write to the file. Required for 'write' operation."),
});
export type FileOperationInput = z.infer<typeof FileOperationInputSchema>;

export const FileOperationOutputSchema = z.object({
  success: z.boolean().describe("Whether the operation was successful."),
  content: z.string().optional().describe("The content read from the file. Returned for 'read' operation."),
  message: z.string().describe("A message describing the result of the operation."),
});
export type FileOperationOutput = z.infer<typeof FileOperationOutputSchema>;

export async function performFileOperation(input: FileOperationInput): Promise<FileOperationOutput> {
  return fileOperationFlow(input);
}

const fileOperationFlow = ai.defineFlow(
  {
    name: 'fileOperationFlow',
    inputSchema: FileOperationInputSchema,
    outputSchema: FileOperationOutputSchema,
  },
  async (input) => {
    const filePath = path.join(process.cwd(), 'src', 'data', 'sample.txt');

    switch (input.operation) {
      case 'read':
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          return {
            success: true,
            content,
            message: 'File read successfully from the server.',
          };
        } catch (error) {
          console.error('Error reading file:', error);
          return {
            success: false,
            message: 'Error reading file on the server. The file may not exist. Check server logs.',
          };
        }

      case 'write':
        if (!input.content) {
          return {
            success: false,
            message: 'Content is required for write operation.',
          };
        }
        try {
          // In a real application, you would write to a persistent store.
          // For this example, we'll log to the console to demonstrate server-side execution.
          // Writing to the local filesystem in a serverless environment is often ephemeral.
          console.log(`Simulating write to ${filePath} on the server:`);
          console.log('---BEGIN-CONTENT---');
          console.log(input.content);
          console.log('---END-CONTENT---');
          
          return {
            success: true,
            message: 'Simulated file write on the server. Check the server console logs to see the content.',
          };
        } catch (error) {
          console.error('Error "writing" file:', error);
          return {
            success: false,
            message: 'An error occurred during the simulated write operation. Check server logs.',
          };
        }
        
      default:
        return {
          success: false,
          message: 'Invalid operation specified.',
        };
    }
  }
);
