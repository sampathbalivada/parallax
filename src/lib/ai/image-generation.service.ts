import { GoogleGenAI } from '@google/genai';
import { ViewerProfile, AdaptiveSlot } from '../types';
import fs from 'fs';
import path from 'path';

export const ImageGenerationService = {
  generateKeyframe: async (
    slot: AdaptiveSlot,
    profile: ViewerProfile,
    jobId: string
  ): Promise<string> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("No GEMINI_API_KEY found, falling back to mock image for", slot.id);
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      return "/media/mock-generated-image.jpg";
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Generate a cinematic keyframe for a short film. 
Location context: ${profile.city}, ${profile.country}.
Language/Cultural context: ${profile.culturalContext?.join(", ")}
Narrative Purpose: ${slot.narrativePurpose}
Preserve: ${slot.immutableFacts.join(", ")}
Visual Constraints: ${JSON.stringify(slot.visualConstraints)}
`;

      const response = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001', // Using Imagen 4.0 production model
          prompt,
          config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: "16:9"
          }
      });
      
      if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("No image generated");
      }

      const base64Image = response.generatedImages[0].image?.imageBytes;
      if (!base64Image) {
        throw new Error("No imageBytes in response");
      }
      
      // Save it to a file
      const fileName = `${jobId}.jpg`;
      const filePath = path.join(process.cwd(), 'public', 'media', 'generated', fileName);
      
      // Convert base64 to buffer and write to disk
      const buffer = Buffer.from(base64Image, 'base64');
      fs.writeFileSync(filePath, buffer);
      
      return `/media/generated/${fileName}`;
    } catch (error) {
      console.error("Image generation failed:", error);
      return "/media/mock-generated-image.jpg";
    }
  }
};
