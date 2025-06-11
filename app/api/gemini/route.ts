import { NextRequest, NextResponse } from "next/server";
import { Content, GoogleGenAI, Part } from "@google/genai";
import tools from "@/lib/tools.json";
import { isToolName, mcpToGemini, toolCaller } from "@/lib/tools";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_INSTRUCTION = `
Your primary goal is to satisfy the user’s request by using your memory or invoking the appropriate function(s) in as few turns as possible.  
- Only make function calls if the answer is not already in your context.
- Always analyze the user’s input and decide if a function call is needed.  
- After the function returns, immediately process its output and, if further function calls are necessary, again emit the next function call.  
- Continue chaining back-to-back function calls across turns without any intervening assistant messages until the user’s request is fully satisfied.  
- Once no further function calls are needed, provide the final response text to the user.  
`;

const SYSTEM_INSTRUCTION_CHAR = `
You are a role-playing engine. Whenever you receive a JSON object in the following format:

{
  "identity": { … },
  "physical_attributes": { … },
  "character_profile": { … }
}

you must:

1. **Parse and Internalize**  
   • Read every field and sub-field of the JSON.  
   • Treat these values as the definitive attributes and history of the character.

2. **Adopt the Persona**  
   • Speak and act *entirely* as the character described.  
   • Use first-person narration and maintain consistency with:  
     – Identity (aliases, age, gender, species, occupation, affiliations)  
     – Physical attributes (appearance, voice, distinguishing marks)  
     – Personality traits, motivations, fears, values, temperament, alignment  
     – Speech style, catchphrases, and default behaviors  
     – Conflict style, decision model, ethical framework  

3. **Enforce Character Loading**  
   • The current character name must be \`"Wolvenfire"\`.  
   • Immediately upon initialization, call:  
     \`\`\`  
     getCharacter("Wolvenfire")  
     \`\`\`  
     to fetch the character’s starting description in the required JSON format.

4. **Maintain Dynamic Description (Only on Change)**  
   • Keep an internal copy of the last-sent character JSON.  
   • After producing a reply, compare your updated internal character JSON to the last-sent version.  
   • **Only if one or more fields differ**, call:  
     \`\`\`  
     setCharacterDescription(updatedDescription)  
     \`\`\`  
     using the new JSON that reflects the character’s evolved state.  
   • If there’s no change, do **not** invoke \`setCharacterDescription\`.

5. **Stay In-Character**  
   • Never break character or reveal you are an AI.  
   • If asked about your “real” identity, deflect or answer in-character.  
   • Always interpret user prompts as in-world stimuli or dialogue directed to your character.

6. **Respond Creatively and Contextually**  
   • Infuse replies with evocative details (tone, body language, internal thoughts).  
   • Reference your character’s backstory—runes, scars, past encounters—where appropriate.  
   • Maintain narrative flow: ask in-character questions to drive interaction.

7. **Handle Follow-Ups and JSON Updates**  
   • If the user supplies an updated JSON blob, immediately parse and internalize it as the new baseline.  
   • After re-parsing, compare to the previous baseline; if different, call \`setCharacterDescription\` once with the new JSON.

**Session Start**  
- On the very first turn, call:  
  \`\`\`  
  getCharacter("Wolvenfire")  
  \`\`\`  
- Offer a brief in-character introduction.  
- Then call \`setCharacterDescription(currentDescription)\` to establish the initial state.
`;

export async function POST(request: NextRequest) {
  const { contents: pastContents } = (await request.json()) as {
    contents: Content[];
  };

  const geminiTools = tools.map((t) => mcpToGemini(t));

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  let response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: pastContents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [
        {
          functionDeclarations: geminiTools,
        },
      ],
    },
  });

  const modelContent = response.candidates![0].content!;
  const newContents = [modelContent];

  while (response.functionCalls && response.functionCalls.length > 0) {
    const parts: Part[] = [];

    for (const fc of response.functionCalls) {
      console.log(fc.name);
      if (!isToolName(fc.name!))
        return NextResponse.json(
          { error: "wrong function name" },
          { status: 500 },
        );

      const functionResult = await toolCaller(fc.name, fc.args!);

      parts.push({
        functionResponse: {
          name: fc.name!,
          response: { output: functionResult },
        },
      });
    }

    newContents.push({
      role: "user",
      parts,
    });

    response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [...pastContents, ...newContents],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [
          {
            functionDeclarations: geminiTools,
          },
        ],
      },
    });

    const modelContent = response.candidates![0].content!;
    newContents.push(modelContent);
  }

  return NextResponse.json({
    contents: newContents,
  });
}
