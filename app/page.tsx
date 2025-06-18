"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { INITIAL_GAME_STATE, INITIAL_STORY } from "@/lib/system-instructions";
import { trpcClient } from "@/lib/trpc";
import { Content } from "@google/genai";
import { useEffect, useRef, useState } from "react";

const PLAYER_CHAR_NAME = "Jonathan Heir";

export default function Home() {
  const chatRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [intentionHistory, setIntentionHistory] = useState<{
    [key: string]: Content[];
  }>({
    "Maelin the Ember-Eyed": [],
    "Borgrin Stonebelly": [],
  });
  const [storyHistory, setStoryHistory] = useState<Content[]>([
    {
      parts: [
        {
          text: INITIAL_STORY,
        },
      ],
      role: "model",
    },
  ]);
  const [gameState, setGameState] = useState<string[]>([INITIAL_GAME_STATE]);

  const handleMessageSubmit = async () => {
    const playerInput = input;

    setStoryHistory((h) => [
      ...h,
      { parts: [{ text: playerInput }], role: "user" },
    ]);

    setInput("");

    const charRequests: Promise<[string, Content]>[] = [];
    for (const charName of Object.keys(intentionHistory)) {
      charRequests.push(
        (async () => {
          const resp = await trpcClient.gemini.makeCharacterRequest.mutate({
            charName,
            pastIntentions: [...intentionHistory[charName]],
            gameState,
          });
          return [charName, resp];
        })(),
      );
    }

    const charIntentions = await Promise.all(charRequests);

    charIntentions.forEach((i) => console.log(i));

    const actions = charIntentions.map(
      (i) => (JSON.parse(i[1].parts![0].text!) as { actions: string }).actions,
    );

    const actionIntentions = [
      {
        characterName: PLAYER_CHAR_NAME,
        currentIntention: playerInput,
      },
    ];

    for (let i = 0; i < charIntentions.length; i++) {
      const intention = charIntentions[i];
      setIntentionHistory((history) => ({
        ...history,
        [intention[0]]: [...history[intention[0]], intention[1]],
      }));
      actionIntentions.push({
        characterName: intention[0],
        currentIntention: actions[i],
      });
    }

    const gameStateDelta = await trpcClient.gemini.makeLinearizerRequest.mutate(
      {
        gameState: gameState.join("\n"),
        intentions: actionIntentions,
      },
    );
    console.log(gameStateDelta);
    setGameState([...gameState, gameStateDelta]);

    const newStoryDelta = await trpcClient.gemini.makeWriterRequest.mutate({
      pastStory: storyHistory.join(""),
      gameState: gameStateDelta,
    });
    setStoryHistory((h) => [...h, newStoryDelta]);
  };

  useEffect(() => {
    const current = chatRef.current;
    if (!current) return;
    const child = current.lastElementChild;
    if (!child) return;
    child.scrollIntoView({ behavior: "smooth" });
  }, [storyHistory]);

  return (
    <div className="h-screen w-screen flex justify-center bg-neutral-900">
      <div className="flex flex-col w-[80%] p-8 gap-5">
        <div ref={chatRef} className="grow flex flex-col gap-3 overflow-y-auto">
          {storyHistory.map(
            (m, i) =>
              m.parts &&
              m.parts.length > 0 &&
              !m.parts.some((p) => p.functionCall) &&
              m.parts[0].text && (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="text-2xl">
                      {m.role == "user" ? PLAYER_CHAR_NAME : "Story"}
                    </CardTitle>
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
