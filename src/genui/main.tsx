import { createRoot } from "react-dom/client";
import { App, type Phase, type ShellApi } from "./App";
import "./shell.css";

/**
 * Progressive enhancement. index.html already holds the hero, the form, the
 * example prompts, and the no-JavaScript link row. This file takes over the
 * form and renders the composed page into #composed. Nothing static is
 * rewritten, so the page a crawler sees is the page a visitor starts on.
 */

const HINTS = [
  "Ask to see my resume, my blogs, or play a game",
  "Ask what I have built, or who I built it for",
  "Tell me what you came for",
];
const HINT_MS = 5000;

const form = document.getElementById("ask") as HTMLFormElement | null;
const input = document.getElementById("ask-input") as HTMLInputElement | null;
const submit = document.getElementById("ask-submit") as HTMLButtonElement | null;
const chips = document.getElementById("ask-chips");
const composed = document.getElementById("composed");

if (form && input && composed) {
  let api: ShellApi | null = null;
  let phase: Phase = "idle";

  const setPhase = (next: Phase) => {
    phase = next;
    document.body.dataset.shell = next;
    if (next !== "idle") stopHints();
    if (next === "composed")
      input.placeholder = "Ask for a change, or ask for something else";
  };

  const setBusy = (busy: boolean) => {
    if (submit) submit.disabled = busy;
    input.setAttribute("aria-busy", busy ? "true" : "false");
  };

  const ask = (text: string) => {
    if (!text.trim()) return;
    api?.send(text);
    input.value = "";
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    ask(input.value);
  });

  chips?.addEventListener("click", (event) => {
    const chip = (event.target as HTMLElement).closest<HTMLElement>("[data-prompt]");
    if (!chip) return;
    const prompt = chip.dataset.prompt ?? chip.textContent ?? "";
    input.value = prompt;
    ask(prompt);
  });

  // Rotate the hint while the visitor has not started typing. Anyone who asked
  // for reduced motion keeps the single static placeholder.
  let hintTimer: number | undefined;
  const stillMoves = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

  function stopHints() {
    if (hintTimer !== undefined) window.clearInterval(hintTimer);
    hintTimer = undefined;
  }

  function startHints() {
    if (!stillMoves || !input) return;
    let index = 0;
    hintTimer = window.setInterval(() => {
      if (phase !== "idle" || input.value || document.activeElement === input) return;
      index = (index + 1) % HINTS.length;
      input.placeholder = HINTS[index]!;
    }, HINT_MS);
  }

  startHints();
  input.addEventListener("input", () => {
    if (input.value) stopHints();
  });

  createRoot(composed).render(
    <App
      register={(next) => {
        api = next;
      }}
      onPhase={setPhase}
      onBusy={setBusy}
    />,
  );
}
