import React, { useEffect, useMemo, useState } from "react";
import Confetti from "react-confetti";
import { motion } from "framer-motion";
import facil from "./facil.json";
import medio from "./medio.json";
import dificil from "./dificil.json";
import "./App.css";

const QUESTION_LIMIT = 10;
const ROUND_TIME = 30;
const API_URL = window.QUIZ_BIBLICO_API_URL || process.env.REACT_APP_QUESTION_API_URL || "";

const levelOrder = ["facil", "medio", "dificil"];

const levelMeta = {
  facil: {
    label: "Fácil",
    badge: "Primeiros passos",
    subtitle: "Perguntas essenciais, personagens conhecidos e fatos centrais.",
    color: "green",
    time: 35,
  },
  medio: {
    label: "Médio",
    badge: "Desafio bíblico",
    subtitle: "Mais contexto, livros, lugares e detalhes das narrativas.",
    color: "blue",
    time: 30,
  },
  dificil: {
    label: "Difícil",
    badge: "Modo especialista",
    subtitle: "Perguntas mais específicas para testar profundidade.",
    color: "gold",
    time: 25,
  },
};

const sourceQuestions = {
  facil,
  medio,
  dificil,
};

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

function normalizeText(value) {
  return repairText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeQuestion(question, level) {
  const opcoes = question.opcoes
    .map((option) => ({
      texto: repairText(option.texto),
      correta: Boolean(option.correta),
    }))
    .filter((option) => option.texto);

  return {
    id: `${level}-${normalizeText(question.pergunta)}`,
    pergunta: repairText(question.pergunta),
    opcoes,
    level,
  };
}

function buildQuestionBank() {
  const seen = new Set();
  const bank = {
    facil: [],
    medio: [],
    dificil: [],
  };

  levelOrder.forEach((level) => {
    sourceQuestions[level].forEach((rawQuestion) => {
      const question = normalizeQuestion(rawQuestion, level);
      const key = normalizeText(question.pergunta);

      if (!key || seen.has(key) || question.opcoes.length < 3) return;

      seen.add(key);
      bank[level].push(question);
    });
  });

  return bank;
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

async function fetchApiQuestions(level) {
  if (!API_URL) return null;

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      theme: "quiz bíblico",
      level,
      amount: QUESTION_LIMIT,
      language: "pt-BR",
    }),
  });

  if (!response.ok) {
    throw new Error("Não foi possível gerar perguntas pela API.");
  }

  const data = await response.json();

  if (!Array.isArray(data.questions)) return null;

  return data.questions.map((question, index) => ({
    id: `api-${level}-${index}-${normalizeText(question.pergunta)}`,
    pergunta: repairText(question.pergunta),
    level,
    opcoes: question.opcoes.map((option) => ({
      texto: repairText(option.texto),
      correta: Boolean(option.correta),
    })),
  }));
}

function HomeScreen({ selectedLevel, onSelectLevel, onStart, questionBank, apiEnabled }) {
  const totalQuestions = Object.values(questionBank).reduce((total, questions) => total + questions.length, 0);

  return (
    <main className="screen home-screen">
      <section className="home-layout">
        <div className="hero-stage">
          <div className="orbital-map" aria-hidden="true">
            <span className="orbit orbit-one" />
            <span className="orbit orbit-two" />
            <span className="orbit orbit-three" />
            <span className="core-mark">QB</span>
          </div>

          <div className="hero-copy">
            <p className="eyebrow">Quiz Bíblico</p>
            <h1>Uma jornada interativa por histórias, personagens e livros da Bíblia.</h1>
            <p>
              Escolha a dificuldade, responda contra o tempo, acompanhe seu progresso e revise as respostas no final.
            </p>
            <div className="hero-actions">
              <button className="primary-button" onClick={onStart} type="button">
                Começar desafio
              </button>
              <span className="api-pill">
                {apiEnabled ? "API de perguntas ativa" : "Banco local inteligente"}
              </span>
            </div>
          </div>
        </div>

        <aside className="start-panel" aria-label="Escolha de nível">
          <span className="panel-kicker">Modo de jogo</span>
          <h2>Escolha sua dificuldade</h2>

          <div className="level-options">
            {levelOrder.map((levelKey) => (
              <button
                key={levelKey}
                className={`level-card ${selectedLevel === levelKey ? "is-active" : ""}`}
                onClick={() => onSelectLevel(levelKey)}
                type="button"
              >
                <span className={`level-dot ${levelMeta[levelKey].color}`} />
                <strong>{levelMeta[levelKey].label}</strong>
                <small>{levelMeta[levelKey].subtitle}</small>
                <em>{questionBank[levelKey].length} perguntas únicas</em>
              </button>
            ))}
          </div>

          <div className="bank-summary">
            <strong>{totalQuestions}</strong>
            <span>perguntas únicas disponíveis</span>
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
  const [timeLeft, setTimeLeft] = useState(levelMeta[level].time || ROUND_TIME);

  const currentQuestion = questions[currentIndex];
  const correctOption = getCorrectOption(currentQuestion);
  const hasAnswered = Boolean(selectedAnswer);
  const progress = Math.round(((currentIndex + 1) / questions.length) * 100);
  const timeLimit = levelMeta[level].time || ROUND_TIME;

  useEffect(() => {
    setTimeLeft(timeLimit);
    setSelectedAnswer(null);
  }, [currentIndex, timeLimit]);

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
    // handleAnswer intentionally reads the active question at the moment time ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, hasAnswered]);

  function handleAnswer(option) {
    if (selectedAnswer) return;

    const result = {
      id: currentQuestion.id,
      question: currentQuestion.pergunta,
      selected: option.texto,
      correct: correctOption.texto,
      isCorrect: option.correta,
      timedOut: option.timedOut || false,
      level,
    };

    setSelectedAnswer(result);
    setAnswers((previous) => [...previous, result]);
    playSound(option.correta ? certoAudio : erradoAudio);
  }

  function handleNext() {
    const finalAnswers = selectedAnswer && !answers.some((answer) => answer.id === selectedAnswer.id)
      ? [...answers, selectedAnswer]
      : answers;

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((index) => index + 1);
      return;
    }

    onFinish(finalAnswers);
  }

  return (
    <main className="screen quiz-screen">
      <section className="quiz-shell">
        <header className="quiz-topbar">
          <div>
            <p className="eyebrow">{levelMeta[level].badge}</p>
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
          className={`question-card level-${levelMeta[level].color}`}
          key={currentQuestion.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div className="question-meta">
            <span>{levelMeta[level].label}</span>
            <span>{Math.max(0, questions.length - currentIndex - 1)} restantes</span>
          </div>

          <p className="question-label">Pergunta</p>
          <h2>{currentQuestion.pergunta}</h2>

          <div className="answer-grid">
            {currentQuestion.opcoes.map((option, index) => {
              const isSelected = selectedAnswer?.selected === option.texto;
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
                  {option.texto}
                </button>
              );
            })}
          </div>

          {selectedAnswer && (
            <motion.div
              className={selectedAnswer.isCorrect ? "feedback success" : "feedback error"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
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
            </motion.div>
          )}
        </motion.article>
      </section>
    </main>
  );
}

function ResultScreen({ level, answers, onPlayAgain, onNextLevel, onHome }) {
  const correctAnswers = answers.filter((answer) => answer.isCorrect).length;
  const percentage = answers.length ? Math.round((correctAnswers / answers.length) * 100) : 0;
  const currentLevelIndex = levelOrder.indexOf(level);
  const nextLevel = levelOrder[currentLevelIndex + 1];
  const isFinalLevel = !nextLevel;
  const resultMessage = percentage >= 80
    ? "Excelente desempenho. Você está dominando este nível."
    : percentage >= 60
      ? "Bom resultado. Revise os erros e avance com confiança."
      : "Vale revisar com calma e tentar novamente antes de subir o nível.";

  return (
    <main className="screen result-screen">
      {percentage >= 80 && <Confetti recycle={false} numberOfPieces={260} />}
      <section className="result-card">
        <div className="result-hero">
          <p className="eyebrow">Resultado</p>
          <h1>{percentage}%</h1>
          <p>{resultMessage}</p>
        </div>

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
            <strong>{levelMeta[level].label}</strong>
            <span>nível jogado</span>
          </div>
        </div>

        <div className="result-actions">
          {!isFinalLevel && percentage >= 60 && (
            <button className="primary-button" onClick={() => onNextLevel(nextLevel)} type="button">
              Ir para nível {levelMeta[nextLevel].label}
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
            <article key={`${answer.id}-${index}`}>
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
  const questionBank = useMemo(() => buildQuestionBank(), []);
  const [screen, setScreen] = useState("home");
  const [selectedLevel, setSelectedLevel] = useState("facil");
  const [answers, setAnswers] = useState([]);
  const [roundQuestions, setRoundQuestions] = useState([]);
  const [usedQuestionIds, setUsedQuestionIds] = useState(() => new Set());
  const [apiEnabled, setApiEnabled] = useState(Boolean(API_URL));

  async function startQuiz(level = selectedLevel) {
    setSelectedLevel(level);
    setAnswers([]);

    try {
      const apiQuestions = await fetchApiQuestions(level);

      if (apiQuestions?.length) {
        setApiEnabled(true);
        setRoundQuestions(shuffle(apiQuestions).slice(0, QUESTION_LIMIT));
        setScreen("quiz");
        return;
      }
    } catch {
      setApiEnabled(false);
    }

    const availableQuestions = questionBank[level].filter((question) => !usedQuestionIds.has(question.id));
    const fallbackPool = availableQuestions.length >= QUESTION_LIMIT ? availableQuestions : questionBank[level];
    const selectedQuestions = shuffle(fallbackPool).slice(0, QUESTION_LIMIT);

    setUsedQuestionIds((previous) => {
      const next = new Set(previous);
      selectedQuestions.forEach((question) => next.add(question.id));
      return next;
    });
    setRoundQuestions(selectedQuestions);
    setScreen("quiz");
  }

  function finishQuiz(finalAnswers) {
    setAnswers(finalAnswers);
    setScreen("result");
  }

  function goHome() {
    setScreen("home");
  }

  return (
    <>
      {screen === "home" && (
        <HomeScreen
          selectedLevel={selectedLevel}
          onSelectLevel={setSelectedLevel}
          onStart={() => startQuiz()}
          questionBank={questionBank}
          apiEnabled={apiEnabled}
        />
      )}

      {screen === "quiz" && (
        <QuizScreen
          level={selectedLevel}
          questions={roundQuestions}
          onFinish={finishQuiz}
          onQuit={goHome}
        />
      )}

      {screen === "result" && (
        <ResultScreen
          level={selectedLevel}
          answers={answers}
          onPlayAgain={() => startQuiz()}
          onNextLevel={(level) => startQuiz(level)}
          onHome={goHome}
        />
      )}
    </>
  );
}

export default App;
