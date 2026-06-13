import React, { useEffect, useMemo, useState } from "react";
import Confetti from "react-confetti";
import { motion } from "framer-motion";
import facil from "./facil.json";
import medio from "./medio.json";
import dificil from "./dificil.json";
import "./App.css";

const QUESTION_LIMIT = 10;
const ROUND_TIME = 30;

const levels = {
  facil: {
    label: "Fácil",
    subtitle: "Perguntas essenciais para aquecer.",
    data: facil,
    color: "green",
  },
  medio: {
    label: "Médio",
    subtitle: "Mais personagens, livros e detalhes.",
    data: medio,
    color: "blue",
  },
  dificil: {
    label: "Difícil",
    subtitle: "Desafio para quem já conhece bem a Bíblia.",
    data: dificil,
    color: "gold",
  },
};

const levelOrder = ["facil", "medio", "dificil"];

const certoAudio = new Audio(`${process.env.PUBLIC_URL}/certo.wav`);
const erradoAudio = new Audio(`${process.env.PUBLIC_URL}/errado.wav`);

function repairText(value) {
  if (typeof value !== "string") return value;

  try {
    return decodeURIComponent(escape(value));
  } catch {
    return value;
  }
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function getCorrectOption(question) {
  return question.opcoes.find((option) => option.correta);
}

function playSound(audio) {
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function HomeScreen({ selectedLevel, onSelectLevel, onStart }) {
  return (
    <main className="screen home-screen">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Quiz Bíblico</p>
          <h1>Teste seu conhecimento bíblico em uma jornada por níveis.</h1>
          <p>
            Escolha a dificuldade, responda com tempo limitado e revise seu
            desempenho ao final. Uma experiência simples, bonita e feita para
            jogar no celular ou no computador.
          </p>
          <button className="primary-button" onClick={onStart}>
            Começar desafio
          </button>
        </div>

        <aside className="start-panel" aria-label="Escolha de nível">
          <span className="panel-kicker">Modo de jogo</span>
          <h2>Escolha seu nível</h2>
          <div className="level-options">
            {levelOrder.map((levelKey) => (
              <button
                key={levelKey}
                className={`level-card ${selectedLevel === levelKey ? "is-active" : ""}`}
                onClick={() => onSelectLevel(levelKey)}
                type="button"
              >
                <strong>{levels[levelKey].label}</strong>
                <span>{levels[levelKey].subtitle}</span>
              </button>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

function QuizScreen({ level, questions, onFinish, onQuit }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);

  const currentQuestion = questions[currentIndex];
  const correctOption = getCorrectOption(currentQuestion);
  const hasAnswered = Boolean(selectedAnswer);
  const progress = Math.round(((currentIndex + 1) / questions.length) * 100);

  useEffect(() => {
    setTimeLeft(ROUND_TIME);
    setSelectedAnswer(null);
  }, [currentIndex]);

  useEffect(() => {
    if (hasAnswered) return undefined;

    if (timeLeft === 0) {
      handleAnswer({
        texto: "Tempo esgotado",
        correta: false,
        timedOut: true,
      });
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((time) => time - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
    // handleAnswer reads the latest question state and is intentionally kept local to this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, hasAnswered]);

  function handleAnswer(option) {
    if (selectedAnswer) return;

    const result = {
      question: repairText(currentQuestion.pergunta),
      selected: repairText(option.texto),
      correct: repairText(correctOption.texto),
      isCorrect: option.correta,
      timedOut: option.timedOut || false,
    };

    setSelectedAnswer(result);
    setAnswers((previous) => [...previous, result]);
    playSound(option.correta ? certoAudio : erradoAudio);
  }

  function handleNext() {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((index) => index + 1);
      return;
    }

    onFinish(answers);
  }

  return (
    <main className="screen quiz-screen">
      <section className="quiz-shell">
        <header className="quiz-topbar">
          <div>
            <p className="eyebrow">Nível {levels[level].label}</p>
            <h1>Questão {currentIndex + 1} de {questions.length}</h1>
          </div>
          <button className="ghost-button" onClick={onQuit} type="button">
            Sair
          </button>
        </header>

        <div className="status-row">
          <div className="progress-track" aria-label="Progresso da rodada">
            <span style={{ width: `${progress}%` }} />
          </div>
          <strong className={timeLeft <= 8 ? "timer is-low" : "timer"}>
            {timeLeft}s
          </strong>
        </div>

        <motion.article
          className="question-card"
          key={currentQuestion.pergunta}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          <p className="question-label">Pergunta</p>
          <h2>{repairText(currentQuestion.pergunta)}</h2>

          <div className="answer-grid">
            {currentQuestion.opcoes.map((option, index) => {
              const optionText = repairText(option.texto);
              const isSelected = selectedAnswer?.selected === optionText;
              const shouldShowCorrect = hasAnswered && option.correta;

              return (
                <button
                  key={`${option.texto}-${index}`}
                  className={[
                    "answer-button",
                    isSelected ? "is-selected" : "",
                    shouldShowCorrect ? "is-correct" : "",
                    isSelected && !option.correta ? "is-wrong" : "",
                  ].join(" ")}
                  onClick={() => handleAnswer(option)}
                  disabled={hasAnswered}
                  type="button"
                >
                  <span>{String.fromCharCode(65 + index)}</span>
                  {optionText}
                </button>
              );
            })}
          </div>

          {selectedAnswer && (
            <div className={selectedAnswer.isCorrect ? "feedback success" : "feedback error"}>
              <strong>
                {selectedAnswer.isCorrect ? "Resposta correta!" : "Quase lá."}
              </strong>
              <p>
                {selectedAnswer.isCorrect
                  ? "Boa! Você avançou com segurança."
                  : `Resposta correta: ${selectedAnswer.correct}.`}
              </p>
              <button className="primary-button compact" onClick={handleNext} type="button">
                {currentIndex + 1 < questions.length ? "Próxima pergunta" : "Ver resultado"}
              </button>
            </div>
          )}
        </motion.article>
      </section>
    </main>
  );
}

function ResultScreen({ level, answers, onPlayAgain, onNextLevel, onHome }) {
  const correctAnswers = answers.filter((answer) => answer.isCorrect).length;
  const percentage = Math.round((correctAnswers / answers.length) * 100);
  const currentLevelIndex = levelOrder.indexOf(level);
  const nextLevel = levelOrder[currentLevelIndex + 1];
  const isFinalLevel = !nextLevel;

  return (
    <main className="screen result-screen">
      {percentage >= 80 && <Confetti recycle={false} numberOfPieces={260} />}
      <section className="result-card">
        <p className="eyebrow">Resultado</p>
        <h1>{percentage}% de aproveitamento</h1>
        <p>
          Você acertou {correctAnswers} de {answers.length} perguntas no nível
          {" "}{levels[level].label}.
        </p>

        <div className="score-grid">
          <div>
            <strong>{correctAnswers}</strong>
            <span>acertos</span>
          </div>
          <div>
            <strong>{answers.length - correctAnswers}</strong>
            <span>erros</span>
          </div>
          <div>
            <strong>{answers.length}</strong>
            <span>perguntas</span>
          </div>
        </div>

        <div className="result-actions">
          {!isFinalLevel && percentage >= 60 && (
            <button className="primary-button" onClick={() => onNextLevel(nextLevel)} type="button">
              Ir para nível {levels[nextLevel].label}
            </button>
          )}
          <button className="secondary-button" onClick={onPlayAgain} type="button">
            Jogar novamente
          </button>
          <button className="ghost-button dark" onClick={onHome} type="button">
            Voltar ao início
          </button>
        </div>

        <details className="review-list">
          <summary>Revisar respostas</summary>
          {answers.map((answer, index) => (
            <article key={`${answer.question}-${index}`}>
              <strong>{index + 1}. {answer.question}</strong>
              <p>Sua resposta: {answer.selected}</p>
              {!answer.isCorrect && <p>Correta: {answer.correct}</p>}
            </article>
          ))}
        </details>
      </section>
    </main>
  );
}

function App() {
  const [screen, setScreen] = useState("home");
  const [selectedLevel, setSelectedLevel] = useState("facil");
  const [answers, setAnswers] = useState([]);
  const [roundSeed, setRoundSeed] = useState(0);

  const questions = useMemo(() => {
    void roundSeed;
    return shuffle(levels[selectedLevel].data).slice(0, QUESTION_LIMIT);
  }, [selectedLevel, roundSeed]);

  function startQuiz(level = selectedLevel) {
    setSelectedLevel(level);
    setAnswers([]);
    setRoundSeed((seed) => seed + 1);
    setScreen("quiz");
  }

  function finishQuiz(finalAnswers) {
    setAnswers(finalAnswers);
    setScreen("result");
  }

  return (
    <>
      {screen === "home" && (
        <HomeScreen
          selectedLevel={selectedLevel}
          onSelectLevel={setSelectedLevel}
          onStart={() => startQuiz()}
        />
      )}

      {screen === "quiz" && (
        <QuizScreen
          level={selectedLevel}
          questions={questions}
          onFinish={finishQuiz}
          onQuit={() => setScreen("home")}
        />
      )}

      {screen === "result" && (
        <ResultScreen
          level={selectedLevel}
          answers={answers}
          onPlayAgain={() => startQuiz()}
          onNextLevel={(level) => startQuiz(level)}
          onHome={() => setScreen("home")}
        />
      )}
    </>
  );
}

export default App;
