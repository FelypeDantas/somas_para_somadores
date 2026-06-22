const resultadoWhatsapp = document.getElementById("resultadoWhatsapp");

// 🎭 CONFIG CENTRAL
const CONFIG = {
    EMOJIS: {
        "✅": 25,
        "☑️": 20,
        "✔️": 15,
        "✖️": -20,
        "❌": -35,
    },

    REGRAS_ESPECIAIS: [
        {
            nome: "Ficha",
            regex: /ficha[\s\S]*?(✅|✔️|✖️|❌)/gi,
            valores: { "✅": 0, "✔️": -5, "✖️": -15, "❌": -30 },
        },
        {
            nome: "Repasse",
            regex: /pontua[cç][aã]o.*?(✅|✔️|✖️|❌)/gi,
            valores: { "✅": 5, "✔️": 0, "✖️": -5, "❌": -10 },
        },
        {
            nome: "Educação",
            regex: /educada.*?(✅|✔️|✖️|❌)/gi,
            valores: { "✅": 0, "✔️": -5, "✖️": -15, "❌": -30 },
        },
    ],

    STATUS: [
        { key: "Teve →", val: 10, desc: "Teve lista" },
        { key: "Reserva assumiu →", val: 10, desc: "Reserva assumiu" },
        { key: "Não teve →", val: -50, desc: "Não teve lista" },
        { key: "Pausa Semanal", val: 0, desc: "Pausa semanal" },
    ]
};

// 🧾 UTIL
const EMOJI_REGEX = /(✅|☑️|✔️|✖️|❌)/;
const SPLIT_LINES = txt => txt.split("\n");
const isLinhaDia = linha => /\dª/.test(linha);

// 🔍 IGNORAR LINHAS DE INSTRUÇÃO
function isLinhaValida(linha) {
    if (!linha.match(EMOJI_REGEX)) return false;

    // ignora legendas tipo (✅ ✔️ ✖️❌)
    if (linha.includes("(") && linha.includes(")")) return false;

    // ignora linhas de título/pergunta
    if (linha.includes("↓")) return false;

    return true;
}

// 🧾 EXTRATO
function pushExtrato(arr, desc, val) {
    if (val !== 0) arr.push({ desc, val });
}

// 🧱 STATUS (SÓ SE TIVER RESPOSTA)
function calcularStatus(relatorio, extrato) {
    let total = 0;

    SPLIT_LINES(relatorio).forEach(linha => {
        if (!linha.includes("→")) return;

        const temMarcacao = linha.match(/(✅|✔️|☑️|❌|✖️)/g);
        if (!temMarcacao) return;

        CONFIG.STATUS.forEach(regra => {
            if (linha.includes(regra.key)) {
                total += regra.val;
                pushExtrato(extrato, regra.desc, regra.val);
            }
        });
    });

    return total;
}

// 🎭 CONTAGEM DE EMOJIS (SÓ EM LINHAS VÁLIDAS)
function contarEmojisValidos(relatorio) {
    const contagem = {};

    let textoLimpo = relatorio
        .replace(/\u00A0/g, " ")

        // ❌ remove legendas (ex: (✅ ✔️ ✖️ ❌))
        .replace(/\(.*?(✅|✔️|✖️|❌|☑️).*?\)/g, "")

        // ❌ remove perguntas com ↓
        .split("\n")
        .filter(linha => !linha.includes("↓"))

        // ❌ remove linhas de regras especiais
        .filter(linha => {
            return !CONFIG.REGRAS_ESPECIAIS.some(regra =>
                new RegExp(regra.regex).test(linha)
            );
        })

        .join("\n");

    const encontrados = textoLimpo.match(/✅|☑️|✔️|✖️|❌/g);

    if (!encontrados) return contagem;

    encontrados.forEach(e => {
        contagem[e] = (contagem[e] || 0) + 1;
    });

    return contagem;
}

function calcularADMFixo(relatorio, extrato) {
    const linhas = SPLIT_LINES(relatorio);

    const teveAtividade = linhas.some(linha => {
        return /\dª/.test(linha) && linha.match(/✅|☑️|✔️|✖️|❌/);
    });

    if (teveAtividade) {
        pushExtrato(extrato, "ADM Fixo", 25);
        return 25;
    }

    return 0;
}

function calcularObraExtra(relatorio, extrato) {
    const texto = relatorio.toLowerCase();

    // pega só o bloco da obra extra
    const match = texto.match(/como foi a liberação da obra extra\?([\s\S]*)/i);
    if (!match) return 0;

    const bloco = match[1];

    // 🚀 cada regra direta (linha + seta + emoji)

    if (/colocou certo\s*→\s*✅/.test(bloco)) {
        pushExtrato(extrato, "Obra extra correta", 20);
        return 20;
    }

    if (/não colocou nenhuma\s*→\s*(❎|✖️|❌)/.test(bloco)) {
        pushExtrato(extrato, "Obra extra não enviada", -30);
        return -30;
    }

    if (/marcou.*→\s*(✖️|❌)/.test(bloco)) {
        pushExtrato(extrato, "Obra extra incorreta", -30);
        return -30;
    }

    if (/dispensado.*→\s*(✅|✔️|☑️)?/.test(bloco)) {
        pushExtrato(extrato, "Obra extra dispensada", 0);
        return 0;
    }

    return 0;
}

// 🧠 CORE
function calcularADM(relatorio) {

    let total = 0;
    const extrato = [];

    // 🧹 NORMALIZAÇÃO
    const linhas = relatorio
        .replace(/\u00A0/g, " ")
        .replace(/\r/g, "")
        .split("\n")
        .map(l => l.trim());

    // 🎯 HELPERS
    const add = (desc, val) => {
        total += val;

        if (val !== 0) {
            extrato.push({ desc, val });
        }
    };

    const temEmoji = linha =>
        /✅|☑️|✔️|✖️|❌/.test(linha);

    const contarEmoji = (linha, emoji) =>
        (linha.match(new RegExp(emoji, "g")) || []).length;

    // =========================================================
    // 🔹 STATUS
    // =========================================================

    linhas.forEach(linha => {

        if (!linha.includes("→") || !temEmoji(linha)) {
            return;
        }

        CONFIG.STATUS.forEach(status => {

            if (linha.includes(status.key)) {
                add(status.desc, status.val);
            }

        });

    });

    // =========================================================
    // 🔹 ADM FIXO
    // =========================================================

    const teveAtividade = linhas.some(linha => {
        return /\dª/.test(linha) && temEmoji(linha);
    });

    if (teveAtividade) {
        add("ADM Fixo", 25);
    }

    // =========================================================
    // 🔹 REGRAS ESPECIAIS
    // =========================================================

    CONFIG.REGRAS_ESPECIAIS.forEach(regra => {

        const matches = [...relatorio.matchAll(regra.regex)];

        matches.forEach(match => {

            const emoji = match[1];

            if (!emoji) return;

            const valor = regra.valores[emoji] || 0;

            add(`${regra.nome} (${emoji})`, valor);

        });

    });

    // =========================================================
    // 🔹 FILTRAR LINHAS PARA CONTAGEM DE EMOJIS
    // =========================================================

    const linhasValidas = linhas.filter(linha => {

        const l = linha.toLowerCase();

        // remove linhas vazias
        if (!l.trim()) return false;

        // remove instruções
        if (l.includes("↓")) return false;

        // remove legendas
        if (/\([^\)]*(✅|✔️|✖️|❌|☑️)[^\)]*\)/.test(l)) {
            return false;
        }

        // remove regras próprias
        const bloqueadas = [
            "pontuação foi enviada",
            "educada e respeitosa",
            "enquete foi feita",
            "reserva assumiu",
            "adm reserva no fixo",
            "colocou certo",
            "não colocou nenhuma",
            "marcou x e colocou y",
            "dispensado de colocar",
            "teve →",
            "não teve →",
        ];

        if (bloqueadas.some(txt => l.includes(txt))) {
            return false;
        }

        // só linhas de dias
        return /\dª/.test(l);

    });

    // =========================================================
    // 🔹 CONTAGEM DE EMOJIS
    // =========================================================

    const contagem = {
        "✅": 0,
        "☑️": 0,
        "✔️": 0,
        "✖️": 0,
        "❌": 0,
    };

    linhasValidas.forEach(linha => {

        Object.keys(contagem).forEach(emoji => {

            contagem[emoji] += contarEmoji(linha, emoji);

        });

    });

    Object.entries(CONFIG.EMOJIS).forEach(([emoji, valor]) => {

        const qtd = contagem[emoji];

        if (!qtd) return;

        add(`Emojis ${emoji} x${qtd}`, qtd * valor);

    });

    // =========================================================
    // 🔹 MEMBROS
    // =========================================================

    if (relatorio.includes("(X) Sim! Com lista de espera")) {
        add("Lista de espera", 10);
    }

    if (relatorio.includes("(X) Não! Ainda")) {
        add("Grupo incompleto", -10);
    }

    // =========================================================
    // 🔹 OBRA EXTRA
    // =========================================================

    const obra = relatorio.toLowerCase();

    if (/colocou certo\s*→\s*✅/.test(obra)) {

        add("Obra extra correta", 20);

    } else if (/não colocou nenhuma\s*→\s*(❎|✖️|❌)/.test(obra)) {

        add("Obra extra não enviada", -30);

    } else if (/marcou.*→\s*(✖️|❌)/.test(obra)) {

        add("Obra extra incorreta", -30);

    }

    // =========================================================
    // ✅ RESULTADO
    // =========================================================

    return {
        total,
        extrato
    };
}

// 🎯 FEEDBACK
function gerarMensagem(pontos) {
    if (pontos >= 150) return "🏆 DOMINOU o sistema.";
    if (pontos >= 80) return "🌹 Forte desempenho.";
    if (pontos >= 30) return "⚠️ Instável, mas funcional.";
    return "💀 Colapso administrativo detectado.";
}

// 📊 UI
function renderExtrato(lista) {
    return lista.map(({ desc, val }) => {
        const cor = val >= 0 ? "#4caf50" : "#ff4d4d";
        const sinal = val > 0 ? "+" : "";
        return `<div style="color:${cor}">${desc}: ${sinal}${val}</div>`;
    }).join("");
}

function destacarErros(texto) {
    return texto
        .replace(/❌|✖️/g, m => `<span style="color:#ff4d4d;font-weight:bold">${m}</span>`)
        .replace(/✔️/g, m => `<span style="color:#ffa500">${m}</span>`)
        .replace(/✅/g, m => `<span style="color:#4caf50">${m}</span>`);
}

// 🎮 EVENTOS
const el = id => document.getElementById(id);

el("calcular").onclick = () => {
    const texto = el("relatorio").value.trim();

    if (!texto) {
        alert("Cole um relatório 👀");
        return;
    }

    const { total, extrato } = calcularADM(texto);

    el("pontuacao").textContent = total;

    el("mensagem").innerHTML = `
    ${gerarMensagem(total)}
    <hr>
    <strong>📊 Extrato:</strong>
    ${renderExtrato(extrato)}
    <hr>
    <strong>📄 Análise:</strong>
    <div style="max-height:150px;overflow:auto;background:#111;padding:10px;border-radius:8px">
      ${destacarErros(texto)}
    </div>
  `;
};

el("limpar").onclick = () => {
    el("relatorio").value = "";
    el("pontuacao").textContent = "0";
    el("mensagem").textContent = "Aguardando cálculo...";
};
