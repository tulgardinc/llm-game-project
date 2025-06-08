"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Content } from "@google/genai";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const chatRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState<Content[]>([
    {
      role: "user",
      parts: [{ text: "wow!" }],
    },
    {
      role: "model",
      parts: [{ text: "kewl!" }],
    },
  ]);

  const handleMessageSubmit = async () => {
    const newMessage = {
      role: "user",
      parts: [{ text: input }],
    } as Content;

    setInput("");

    setChatHistory((h) => [...h, newMessage]);

    console.log(chatHistory);

    const response = await fetch("api/gemini", {
      method: "POST",
      body: JSON.stringify({ contents: [...chatHistory, newMessage] }),
    });
    const { contents } = (await response.json()) as { contents: Content[] };
    setChatHistory((h) => [...h, ...contents]);
  };

  useEffect(() => {
    chatRef.current!.lastElementChild!.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  return (
    <div className="h-screen w-screen flex justify-center bg-neutral-900">
      <div className="flex flex-col w-[80%] p-8 gap-5">
        <div ref={chatRef} className="grow flex flex-col gap-3 overflow-y-auto">
          {chatHistory.map(
            (m, i) =>
              m.parts &&
              m.parts.length > 0 &&
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
