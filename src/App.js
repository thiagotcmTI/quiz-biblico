import React, { useState, useEffect } from "react";
import Confetti from "react-confetti";
import { motion } from "framer-motion";
import facil from "./facil.json";
import medio from "./medio.json";
import dificil from "./dificil.json";

// Caminho para os arquivos de áudio
const certoAudio = new Audio("certo.wav");
const erradoAudio = new Audio("errado.wav");

const playAudio = (audio) => {
  audio.play();
  setTimeout(() => {
    audio.pause();
    audio.currentTime = 0;
  }, 1000);
};

// Função para embaralhar perguntas
const shuffleArray = (array) => {
  return array.sort(() => Math.random() - 0.5);
};

// Tela Inicial
const TelaInicial = ({ onStart }) => (
  <div
    className="flex flex-col items-center justify-center h-screen bg-black px-4 text-center"
    style={{
      backgroundImage: "url(bg2.png)",
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}
  >
    <h1 className="text-3xl md:text-5xl font-bold text-yellow-800 mb-6">
      Quiz Bíblico
    </h1>
    <motion.button
      whileHover={{ scale: 1.1 }}
      onClick={onStart}
      className="px-6 py-3 bg-yellow-500 text-white font-semibold text-lg rounded-lg shadow-md hover:bg-yellow-600 w-full md:w-auto"
    >
      INICIAR
    </motion.button>
  </div>
);

// Tela de Perguntas
const TelaPerguntas = ({ perguntas, onFinalizar }) => {
  const [perguntaAtual, setPerguntaAtual] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tempo, setTempo] = useState(30);
  const [acertos, setAcertos] = useState(0);
  const [erros, setErros] = useState(0);

  useEffect(() => {
    setTempo(30);
    setLoading(false);
  }, [perguntaAtual]);

  useEffect(() => {
    if (tempo === 0) {
      handleResposta(false);
    }
  }, [tempo]);

  useEffect(() => {
    if (tempo > 0) {
      const timer = setInterval(() => {
        setTempo((prevTempo) => prevTempo - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [tempo]);

  const handleResposta = (correta) => {
    if (loading) return;
    setLoading(true);

    if (correta) {
      setAcertos((prev) => prev + 1);
      playAudio(certoAudio);
    } else {
      setErros((prev) => prev + 1);
      playAudio(erradoAudio);
    }

    setTimeout(() => {
      if (perguntaAtual + 1 < 10) {
        setPerguntaAtual((prev) => prev + 1);
      } else {
        onFinalizar(acertos + (correta ? 1 : 0), erros + (correta ? 0 : 1));
      }
    }, 500);
  };

  return (
    <div
      className="flex flex-col items-center justify-center h-screen bg-black px-4 text-center"
      style={{
        backgroundImage: "url(pergunta.png)",
        backgroundSize: "1600px 800px",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
    >
      <h1 className="text-2xl md:text-3xl font-bold text-blue-800 mb-5  max-w-[90%] md:max-w-[60%]"
        style={{ maxWidth: "50%", width: "auto" }}
      >
        {perguntas[perguntaAtual].pergunta}
      </h1>
      {perguntas[perguntaAtual].opcoes.map((opcao, index) => (
        <motion.button
          key={index}
          whileHover={{ scale: 1.05 }}
          onClick={() => handleResposta(opcao.correta)}
          className="md:w-2/3 px-4 py-2 bg-blue-500 text-white rounded-lg mb-2 text-sm md:text-lg"
          style={{ maxWidth: "35%", minWidth: "20%", width: "auto" }}
          disabled={loading}
        >
          {opcao.texto}
        </motion.button>
      ))}
      <div className="mt-4 text-lg font-semibold text-red-600">
        Tempo Restante: {tempo}s
      </div>
    </div>
  );
};

// Tela de Resultado
const TelaResultado = ({ nivel, acertos, erros, onContinuar, onFinalizar }) => {
  const mensagens = {
    facil: "Parabéns! Você concluiu o nível fácil!\nAgora iremos começar o desafio no nível médio!\nEstá pronto?",
    medio: "Parabéns! Você concluiu o nível médio!\nAgora iremos começar o desafio no nível difícil!\nEstá pronto?",
    dificil: "Parabéns 🎉! Você concluiu o quiz em todas as dificuldades!",
  };

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-green-200 px-4 text-center">
      {nivel === "dificil" && (
        <Confetti width={windowSize.width} height={windowSize.height} />
      )}
      <h1 className="text-3xl md:text-5xl font-bold text-green-800 mb-6">
        Resultado
      </h1>
      <div className="bg-white p-4 rounded shadow mb-4 w-full md:w-1/3">
        <p className="text-lg md:text-xl">✅ Acertos: {acertos}</p>
        <p className="text-lg md:text-xl">❌ Erros: {erros}</p>
      </div>
      <p className="text-lg md:text-xl font-semibold text-green-800 text-center mb-4 whitespace-pre-line">
        {mensagens[nivel]}
      </p>
      <motion.button
        whileHover={{ scale: 1.1 }}
        onClick={nivel === "dificil" ? onFinalizar : onContinuar}
        className="px-6 py-3 bg-green-500 text-white font-semibold text-lg rounded-lg shadow-md hover:bg-green-600 w-full md:w-auto"
      >
        {nivel === "dificil" ? "FINALIZAR" : "COMEÇAR"}
      </motion.button>
    </div>
  );
};

// Componente Principal
const App = () => {
  const [tela, setTela] = useState("inicial");
  const [nivel, setNivel] = useState("facil");
  const [acertos, setAcertos] = useState(0);
  const [erros, setErros] = useState(0);

  const iniciarQuiz = () => {
    setNivel("facil");
    setAcertos(0);
    setErros(0);
    setTela("perguntas");
  };

  const finalizarNivel = (acertosFinais, errosFinais) => {
    setAcertos(acertosFinais);
    setErros(errosFinais);
    setTela("resultado");
  };

  const continuarParaProximoNivel = () => {
    if (nivel === "facil") setNivel("medio");
    else if (nivel === "medio") setNivel("dificil");
    setTela("perguntas");
  };

  return (
    <div>
      {tela === "inicial" && <TelaInicial onStart={iniciarQuiz} />}
      {tela === "perguntas" && (
        <TelaPerguntas perguntas={shuffleArray([...facil])} onFinalizar={finalizarNivel} />
      )}
      {tela === "resultado" && (
        <TelaResultado nivel={nivel} acertos={acertos} erros={erros} onContinuar={continuarParaProximoNivel} onFinalizar={() => window.location.reload()} />
      )}
    </div>
  );
};

export default App;
