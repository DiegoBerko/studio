
'use server';
/**
 * @fileOverview A Genkit flow for server-side file operations.
 *
 * - saveGameSummary - A function that saves a game summary to the filesystem.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fs from 'fs/promises';
import path from 'path';

// New flow for saving game summaries
const GameSummaryInputSchema = z.object({
  homeTeamName: z.string(),
  awayTeamName: z.string(),
  homeScore: z.number(),
  awayScore: z.number(),
  categoryName: z.string(),
  gameSummary: z.any(),
});
export type GameSummaryInput = z.infer<typeof GameSummaryInputSchema>;

export async function saveGameSummary(input: GameSummaryInput): Promise<{ success: boolean; message: string; filePath?: string; }> {
  return saveGameSummaryFlow(input);
}

const saveGameSummaryFlow = ai.defineFlow(
  {
    name: 'saveGameSummaryFlow',
    inputSchema: GameSummaryInputSchema,
    outputSchema: z.object({ success: z.boolean(), message: z.string(), filePath: z.string().optional() }),
  },
  async (input) => {
    try {
      const summariesDir = path.join(process.cwd(), 'src', 'resumenes');
      
      await fs.mkdir(summariesDir, { recursive: true });

      const date = new Date();
      const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`;
      
      const fileName = `${dateString} - Cat ${input.categoryName} - ${input.homeTeamName} vs ${input.awayTeamName}.json`;
      const sanitizedFileName = fileName.replace(/[/\\?%*:|"<>]/g, '-');
      const filePath = path.join(summariesDir, sanitizedFileName);

      const contentToSave = {
        date: date.toISOString(),
        category: input.categoryName,
        homeTeam: input.homeTeamName,
        awayTeam: input.awayTeamName,
        finalScore: `${input.homeScore} - ${input.awayScore}`,
        summary: input.gameSummary,
      };

      await fs.writeFile(filePath, JSON.stringify(contentToSave, null, 2), 'utf-8');

      return {
        success: true,
        message: `Game summary saved successfully to ${filePath}`,
        filePath: filePath,
      };
    } catch (error) {
      console.error('Error saving game summary:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Error saving game summary on the server: ${errorMessage}`,
      };
    }
  }
);
