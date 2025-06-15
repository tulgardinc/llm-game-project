"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { trpcClient } from "@/lib/trpc";
import { Content } from "@google/genai";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const chatRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [dialogueHistory, setDialogueHistory] = useState<Content[]>([]);
  const [chatHistory, setChatHistory] = useState<Content[]>([]);

  const handleMessageSubmit = async () => {
    const newMessage = {
      role: "user",
      parts: [{ text: input }],
    } as Content;

    setInput("");

    setChatHistory((h) => [...h, newMessage]);
    setDialogueHistory((h) => [...h, newMessage]);

    const newContents = await trpcClient.gemini.makeCharacterRequest.mutate({
      pastContents: [...dialogueHistory, newMessage],
    });
    const charResponse = newContents[newContents.length - 1];

    const newStoryParagraph = await trpcClient.gemini.makeWriterRequest.mutate({
      pastStory: chatHistory
        .filter((m) => m.role == "model")
        .map((m) => m?.parts?.[0].text)
        .join(""),
      userRequest: newMessage,
      charResponse,
    });

    console.log([...dialogueHistory, ...newContents]);
    console.log([...chatHistory, newStoryParagraph]);
    setDialogueHistory((h) => [...h, ...newContents]);
    setChatHistory((h) => [...h, newStoryParagraph]);
  };

  useEffect(() => {}, []);

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
              m.parts &&
              m.parts.length > 0 &&
              !m.parts.some((p) => p.functionCall) &&
              m.parts[0].text && (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="text-2xl">{m.role}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl">
                    {m.parts?.[0].text}
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
