
"use strict";

// ======================================================
// 🌹 SANGUE CARMESIM
// SISTEMA DE PONTUAÇÃO DOS MEMBROS
// ======================================================

// ELEMENTOS HTML
const btnCalcular = document.getElementById("calcular");
const btnLimpar = document.getElementById("limpar");
const textarea = document.getElementById("relatorio");
const pontuacaoEl = document.getElementById("pontuacao");
const mensagemEl = document.getElementById("mensagem");
const resultadoWhatsapp = document.getElementById("resultadoWhatsapp");

// ======================================================
// 🎯 CONFIGURAÇÕES DE PONTUAÇÃO
// ======================================================

const CONFIG = {
    LEITURA: {
        "✅": 20,
        "✔️": 15,
        "✖️": 10,
        "❌": -20
    },

    FEEDBACK: {
        excelente: 50,
        bom: 30,
        ruim: -15,
        normal: 0
    },

    OBRA_EXTRA: {
        obrigatoriaLida: 50,
        obrigatoriaNaoLida: -50,
        naoObrigatoriaLida: 70
    },

    NAO_FEZ: -5,

    COMENTARIOS: {
        quantidade: 5,
        pontos: 10
    },

    CAPITULOS: 50
};

// ======================================================
// 🧠 FUNÇÕES UTILITÁRIAS
// ======================================================

function extrairNumero(regex, texto) {
    const match = texto.match(regex);

    if (!match) return 0;

    const numero = Number.parseInt(match[1], 10);

    return Number.isFinite(numero) ? numero : 0;
}

// Extrai números de campos específicos.
function extrairCampoNumerico(nomeCampo, texto) {
    const campo = nomeCampo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const regex = new RegExp(
        "^\\s*" + campo + "\\s*:\\s*(\\d+)\\s*$",
        "im"
    );

    return extrairNumero(regex, texto);
}

// ======================================================
// 👤 IDENTIFICAÇÃO DO MEMBRO
// ======================================================

function extrairNome(textoMembro) {
    const match = textoMembro.match(/💮\s*([^\r\n*]+)/);

    if (!match) return null;

    return match[1]
        .trim()
        .replace(/\*+$/g, "")
        .replace(/[.!;,]+$/g, "")
        .trim();
}

// ======================================================
// 🔥 OBRA EXTRA
// ======================================================

function calcularObraExtra(texto) {
    let pontos = 0;

    const obrigatoriaLida =
        /^\s*-\s*Obrigatória\s*→\s*🔖/im.test(texto);

    const obrigatoriaNaoLida =
        /^\s*-\s*Obrigatória\s*→\s*🏷️?/im.test(texto);

    const naoObrigatoriaLida =
        /^\s*-\s*Não\s+obrigatória\s*→\s*🔖/im.test(texto);

    if (obrigatoriaLida) {
        pontos += CONFIG.OBRA_EXTRA.obrigatoriaLida;
    }

    if (obrigatoriaNaoLida) {
        pontos += CONFIG.OBRA_EXTRA.obrigatoriaNaoLida;
    }

    if (naoObrigatoriaLida) {
        pontos += CONFIG.OBRA_EXTRA.naoObrigatoriaLida;
    }

    return pontos;
}

// ======================================================
// 📖 LEITURA
// ======================================================

function calcularLeitura(texto) {
    // Localiza somente o conteúdo da seção de leitura.
    const match = texto.match(
        /Como foi sua leitura[^\r\n]*(?:\r?\n)([\s\S]*?)(?:\r?\n\s*\+|$)/i
    );

    if (!match) return 0;

    const trechoLeitura = match[1];

    let pontos = 0;

    Object.entries(CONFIG.LEITURA).forEach(([emoji, valor]) => {
        const quantidade = trechoLeitura.split(emoji).length - 1;

        pontos += quantidade * valor;
    });

    // Emojis não cadastrados, como 💤,
    // não geram pontos nem penalidades.
    return pontos;
}

// ======================================================
// 💬 FEEDBACKS
// ======================================================

function calcularFeedbacks(texto) {
    const excelente = extrairCampoNumerico("excelente", texto);
    const bom = extrairCampoNumerico("bom", texto);
    const ruim = extrairCampoNumerico("ruim", texto);

    return (
        excelente * CONFIG.FEEDBACK.excelente +
        bom * CONFIG.FEEDBACK.bom +
        ruim * CONFIG.FEEDBACK.ruim
    );
}

// ======================================================
// ❌ NÃO FEZ
// ======================================================

function calcularNaoFez(texto) {
    // Só aplica a penalidade quando a opção estiver marcada.
    // Aceita tanto (x) quanto (×).

    const regex =
        /^\s*\(\s*[x×]\s*\)\s*Não\s+fez\s*\(quantos\?\)\s*→\s*(\d+)/im;

    const quantidade = extrairNumero(regex, texto);

    return quantidade * CONFIG.NAO_FEZ;
}

// ======================================================
// 💬 COMENTÁRIOS
// ======================================================

function calcularComentarios(texto) {
    const comentarios = extrairNumero(
        /^\s*Comentários\s*=\s*(\d+)\s*$/im,
        texto
    );

    return (
        Math.floor(comentarios / CONFIG.COMENTARIOS.quantidade) *
        CONFIG.COMENTARIOS.pontos
    );
}

// ======================================================
// 📚 CAPÍTULOS
// ======================================================

function calcularCapitulos(texto) {
    const capitulos = extrairNumero(
        /^\s*Capítulos lidos\s*=\s*(\d+)\s*$/im,
        texto
    );

    return capitulos * CONFIG.CAPITULOS;
}

// ======================================================
// 🧮 CÁLCULO INDIVIDUAL
// ======================================================

function calcularMembro(textoMembro) {
    const detalhes = {
        obraExtra: calcularObraExtra(textoMembro),
        leitura: calcularLeitura(textoMembro),
        feedbacks: calcularFeedbacks(textoMembro),
        naoFez: calcularNaoFez(textoMembro),
        comentarios: calcularComentarios(textoMembro),
        capitulos: calcularCapitulos(textoMembro)
    };

    const total = Object.values(detalhes).reduce(
        (soma, pontos) => soma + pontos,
        0
    );

    return {
        total,
        detalhes
    };
}

// ======================================================
// 📋 SEPARAÇÃO DOS RELATÓRIOS
// ======================================================

function separarMembros(texto) {
    return texto
        .split(/_{5,}\s*\{§\}\s*_{5,}/g)
        .map(bloco => bloco.trim())
        .filter(bloco => bloco.length > 0);
}

// ======================================================
// 🏅 RANKING
// ======================================================

function ordenarRanking(ranking) {
    return ranking.sort((a, b) => b.pontos - a.pontos);
}

function obterMedalha(posicao) {
    const medalhas = {
        1: "🥇",
        2: "🥈",
        3: "🥉"
    };

    return medalhas[posicao] || "";
}

// ======================================================
// 📱 RELATÓRIO WHATSAPP
// ======================================================

function gerarRelatorioWhatsapp(ranking, total) {
    let relatorio = "🌹 *Pontuação dos Membros*\n\n";

    let posicao = 0;
    let pontuacaoAnterior = null;

    ranking.forEach((membro, index) => {
        // Membros empatados compartilham a mesma posição.
        if (membro.pontos !== pontuacaoAnterior) {
            posicao = index + 1;
        }

        const medalha = obterMedalha(posicao);
        const prefixo = medalha ? `${medalha} ` : "";

        relatorio += `${prefixo}• ${membro.nome} = ${membro.pontos}\n`;

        pontuacaoAnterior = membro.pontos;
    });

    relatorio += `\n🏆 *Total Geral* = ${total}`;

    return relatorio;
}

// ======================================================
// 🚀 EVENTO PRINCIPAL
// ======================================================

btnCalcular.addEventListener("click", () => {
    const texto = textarea.value.trim();

    if (!texto) {
        mensagemEl.textContent = "Cole um relatório primeiro.";
        return;
    }

    const blocos = separarMembros(texto);

    const ranking = [];

    blocos.forEach(bloco => {
        const nome = extrairNome(bloco);

        // Ignora blocos que não possuem identificação de membro.
        if (!nome) return;

        const resultado = calcularMembro(bloco);

        ranking.push({
            nome,
            pontos: resultado.total,
            detalhes: resultado.detalhes
        });
    });

    if (ranking.length === 0) {
        pontuacaoEl.textContent = "0";
        resultadoWhatsapp.value = "";
        mensagemEl.textContent =
            "Nenhum membro válido foi encontrado no relatório.";

        return;
    }

    ordenarRanking(ranking);

    const total = ranking.reduce(
        (soma, membro) => soma + membro.pontos,
        0
    );

    const relatorio = gerarRelatorioWhatsapp(ranking, total);

    pontuacaoEl.textContent = total;
    resultadoWhatsapp.value = relatorio;

    mensagemEl.textContent =
        `Cálculo finalizado com sucesso. ${ranking.length} membro(s) contabilizado(s).`;
});

// ======================================================
// 🧹 LIMPAR
// ======================================================

btnLimpar.addEventListener("click", () => {
    textarea.value = "";
    pontuacaoEl.textContent = "0";
    mensagemEl.textContent = "Aguardando cálculo...";
    resultadoWhatsapp.value = "";
});
