"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { trpcClient } from "@/lib/trpc";
import { DialogueContent } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

const PLAYER_CHAR_NAME = "Jonathan Heir";
const CHAR_NAME = "Torvin Stonebeard";

export default function Home() {
  const chatRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [dialogueHistory, setDialogueHistory] = useState<DialogueContent[]>([]);
  const [chatHistory, setChatHistory] = useState<DialogueContent[]>([]);

  const handleMessageSubmit = async () => {
    const newMessage: DialogueContent = {
      content: {
        role: "user",
        parts: [{ text: input }],
      },
      characterName: PLAYER_CHAR_NAME,
    };

    setInput("");

    setChatHistory((h) => [...h, newMessage]);
    setDialogueHistory((h) => [...h, newMessage]);

    const newCharContent = await trpcClient.gemini.makeCharacterRequest.mutate({
      pastContents: [
        ...dialogueHistory.map((h) => h.content),
        newMessage.content,
      ],
    });
    const charDialogueResponse: DialogueContent = {
      content: newCharContent,
      characterName: CHAR_NAME,
    };

    const newStoryParagraph = await trpcClient.gemini.makeWriterRequest.mutate({
      pastStory: chatHistory
        .filter((m) => m.content.role == "model")
        .map((m) => m.content.parts?.[0].text)
        .join(""),
      userRequest: newMessage,
      charResponse: charDialogueResponse,
    });

    setDialogueHistory((h) => [...h, charDialogueResponse]);
    setChatHistory((h) => [...h, newStoryParagraph]);
  };

  useEffect(() => {
    const current = chatRef.current;
    if (!current) return;
    const child = current.lastElementChild;
    if (!child) return;
    child.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  return (
    <div className="h-screen w-screen flex justify-center bg-neutral-900">
      <div className="flex flex-col w-[80%] p-8 gap-5">
        <div ref={chatRef} className="grow flex flex-col gap-3 overflow-y-auto">
          {chatHistory.map(
            (m, i) =>
              m.content.parts &&
              m.content.parts.length > 0 &&
              !m.content.parts.some((p) => p.functionCall) &&
              m.content.parts[0].text && (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="text-2xl">
                      {m.characterName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl">
                    {m.content.parts?.[0].text}
                  </CardContent>
                </Card>
              ),
          )}
        </div>
        <Textarea
          value={input}
          onKeyDown={(e) => {
            if (e.key == "Enter") {
              e.preventDefault();
              handleMessageSubmit();
            }
          }}
          onChange={(e) => setInput(e.currentTarget.value)}
          className="shrink basis-[200px] text-xl bg-neutral-300"
        />
      </div>
    </div>
  );
}
