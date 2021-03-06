import React, { useState, useEffect, useRef } from "react";
import "./index.css";
import MemoryCard from "./MemoryCard";
import StatusBar from "../StatusBar";
import ResultModal from "../ResultModal";
import * as utils from "../../utils";

const images = ["rm1", "rm2", "rm3", "rm4", "rm5", "rm6", "rm7", "rm8"];

function generateCards() {
  const cards = [];
  for (let i = 0; i < images.length; i++) {
    cards.push({
      key: i * 2,
      isFlipped: false,
      image: images[i],
      isLocked: false,
    });

    cards.push({
      key: i * 2 + 1,
      isFlipped: false,
      image: images[i],
      isLocked: false,
    });
  }
  return cards.sort(() => Math.random() - 0.5);
}

function flipCards(cards, keysToFlip) {
  return cards.map((card) => {
    if (keysToFlip.includes(card.key)) {
      return {
        ...card,
        isFlipped: !card.isFlipped,
      };
    }
    return card;
  });
}

function lockCards(cards, keysToLock) {
  return cards.map((card) => {
    if (keysToLock.includes(card.key)) {
      return {
        ...card,
        isLocked: true,
      };
    }
    return card;
  });
}

function Memory() {
  const [game, setGame] = useState({ cards: generateCards() });
  const [wrongPair, setWrongPair] = useState([]);

  const [win, setWin] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const timeoutIds = useRef([]);

  const [startTime, setStartTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const [scoreIsSaved, setScoreIsSaved] = useState(false);

  useEffect(() => {
    if (startTime === 0 || win) return;
    const intervalId = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [startTime, win]);

  useEffect(() => {
    if (wrongPair.length === 0) return;
    const timeoutId = setTimeout(() => {
      setGame((oldGame) => {
        const newCards = flipCards(
          oldGame.cards,
          wrongPair.map((card) => card.key)
        );
        return {
          ...oldGame,
          cards: newCards,
        };
      });
    }, 1000);
    timeoutIds.current = timeoutIds.current.concat(timeoutId);
  }, [wrongPair]);

  useEffect(() => {
    return () => {
      timeoutIds.current.forEach((id) => clearTimeout(id));
    };
  }, []);

  function onRestart() {
    timeoutIds.current.forEach((id) => clearTimeout(id));
    timeoutIds.current = [];
    setGame({ cards: generateCards() });
    setStartTime(0);
    setElapsedTime(0);
    setWin(false);
    setScoreIsSaved(false);
  }

  function onCardClick(card) {
    // If the card is already flipped there is nothing we need to do.
    if (card.isFlipped) return;

    setGame(({ cards, firstCard }) => {
      // The { cards, firstCard, secondCard } above is the decomposed game object.
      // These three variables represent the previous state, before a card was clicked.
      // We should return the new state, depending on the previous one and on the card that was clicked.
      let newCards = flipCards(cards, [card.key]);

      if (!firstCard) {
        return {
          cards: newCards,
          firstCard: card,
        };
      } else {
        if (firstCard.image !== card.image) {
          setWrongPair([firstCard, card]);
        } else {
          newCards = lockCards(newCards, [firstCard.key, card.key]);
          if (newCards.every((card) => card.isLocked)) {
            setWin(true);
            setShowModal(true);
            setElapsedTime(Date.now() - startTime);
          }
        }
        return {
          cards: newCards,
        };
      }
    });

    setStartTime((oldStartTime) => {
      if (oldStartTime === 0) {
        return Date.now();
      }
      return oldStartTime;
    });
  }

  function fetchLeaderboard() {
    return utils.fetchLeaderboard("memory", [["timeMs", "asc"]]).then((lb) => {
      return lb.map(
        (entry, i) =>
          `${i + 1}. ${entry.name}: ${utils.prettifyTime(entry.timeMs)}`
      );
    });
  }

  function saveScore(name) {
    if (name) {
      utils
        .saveScore("memory", { name: name, timeMs: elapsedTime })
        .then(() => setScoreIsSaved(true));
    }
  }

  return (
    <div className="game-container">
      <StatusBar
        status={"Time: " + utils.prettifyTime(elapsedTime)}
        onRestart={onRestart}
        setShowModal={setShowModal}
      ></StatusBar>
      <div className="memory-grid">
        {game.cards.map((card) => (
          <MemoryCard {...card} onClick={() => onCardClick(card)}></MemoryCard>
        ))}
      </div>
      <ResultModal
        show={showModal}
        header={win ? "Congratulations, you won!" : "Leaderboard"}
        body={
          win ? "Your time was " + utils.prettifyTime(elapsedTime) + "." : ""
        }
        handleClose={() => setShowModal(false)}
        fetchLeaderboard={fetchLeaderboard}
        saveScore={win && !scoreIsSaved ? saveScore : undefined}
      ></ResultModal>
    </div>
  );
}

export default Memory;
