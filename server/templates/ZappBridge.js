/**
 * ZappBridge - Ponte de Integração para Catracas
 * ZapFitness (c) 2025
 * 
 * Este script deve rodar no computador da recepção da academia.
 * Ele ouve os comandos do servidor e aciona a catraca local.
 */

const { io } = require("socket.io-client");
const { exec } = require("child_process");

// CONFIGURAÇÕES (Fornecidas pelo Painel ZapFitness)
const SERVER_URL = "https://api.zapp.fitness"; // Altere para a URL do seu servidor
const GATE_TOKEN = "SEU_TOKEN_AQUI"; // Pegue no painel administrativo
const TENANT_ID = "SEU_ID_DA_ACADEMIA"; // Pegue no painel administrativo

console.log("🚀 Iniciando ZappBridge...");

const socket = io(SERVER_URL, {
    transports: ["websocket"],
    reconnection: true
});

socket.on("connect", () => {
    console.log("✅ Conectado ao servidor ZapFitness");

    // Entrar na sala da academia usando o Token de Segurança (Multi-tenant)
    socket.emit("join_room", { room: TENANT_ID, token: GATE_TOKEN });
    console.log(`📡 Monitorando acessos para academia: ${TENANT_ID}`);
});

socket.on("gate:open", (data) => {
    console.log(`🔓 LIBERAÇÃO RECEBIDA: ${data.memberName}`);
    console.log(`⏰ Horário: ${new Date(data.timestamp).toLocaleString()}`);

    // EXEMPLO DE COMANDO FÍSICO (Para marcas que usam CMD/SDK)
    // Aqui você chama o executável da sua catraca ou aciona uma porta serial

    /* 
    exec("C:\\Catraca\\liberar.exe", (error) => {
        if (error) console.error("❌ Erro ao acionar hardware:", error);
    }); 
    */

    console.log("✨ Catraca acionada com sucesso!");
});

socket.on("gate:denied", (data) => {
    console.log(`⛔ ACESSO NEGADO: Motivo - ${data.reason}`);
});

socket.on("disconnect", () => {
    console.log("❌ Desconectado do servidor. Tentando reconectar...");
});

socket.on("connect_error", (error) => {
    console.error("⚠️ Erro de conexão:", error.message);
});
