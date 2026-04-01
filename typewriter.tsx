import { useEffect, useMemo, useState } from "react";

const phrases = ["vicky", "a designer", "a coder", "a student", "always learning", "a problem solver"];
const glitches = "!<>-_\\/[]{}=+*^?#________";
const type_speed = 145;
const delete_speed = 95;
const glitch_speed = 55;
const pause_after_type = 2200;
const pause_after_delete = 340;

const longest_phrase = phrases.reduce(
  (longest, phrase) => (phrase.length > longest.length ? phrase : longest),
  "",
);

function randomGlitch() {
  return glitches[Math.floor(Math.random() * glitches.length)];
}

export default function TypewriterCycle() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [stableText, setStableText] = useState("");
  const [glitchText, setGlitchText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const currentPhrase = phrases[phraseIndex];
  const isComplete = stableText === currentPhrase;
  const isEmpty = stableText.length === 0;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!isDeleting) {
        if (isComplete) {
          setIsDeleting(true);
          return;
        }

        setStableText(currentPhrase.slice(0, stableText.length + 1));
        return;
      }

      if (!isEmpty) {
        setStableText(currentPhrase.slice(0, stableText.length - 1));
        return;
      }

      setIsDeleting(false);
      setPhraseIndex((index) => (index + 1) % phrases.length);
    }, !isDeleting && isComplete ? pause_after_type : isDeleting && isEmpty ? pause_after_delete : isDeleting ? delete_speed : type_speed);

    return () => window.clearTimeout(timeout);
  }, [currentPhrase, isComplete, isDeleting, isEmpty, stableText.length]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextChar = currentPhrase[stableText.length] ?? "";
      const flickerLength = isDeleting ? 0 : Math.min(2, currentPhrase.length - stableText.length);

      const suffix = Array.from({ length: flickerLength }, (_, index) =>
        index === 0 && nextChar ? nextChar : randomGlitch(),
      ).join("");

      setGlitchText(stableText + suffix);
    }, glitch_speed);

    return () => window.clearInterval(interval);
  }, [currentPhrase, isDeleting, stableText]);

  const displayText = useMemo(() => {
    if (isDeleting) {
      return stableText;
    }

    return glitchText || stableText;
  }, [glitchText, isDeleting, stableText]);

  return (
    <span className="title-cycle">
      <span className="title-cycle__line">
        <span className="title-cycle__ghost" aria-hidden="true">
          {longest_phrase}
        </span>
        <span className="title-cycle__active">
          <span className="title-cycle__word">{displayText}</span>
          <span className="title-cycle__cursor" aria-hidden="true" />
        </span>
      </span>
    </span>
  );
}
