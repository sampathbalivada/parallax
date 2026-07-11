# Project Parallax 🌌

> **One story. A different world for every viewer.**
> 
> *Director-authored adaptive cinema powered by Gemini Omni.*

---

## 🎬 The Vision

AI video generation is exploding, but it faces a massive hurdle: **it lacks structure, temporal consistency, and filmmaker intent.** AI models generate random clips rather than cohesive stories. At the same time, traditional cinema remains completely static—every viewer watches the exact same cut, regardless of their location, native language, or cultural context.

**Project Parallax** introduces a brand new cinematic format: **Director-Defined Adaptive Cinema**. 

Instead of letting AI run wild, the filmmaker remains in absolute control of the narrative. The director provides a canonical film, marks specific, non-disruptive **"adaptive slots"**, and defines rigid visual and narrative constraints (e.g., what *can* change vs. what *must* remain immutable). 

When a viewer watches, the film dynamically adapts to their location, language, and culture—editing key environmental elements, signs, and props on the fly to match their profile, without ever breaking the core narrative structure, timing, or pacing.

---

## 🚀 Key Features

*   **Adaptive Video Player:** A continuous, zero-latency playback engine that monitors segment preparation in the background. It instantly plays cached, personalized cuts or seamlessly slides in the filmmaker's original **canonical fallback** if generation is pending, ensuring zero buffering.
*   **Director Studio:** A control center where creators inspect adaptive slots, set visual and narrative constraints (e.g., preserving lighting, camera motion, or character consistency), generate test variants, and approve or reject AI-generated cuts.
*   **Real-time Side-by-Side Comparison:** A synchronized multi-stream player to compare three different localized cuts (e.g., matching viewer profiles in Visakhapatnam, Tokyo, and San Francisco) side by side with synchronized seek controls.
*   **Operational Job Dashboard:** A robust job monitoring panel showing the active queue, real-time prompt-optimization progress, and detailed validation logs for every asset.

---

## 🧠 Powered by Gemini

Project Parallax leverages Google’s state-of-the-art multi-modal models to orchestrate a secure, high-fidelity asset generation pipeline:

1.  **`gemini-omni-flash-preview` (Dynamic Video-to-Video Editing):** 
    Unlike simple text-to-video generators, Gemini Omni acts as an automated digital compositor. It ingests the canonical fallback video along with the personalized profile details and performs localized video-to-video editing (e.g., translating newspaper headlines, modifying a screen, or swapping environmental props) while preserving camera motion, foreground actors, lighting, and pacing.
2.  **`gemini-3.5-flash` (Automated Prompt Engineering):**
    To ensure Gemini Omni respects the director's rigid visual constraints, a secondary `gemini-3.5-flash` model acts as an in-line prompt optimizer. It compiles the director's metadata (prohibited changes, immutable facts) and the viewer's profile details into a highly-precise, imperative editing instruction fed into Gemini Omni.
3.  **Autonomous Quality Validation:**
    Before any generated segment is shown to the viewer, the system performs validation checks (aspect ratios, durations, and content validation) to guarantee a broadcast-quality cinematic experience.

---

## 🛠️ Tech Stack

*   **Frontend Framework:** Next.js 15+ (App Router) with TypeScript
*   **State Management:** Zustand
*   **Styling:** Tailwind CSS & ShadCN UI
*   **AI Orchestration:** `@google/genai` (Official Google Gen AI SDK)
*   **Storage:** Local filesystem caching with built-in fallback mechanisms

---

## 🧑‍💻 Getting Started

### 1. Clone & Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to experience the future of cinema.
