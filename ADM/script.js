
const CONFIG = {
    EMOJIS: {
        "✅": 25,
        "☑️": 20,
        "✔️": 15,
        "✖️": -20,
        "❌": -35
    },

    CARGOS: {
        "ARC Carmesim": { fixa: 1000, aleatoria: 500 },
        "ARC Negro": { fixa: 500, aleatoria: 300 },
        "ARC Vermelho": { fixa: 300, aleatoria: 100 },
        "ARC Branco": { fixa: 100, aleatoria: 50 },
        "ARC Estagiário": { fixa: 50, aleatoria: 30 },

        "Líder de comitê": { fixa: 200, aleatoria: 100 },
        "Vice-líder": { fixa: 150, aleatoria: 50 },
        "Membro comum": { fixa: 10, aleatoria: 5 }
    },

    STATUS: {
        teve: 10,
        naoTeve: -50,
        pausa: 0,
        reserva: 0
    },

    REGRAS_ESPECIAIS: {
        ficha: {
            nome: "Ficha de conclusão",
            valores: {
                "✅": 0,
                "☑️": 0,
                "✔️": -5,
                "✖️": -15,
                "❌": -30
            }
        },

        repasse: {
            nome: "Repasse da pontuação",
            valores: {
                "✅": 5,
                "☑️": 5,
                "✔️": 0,
                "✖️": -5,
                "❌": -10
            }
        },

        educacao: {
            nome: "Educação e respeito",
            valores: {
                "✅": 0,
                "☑️": 0,
                "✔️": -5,
                "✖️": -15,
                "❌": -30
            }
        }
    },

    MEMBROS: {
        listaEspera: 10,
        semListaEspera: 0,
        incompleto: -10
    },

    OBRA_EXTRA: {
        correta: 20,
        incorreta: -30,
        naoEnviada: -30,
        dispensada: 0
    }
};

// =====================================================
// UTILITÁRIOS
// =====================================================

const EMOJI_PATTERN = /☑️|✅|✔️|✖️|❌/g;

function normalizar(texto) {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\u00A0/g, " ")
        .trim();
}

function obterLinhas(texto) {
    return texto
        .replace(/\r/g, "")
        .replace(/\u00A0/g, " ")
        .split("\n")
        .map(linha => linha.trim())
        .filter(Boolean);
}

function extrairEmoji(texto) {
    return texto.match(EMOJI_PATTERN) || [];
}

function contarEmoji(texto, emoji) {
    return extrairEmoji(texto)
        .filter(item => item === emoji)
        .length;
}

// =====================================================
// IDENTIFICAÇÃO DE CARGO
// =====================================================

function identificarCargo(texto) {
    const conteudo = normalizar(texto);

    const cargos = [
        ["ARC Carmesim", /arc\s+carmesim/],
        ["ARC Negro", /arc\s+negro/],
        ["ARC Vermelho", /arc\s+vermelho/],
        ["ARC Branco", /arc\s+branco/],
        ["ARC Estagiário", /arc\s+estagiario/],

        ["Líder de comitê", /(?:lider|líder)\s+(?:de\s+)?comite/],
        ["Vice-líder", /vice[\s-]*lider/],
        ["Membro comum", /membro\s+comum/]
    ];

    for (const [nome, regex] of cargos) {
        if (regex.test(conteudo)) {
            return nome;
        }
    }

    return null;
}

// =====================================================
// IDENTIFICAÇÃO DO TIPO DE LISTA
// =====================================================

function identificarTipoLista(texto) {
    const conteudo = normalizar(texto);

    const fixa = /\blista\s+fixa\b/.test(conteudo);
    const aleatoria = /\blista\s+aleatoria\b/.test(conteudo);

    if (fixa && !aleatoria) return "fixa";
    if (aleatoria && !fixa) return "aleatoria";

    return null;
}

// =====================================================
// IDENTIFICAÇÃO DE STATUS
// =====================================================

function identificarStatus(linhas) {
    for (const linha of linhas) {
        const l = normalizar(linha);

        if (/reserva\s+assumiu/.test(l)) {
            return "reserva";
        }

        if (/pausa\s+semanal/.test(l)) {
            return "pausa";
        }

        if (/nao\s+teve\s*(?:→|->)/.test(l) ||
            /nao\s+teve\s+lista/.test(l)) {
            return "naoTeve";
        }

        if (/teve\s*(?:→|->)/.test(l) ||
            /teve\s+lista\s+normalmente/.test(l)) {
            return "teve";
        }
    }

    return null;
}

// =====================================================
// REGRAS ESPECIAIS
// =====================================================

function calcularRegrasEspeciais(linhas, add) {
    const regras = [
        {
            chave: "ficha",
            regex: /ficha|conclusao/
        },
        {
            chave: "repasse",
            regex: /pontuacao|repasse/
        },
        {
            chave: "educacao",
            regex: /educada|respeitosa|educacao/
        }
    ];

    linhas.forEach(linha => {
        const l = normalizar(linha);

        for (const regra of regras) {
            if (!regra.regex.test(l)) continue;

            const emojis = extrairEmoji(linha);

            if (!emojis.length) continue;

            const configuracao =
                CONFIG.REGRAS_ESPECIAIS[regra.chave];

            const emoji = emojis[emojis.length - 1];

            const valor = configuracao.valores[emoji];

            if (valor !== undefined) {
                add(
                    `${configuracao.nome} (${emoji})`,
                    valor
                );
            }

            break;
        }
    });
}

// =====================================================
// CONTAGEM PADRÃO DOS EMOJIS
// =====================================================

function contarEmojisPadrao(linhas, add) {
    const contagem = {
        "✅": 0,
        "☑️": 0,
        "✔️": 0,
        "✖️": 0,
        "❌": 0
    };

    const palavrasEspeciais = [
        "ficha",
        "conclusao",
        "pontuacao",
        "repasse",
        "educada",
        "respeitosa",
        "educacao",
        "obra extra",
        "lista de espera",
        "grupo incompleto",
        "teve →",
        "nao teve →",
        "reserva assumiu",
        "pausa semanal"
    ];

    linhas.forEach(linha => {
        const l = normalizar(linha);

        // Somente linhas dos dias da semana.
        if (!/\d+\s*[ªº]/.test(l)) return;

        // Ignora instruções e legendas.
        if (l.includes("↓")) return;

        if (/\([^)]*(?:✅|☑️|✔️|✖️|❌)[^)]*\)/.test(linha)) {
            return;
        }

        // Evita contar exceções novamente.
        if (palavrasEspeciais.some(p => l.includes(p))) {
            return;
        }

        Object.keys(contagem).forEach(emoji => {
            contagem[emoji] += contarEmoji(linha, emoji);
        });
    });

    Object.entries(contagem).forEach(([emoji, quantidade]) => {
        if (!quantidade) return;

        const valor = CONFIG.EMOJIS[emoji] * quantidade;

        add(`Emojis ${emoji} x${quantidade}`, valor);
    });

    return contagem;
}

// =====================================================
// QUANTIDADE DE MEMBROS
// =====================================================

function calcularMembros(texto, add) {
    const conteudo = normalizar(texto);

    if (/grupo\s+incompleto/.test(conteudo) ||
        /\(x\)\s*nao!\s*ainda/.test(conteudo)) {

        add("Grupo incompleto", CONFIG.MEMBROS.incompleto);
        return;
    }

    if (/com\s+lista\s+de\s+espera/.test(conteudo) ||
        /\(x\)\s*sim!\s*com\s+lista\s+de\s+espera/.test(conteudo)) {

        add("Lista de espera", CONFIG.MEMBROS.listaEspera);
        return;
    }

    if (/sem\s+lista\s+de\s+espera/.test(conteudo)) {
        add("Sem lista de espera", CONFIG.MEMBROS.semListaEspera);
    }
}

// =====================================================
// OBRA EXTRA
// =====================================================

function calcularObraExtra(linhas, add) {
    const inicio = linhas.findIndex(linha =>
        normalizar(linha).includes("como foi a liberacao da obra extra")
    );

    if (inicio === -1) return;

    const bloco = linhas.slice(inicio + 1);
    const conteudo = normalizar(bloco.join("\n"));

    if (/dispensado(?:\s+de\s+colocar)?/.test(conteudo)) {
        add("Obra extra dispensada", CONFIG.OBRA_EXTRA.dispensada);
        return;
    }

    if (/nao\s+colocou\s+nenhuma|nao\s+colocou\s+nada/.test(conteudo)) {
        add("Obra extra não enviada", CONFIG.OBRA_EXTRA.naoEnviada);
        return;
    }

    if (/marcou.*colocou/.test(conteudo) &&
        /(?:✖️|❌)/.test(bloco.join("\n"))) {

        add("Obra extra incorreta", CONFIG.OBRA_EXTRA.incorreta);
        return;
    }

    if (/colocou\s+certo|colocou\s+corretamente/.test(conteudo) &&
        /(?:✅|☑️)/.test(bloco.join("\n"))) {

        add("Obra extra correta", CONFIG.OBRA_EXTRA.correta);
    }
}

// =====================================================
// MOTOR PRINCIPAL
// =====================================================

function calcularADM(relatorio) {
    const linhas = obterLinhas(relatorio);

    let total = 0;

    const extrato = [];
    const avisos = [];

    const add = (descricao, valor) => {
        total += valor;

        extrato.push({
            desc: descricao,
            val: valor
        });
    };

    // 1. Cargo e potencialização.
    const cargo = identificarCargo(relatorio);
    const tipoLista = identificarTipoLista(relatorio);

    let pontuacaoInicial = 0;

    if (cargo && tipoLista) {
        pontuacaoInicial = CONFIG.CARGOS[cargo][tipoLista];

        add(
            `Potencialização: ${cargo} (${tipoLista})`,
            pontuacaoInicial
        );

    } else {
        if (!cargo) {
            avisos.push("Cargo não identificado.");
        }

        if (!tipoLista) {
            avisos.push("Tipo de lista não identificado.");
        }
    }

    // 2. Status do ADM fixo.
    const status = identificarStatus(linhas);

    if (status === "teve") {
        add("Teve lista normalmente", CONFIG.STATUS.teve);

    } else if (status === "naoTeve") {
        add("Não teve lista", CONFIG.STATUS.naoTeve);

    } else if (status === "pausa") {
        add("Pausa semanal", CONFIG.STATUS.pausa);

    } else if (status === "reserva") {
        avisos.push(
            "Reserva assumiu: pontuação destinada ao reserva, não ao ADM fixo."
        );

    } else {
        avisos.push("Status do ADM não identificado.");
    }

    // 3. Regras especiais.
    calcularRegrasEspeciais(linhas, add);

    // 4. Emojis dos dias.
    const contagem = contarEmojisPadrao(linhas, add);

    // 5. Quantidade de membros.
    calcularMembros(relatorio, add);

    // 6. Obra extra.
    calcularObraExtra(linhas, add);

    return {
        total,
        extrato,
        avisos,
        cargo,
        tipoLista,
        status,
        pontuacaoInicial,
        contagem
    };
}

// =====================================================
// FEEDBACK
// =====================================================

function gerarMensagem(pontos) {
    if (pontos >= 150) return "🏆 DOMINOU o sistema.";
    if (pontos >= 80) return "🌹 Forte desempenho.";
    if (pontos >= 30) return "⚠️ Instável, mas funcional.";

    return "💀 Colapso administrativo detectado.";
}

// =====================================================
// SEGURANÇA E EXIBIÇÃO
// =====================================================

function escaparHTML(texto) {
    return String(texto).replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caractere]);
}

function renderExtrato(lista) {
    return lista.map(({ desc, val }) => {
        const cor = val >= 0 ? "#4caf50" : "#ff4d4d";
        const sinal = val > 0 ? "+" : "";

        return `
            <div style="color:${cor}">
                ${escaparHTML(desc)}: ${sinal}${val}
            </div>
        `;
    }).join("");
}

function destacarErros(texto) {
    let seguro = escaparHTML(texto);

    return seguro
        .replace(/❌|✖️/g,
            m => `<span style="color:#ff4d4d;font-weight:bold">${m}</span>`)
        .replace(/✔️/g,
            m => `<span style="color:#ffa500">${m}</span>`)
        .replace(/☑️|✅/g,
            m => `<span style="color:#4caf50">${m}</span>`);
}

// =====================================================
// EVENTOS
// =====================================================

const el = id => document.getElementById(id);

el("calcular").onclick = () => {
    const texto = el("relatorio").value.trim();

    if (!texto) {
        alert("Cole um relatório 👀");
        return;
    }

    const resultado = calcularADM(texto);

    el("pontuacao").textContent = resultado.total;

    const avisosHTML = resultado.avisos.length
        ? `
            <hr>
            <strong>⚠️ Avisos:</strong>
            ${resultado.avisos.map(aviso =>
                `<div>${escaparHTML(aviso)}</div>`
            ).join("")}
        `
        : "";

    el("mensagem").innerHTML = `
        ${gerarMensagem(resultado.total)}

        <hr>

        <strong>📊 Extrato:</strong>
        ${renderExtrato(resultado.extrato)}

        <hr>

        <strong>📋 Identificação:</strong>
        <div>Cargo: ${escaparHTML(resultado.cargo || "Não identificado")}</div>
        <div>Lista: ${escaparHTML(resultado.tipoLista || "Não identificada")}</div>
        <div>Status: ${escaparHTML(resultado.status || "Não identificado")}</div>

        ${avisosHTML}

        <hr>

        <strong>📄 Relatório analisado:</strong>
        <div style="
            max-height:150px;
            overflow:auto;
            background:#111;
            padding:10px;
            border-radius:8px;
            white-space:pre-wrap;
        ">${destacarErros(texto)}</div>
    `;
};

el("limpar").onclick = () => {
    el("relatorio").value = "";
    el("pontuacao").textContent = "0";
    el("mensagem").textContent = "Aguardando cálculo...";
};
