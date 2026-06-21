const btnCalcular = document.getElementById("calcular");
const btnLimpar = document.getElementById("limpar");
const textarea = document.getElementById("relatorio");
const pontuacaoEl = document.getElementById("pontuacao");
const mensagemEl = document.getElementById("mensagem");
const resultadoWhatsapp = document.getElementById("resultadoWhatsapp");

// 🎯 CONFIG CENTRAL (fácil de manter e alterar)
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
        ruim: -15
    }
};

// 🧠 UTIL
function extrairNumero(regex, texto) {
    const match = texto.match(regex);
    return match ? parseInt(match[1]) : 0;
}

// 🔥 OBRA EXTRA
function calcularObraExtra(texto) {
    let pontos = 0;

    if (/Obrigatória→\s*🔖/i.test(texto)) pontos += 50;
    if (/Obrigatória→\s*🏷️/i.test(texto)) pontos -= 50;
    if (/Não obrigatória→\s*🔖/i.test(texto)) pontos += 70;

    return pontos;
}

function extrairNome(textoMembro) {
    const match = textoMembro.match(/💮\s*([^\n*]+)/);

    if (match) {
        return match[1].trim();
    }

    return "Membro sem nome";
}

// 📖 LEITURA (IGNORA PARÊNTESES E EMOJIS INVÁLIDOS)
function calcularLeitura(texto) {
    let pontos = 0;

    // 🔍 pega SOMENTE a seção de leitura
    const match = texto.match(/Como foi sua leitura[\s\S]*?\+/i);

    if (!match) return 0;

    let trechoLeitura = match[0];

    // remove parênteses
    trechoLeitura = trechoLeitura.replace(/\([^)]*\)/g, "");

    const mapa = {
        "✅": 20,
        "✔️": 15,
        "✖️": 10,
        "❌": -20
    };

    Object.entries(mapa).forEach(([emoji, valor]) => {
        const regex = new RegExp(emoji, "g");
        const qtd = (trechoLeitura.match(regex) || []).length;
        pontos += qtd * valor;
    });

    return pontos;
}

// 💬 FEEDBACKS
function calcularFeedbacks(texto) {
    let pontos = 0;

    pontos += extrairNumero(/excelente:\s*(\d+)/i, texto) * CONFIG.FEEDBACK.excelente;
    pontos += extrairNumero(/bom:\s*(\d+)/i, texto) * CONFIG.FEEDBACK.bom;
    pontos += extrairNumero(/ruim:\s*(\d+)/i, texto) * CONFIG.FEEDBACK.ruim;

    return pontos;
}

// ❌ NÃO FEZ
function calcularNaoFez(texto) {
    const quantidade = extrairNumero(/não fez.*?(\d+)/i, texto);
    return quantidade * -5;
}

// 💬 COMENTÁRIOS
function calcularComentarios(texto) {
    const comentarios = extrairNumero(/Comentários=\s*(\d+)/i, texto);
    return Math.floor(comentarios / 5) * 10;
}

// 📚 CAPÍTULOS
function calcularCapitulos(texto) {
    const capitulos = extrairNumero(/Capítulos lidos=\s*(\d+)/i, texto);
    return capitulos * 50;
}

// 🧮 CALCULAR MEMBRO
function calcularMembro(textoMembro) {
    let pontos = 0;

    pontos += calcularObraExtra(textoMembro);
    pontos += calcularLeitura(textoMembro);
    pontos += calcularFeedbacks(textoMembro);
    pontos += calcularNaoFez(textoMembro);
    pontos += calcularComentarios(textoMembro);
    pontos += calcularCapitulos(textoMembro);

    return pontos;
}

// 🚀 EVENTO PRINCIPAL
btnCalcular.addEventListener("click", () => {
    const texto = textarea.value;

    if (!texto.trim()) {
        mensagemEl.textContent =
            "Cole um relatório primeiro.";
        return;
    }

    const membros =
        texto.split("_______________{§}_______________");

    let total = 0;

    let relatorioWhatsapp =
        "🌹 *Pontuação dos Membros*\n\n";

    membros.forEach((membro) => {
        const nome = extrairNome(membro);
        const pontos = calcularMembro(membro);

        total += pontos;

        relatorioWhatsapp +=
            `• ${nome} = ${pontos} \n`;
    });

    relatorioWhatsapp +=
        `\n🏆 Total Geral = ${total} `;

    pontuacaoEl.textContent = total;
    resultadoWhatsapp.value = relatorioWhatsapp;

    mensagemEl.textContent =
        "Cálculo finalizado com sucesso.";
});

// 🧹 LIMPAR
btnLimpar.addEventListener("click", () => {
    textarea.value = "";
    pontuacaoEl.textContent = "0";
    mensagemEl.textContent = "Aguardando cálculo...";
});
