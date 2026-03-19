const { spawn, exec } = require("child_process");
const io = require("socket.io-client");
const net = require("net");

// ===== CONFIGURAÇÕES =====
const SERVER_URL = "http://172.16.113.112:3001";
const ROOM = "01700";
const VIDEO_PATH = "C:\\Users\\user1\\Desktop\\teste\\MALDITO.mp4";
const VLC_PATH = "C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe";
const VLC_HOST = "127.0.0.1";
const VLC_PORT = 4212;
const TEMPO_EXIBICAO = 10000;
// ==========================

let ultimaSenha = null;
let mostrandoPainel = false;

// ===== UTILITÁRIO =====
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== INICIAR VLC =====
function iniciarVLC() {
    console.log("🎬 Iniciando VLC...");
    spawn(VLC_PATH, [
        VIDEO_PATH,
        "--loop",
        "--fullscreen",
        "--extraintf", "rc",
        "--rc-host", `${VLC_HOST}:${VLC_PORT}`
    ]);
}

// ===== CONTROLE VLC =====
function enviarComandoVLC(comando) {
    const client = new net.Socket();
    client.connect(VLC_PORT, VLC_HOST, () => {
        client.write(comando + "\n");
        client.end();
    });
    client.on("error", (err) => console.log("Erro VLC:", err.message));
}

// ===== PAUSA FORÇADA =====
function pausarVLC() {
    console.log("⏸ Pausando vídeo (forçado)");
    enviarComandoVLC("set_pause 1");
}

// ===== PLAY FORÇADO =====
function continuarVLC() {
    console.log("▶ Retomando vídeo (forçado)");
    enviarComandoVLC("set_pause 0");
}

// ===== MINIMIZAR VLC =====
function minimizarVLC() {
    return new Promise((resolve) => {
        enviarComandoVLC("fullscreen"); // sai do fullscreen
        setTimeout(() => {
            exec(`nircmd win min process "vlc.exe"`, (err) => {
                if (err) console.log("Erro minimizar VLC:", err.message);
                else console.log("🔽 VLC minimizado");
                resolve();
            });
        }, 300);
    });
}

// ===== RESTAURAR VLC =====
function restaurarVLC() {
    return new Promise((resolve) => {
        exec(`nircmd win max process "vlc.exe"`, (err) => {
            if (err) console.log("Erro restaurar VLC:", err.message);

            setTimeout(() => {
                exec(`nircmd win activate process "vlc.exe"`, (err2) => {
                    if (err2) console.log("Erro ativar VLC:", err2.message);

                    setTimeout(() => {
                        enviarComandoVLC("fullscreen"); // volta fullscreen
                        console.log("🔼 VLC restaurado");
                        resolve();
                    }, 200);
                });
            }, 200);
        });
    });
}

// ===== TRAZER PAINEL PARA FRENTE =====
function trazerPainelParaFrente() {
    return new Promise((resolve) => {
        exec(`nircmd win max process "msedge.exe"`, (err) => {
            if (err) console.log("Erro maximizar painel:", err.message);

            setTimeout(() => {
                exec(`nircmd win activate process "msedge.exe"`, (err2) => {
                    if (err2) console.log("Erro ativar painel:", err2.message);
                    else console.log("📋 Painel trazido para frente");
                    resolve();
                });
            }, 200);
        });
    });
}

// ===== MANDAR PAINEL PARA TRÁS =====
function mandarPainelParaTras() {
    return new Promise((resolve) => {
        exec(`nircmd win bottom process "msedge.exe"`, (err) => {
            if (err) console.log("Erro painel para trás:", err.message);
            else console.log("📋 Painel mandado para trás");
            resolve();
        });
    });
}

// ===== SOCKET.IO =====
function conectarSocket() {
    const socket = io.connect(SERVER_URL, {
        transports: ["websocket"],
        reconnection: true
    });

    socket.on("connect", () => {
        console.log("🔌 Conectado ao servidor");
        socket.emit("join", ROOM);
        console.log("🚪 Entrou na sala:", ROOM);
    });

    socket.on("senha", async (oData) => {
        console.log("📩 Evento senha:", oData);
        if (!oData || !oData.senha) return;

        const senhaAtual = String(oData.senha);

        if (senhaAtual !== ultimaSenha && !mostrandoPainel) {
            ultimaSenha = senhaAtual;
            mostrandoPainel = true;

            // 1. Pausa vídeo exatamente onde está
            pausarVLC();
            await sleep(500);

            // 2. Minimiza VLC
            await minimizarVLC();
            await sleep(300);

            // 3. Mostra painel
            await trazerPainelParaFrente();

            // 4. Aguarda tempo de exibição
            await sleep(TEMPO_EXIBICAO);

            // 5. Esconde painel
            await mandarPainelParaTras();
            await sleep(200);

            // 6. Restaura VLC
            await restaurarVLC();
            await sleep(300);

            // 7. Continua vídeo do mesmo ponto
            continuarVLC();

            mostrandoPainel = false;
        }
    });

    socket.on("connect_error", (err) => console.log("❌ Erro conexão:", err.message));
    socket.on("disconnect", () => console.log("⚠ Desconectado"));
}

// ===== INICIAR SISTEMA =====
console.log("🚀 Iniciando sistema em modo produção...");
setTimeout(() => {
    iniciarVLC();
    conectarSocket();
}, 3000);