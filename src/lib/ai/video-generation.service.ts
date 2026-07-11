import { ViewerProfile, AdaptiveSlot } from '../types';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { GenerationQueue } from '../jobs/generation-queue';

function localAdInstruction(slot: AdaptiveSlot, profile: ViewerProfile) {
  if (slot.type !== "ADSPOT_BILLBOARD") return "";

  return `Adspot/Billboard localization requirements:
- Generate plausible advertising creative that is specifically relevant to viewers in ${profile.city}, ${profile.country}.
- Use ${profile.languageLabel} (${profile.locale}) for visible ad copy when it fits the scene, including local script conventions where appropriate.
- Prefer locally relevant categories, brands, public-service themes, retail offers, entertainment, food, transit, telecom, or events that would feel natural in ${profile.city}.
- Avoid generic global ads unless they are clearly adapted to ${profile.city}, ${profile.country}.
- Keep the advertisement diegetic: it must look like it belongs on the existing billboard/ad surface and must not alter camera motion, people, foreground action, lighting, timing, or surrounding environment.`;
}

export const VideoGenerationService = {
  generateVideoInsert: async (
    slot: AdaptiveSlot,
    profile: ViewerProfile,
    jobId: string
  ): Promise<string> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("No GEMINI_API_KEY found, falling back to mock video for", slot.id);
      await new Promise(resolve => setTimeout(resolve, 4000));
      return slot.canonicalFallbackUrl;
    }

    try {
      console.log(`Starting real gemini-omni-flash-preview video localization for job ${jobId}...`);
      const ai = new GoogleGenAI({ apiKey });

      // Resolve the physical absolute path to the local fallback video
      const relativeFallbackPath = slot.canonicalFallbackUrl.startsWith('/') 
        ? slot.canonicalFallbackUrl.substring(1) 
        : slot.canonicalFallbackUrl;
      const localFallbackPath = path.join(process.cwd(), 'public', relativeFallbackPath);

      if (!fs.existsSync(localFallbackPath)) {
        console.warn(`Local fallback video not found at: ${localFallbackPath}. Falling back to default URI.`);
        return slot.canonicalFallbackUrl;
      }

      console.log(`Uploading fallback video: ${localFallbackPath}`);
      const uploadResult = await ai.files.upload({
        file: localFallbackPath,
        config: {
          mimeType: 'video/mp4',
          displayName: `fallback-${slot.id}`
        }
      });

      console.log(`Uploaded successfully! File reference: ${uploadResult.name}. Polling status...`);

      // Poll until video state is ACTIVE
      type GeminiFileState = { state?: string; name?: string; uri?: string; mimeType?: string };
      let file = uploadResult as unknown as GeminiFileState;
      let retries = 0;
      const maxRetries = 20; // Up to 100 seconds
      const fileName = uploadResult.name;
      if (!fileName) {
        throw new Error("Upload did not return a valid file name");
      }

      while ((file.state === 'PROCESSING' || file.state === 'STATE_UNSPECIFIED') && retries < maxRetries) {
        console.log(`Video processing state: ${file.state}. Waiting 5s (attempt ${retries + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        file = await ai.files.get({ name: fileName }) as unknown as GeminiFileState;
        retries++;
      }

      const currentState = file.state;
      if (currentState !== 'ACTIVE') {
        throw new Error(`Video file activation failed or timed out. Current state: ${currentState}`);
      }
      console.log('Video is now ACTIVE on Gemini. Initiating video-to-video editing...');

      // Build the editing/personalization query using gemini-3.5-flash
      let promptText = "";
      const culturalContextStr = profile.culturalContext?.join(", ") || "None";
      const editableFieldsStr = slot.editableFields?.join(", ") || "background props";
      const immutableFactsStr = slot.immutableFacts?.join(", ") || "None";
      const prohibitedChangesStr = slot.prohibitedChanges?.join(", ") || "None";
      const adInstruction = localAdInstruction(slot, profile);

      try {
        console.log(`Generating optimized prompt with gemini-3.5-flash for slot ${slot.id}...`);
        const systemInstruction = `You are an expert AI prompt engineer specializing in video editing and video-to-video style-transfer and modification models (specifically Gemini Omni).
Your job is to generate a highly detailed, precise, and instruction-rich prompt for the Gemini Omni video-to-video editing model.
This prompt must direct Gemini Omni to perform localized personalizations and modifications on ONLY the specific editable parts of the video, while keeping the background, characters, camera movement, timing, and atmosphere perfectly identical to the original clip, so that the editing is seamless and the rest of the scene is completely untouched.`;

        const preGenerationPrompt = `Please generate an editing prompt for the Gemini Omni video-to-video model.
Use the following inputs to design the prompt:
- Narrative purpose: ${slot.narrativePurpose}
- Segment type: ${slot.type}
- Target Editable Fields (ONLY these should be changed): ${editableFieldsStr}
- Immutable Facts (Strictly preserve these as-is): ${immutableFactsStr}
- Prohibited Changes: ${prohibitedChangesStr}
- Viewer Profile:
  * City: ${profile.city}
  * Country: ${profile.country}
  * Locale/Language: ${profile.locale} (${profile.languageLabel})
  * Cultural Context: ${culturalContextStr}
${adInstruction ? `\n- Additional Slot-Specific Requirements:\n${adInstruction}` : ""}

Instructions for the generated prompt:
1. It must specify exactly what to change (e.g. modify the 'welcome board', 'tail number', billboard, poster, sponsored ad spot, storefront ad, or digital ad panel to match the viewer's city, language script, and cultural theme).
2. It must explicitly state what elements of the video to keep identical (the camera motion, actors, lighting, and rest of the scene).
3. For Adspot/Billboard segments, the generated prompt must make the advertisement locally relevant to the viewer location and language, not generic.
4. Ensure the tone is clear, direct, and imperative.
5. Output ONLY the finalized prompt that will be fed to Gemini Omni. Do NOT include any intro or wrap-up text (like "Here is your prompt:"). Output the pure prompt directly.`;

        const promptResponse = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: preGenerationPrompt,
          config: {
            systemInstruction: systemInstruction,
          }
        });

        if (promptResponse.text) {
          promptText = promptResponse.text.trim();
          console.log(`Generated Optimized Prompt successfully:\n${promptText}`);
        } else {
          throw new Error("Empty response from gemini-3.5-flash");
        }
      } catch (promptError) {
        console.warn("Failed to generate optimized prompt with gemini-3.5-flash, falling back to static prompt template.", promptError);
        promptText = `Based on this video clip, generate a new personalized, edited version of this segment.
      - Viewer's Location: ${profile.city}, ${profile.country}.
      - Cultural context: ${culturalContextStr}.
      - Narrative goal: ${slot.narrativePurpose}.
      - Segment type: ${slot.type}.
      - Localized editable elements: ${editableFieldsStr}.
      ${adInstruction}
      Please modify the editable parts (such as signs, logos, flags, screens, billboards, posters, sponsored ad spots, storefront ads, digital ad panels, text, or specific background elements) to fit this location, cultural theme, and narrative.
      IMPORTANT: Keep the camera motion, overall timing, actors, and overall scene structure exactly identical to the original clip. Only perform seamless editing/replacement on the target localized props.`;
      }

      // Store the generated/optimized videoPrompt in the job queue
      try {
        await GenerationQueue.updateJob(jobId, { videoPrompt: promptText });
      } catch (jobUpdateError) {
        console.error("Failed to update job with videoPrompt:", jobUpdateError);
      }

      console.log(`Sending edit prompt: ${promptText}`);

      const interaction = await ai.interactions.create({
        model: 'gemini-omni-flash-preview',
        input: [
          {
            type: 'video',
            uri: file.uri,
            mime_type: file.mimeType
          },
          {
            type: 'text',
            text: promptText
          }
        ],
        response_format: {
          type: 'video',
          delivery: 'uri'
        }
      });

      if (!interaction.output_video?.uri) {
        throw new Error('Omni interaction did not return a valid output video URI');
      }

      console.log(`Omni video edit completed! Output URI: ${interaction.output_video.uri}`);

      // Parse output file reference
      const fileIdMatch = interaction.output_video.uri.match(/files\/[a-zA-Z0-9]+/);
      if (!fileIdMatch) {
        throw new Error(`Could not parse file reference from output URI: ${interaction.output_video.uri}`);
      }
      const fileId = fileIdMatch[0];

      // Prepare local output directory
      const outputDir = path.join(process.cwd(), 'public', 'media', 'generated');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputFileName = `${jobId}.mp4`;
      const outputFilePath = path.join(outputDir, outputFileName);

      console.log(`Downloading personalized segment to: ${outputFilePath}`);
      await ai.files.download({
        file: fileId,
        downloadPath: outputFilePath
      });

      console.log(`Download complete! Serving personalized segment at: /media/generated/${outputFileName}`);
      return `/media/generated/${outputFileName}`;

    } catch (error) {
      console.error("Video-to-video editing failed. Falling back to default canonical video segment.", error);
      return slot.canonicalFallbackUrl;
    }
  }
};
