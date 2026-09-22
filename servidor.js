
import express from "express";

const app = express();
const PORT = 3000;

app.use(express.json());

const CAPACIDADE = 20;
const PRECO_PRIMEIRA_HORA = 10;
const PRECO_HORA_ADICIONAL = 5;

let proximoID = 1;
let VEICULOS = [];
let HISTORICO = [];

// Rota inicial
app.get("/", (req, res) => {
    res.status(200).json({
        msg: "API funcionando"
    });
});

// Cadastrar veículo
app.post("/veiculos", (req, res) => {

    const { placa, modelo, cor } = req.body;

    if (![placa, modelo, cor].every(
        (campo) => typeof campo === "string" && campo.trim()
    )) {
        return res.status(400).json({
            msg: "Informe a placa, modelo e cor válidos"
        });
    }

    const placaNormalizada = placa.trim().toUpperCase();

    if (VEICULOS.length >= CAPACIDADE) {
        return res.status(409).json({
            msg: "Estacionamento lotado."
        });
    }

    if (VEICULOS.some((v) => v.placa === placaNormalizada)) {
        return res.status(409).json({
            msg: "Veículo já estacionado."
        });
    }

    const veiculo = {
        id: proximoID++,
        placa: placaNormalizada,
        modelo: modelo.trim(),
        cor: cor.trim(),
        entrada: new Date().toISOString()
    };

    VEICULOS.push(veiculo);

    return res.status(201).json({
        msg: "Entrada registrada",
        veiculo
    });
});

// Listar veículos estacionados
app.get("/veiculos", (req, res) => {

    res.status(200).json({
        total: VEICULOS.length,
        veiculos: VEICULOS
    });

});

// Buscar veículo pelo ID
app.get("/veiculos/:id", (req, res) => {

    const id = Number(req.params.id);

    const veiculo = VEICULOS.find((v) => v.id === id);

    if (!veiculo) {
        return res.status(404).json({
            msg: "Veículo não encontrado"
        });
    }

    return res.status(200).json(veiculo);
});

// Consultar vagas
app.get("/vagas", (req, res) => {

    res.status(200).json({
        capacidade: CAPACIDADE,
        ocupadas: VEICULOS.length,
        disponiveis: CAPACIDADE - VEICULOS.length
    });

});

// Função para calcular o valor
function calcularValor(entrada, saida = new Date()) {

    const inicio = new Date(entrada);

    const tempoMs = saida.getTime() - inicio.getTime();

    const horas = Math.max(
        1,
        Math.ceil(tempoMs / (1000 * 60 * 60))
    );

    const valor =
        PRECO_PRIMEIRA_HORA +
        (horas - 1) * PRECO_HORA_ADICIONAL;

    return {
        horasCobradas: horas,
        valor: valor
    };
}

// Consultar valor do estacionamento
app.get("/veiculos/:id/valor", (req, res) => {

    const id = Number(req.params.id);

    const veiculo = VEICULOS.find((v) => v.id === id);

    if (!veiculo) {
        return res.status(404).json({
            msg: "Veículo não encontrado"
        });
    }

    return res.status(200).json({
        placa: veiculo.placa,
        entrada: veiculo.entrada,
        ...calcularValor(veiculo.entrada)
    });

});

// Registrar saída do veículo
app.post("/veiculos/:id/saida", (req, res) => {

    const id = Number(req.params.id);

    const indice = VEICULOS.findIndex(
        (v) => v.id === id
    );

    if (indice === -1) {
        return res.status(404).json({
            msg: "Veículo não encontrado"
        });
    }

    const veiculo = VEICULOS[indice];
    const saida = new Date();
    const calculo = calcularValor(
        veiculo.entrada,
        saida
    );

    const registro = {
        ...veiculo,
        saida: saida.toISOString(),
        horasCobradas: calculo.horasCobradas,
        valorPago: calculo.valor
    };

    HISTORICO.push(registro);

    VEICULOS.splice(indice, 1);

    return res.status(200).json({
        msg: "Saída registrada com sucesso",
        registro
    });

});

// Atualizar veículo
app.put("/veiculos/:id", (req, res) => {

    const id = Number(req.params.id);

    const veiculo = VEICULOS.find(
        (v) => v.id === id
    );

    if (!veiculo) {
        return res.status(404).json({
            msg: "Veículo não encontrado"
        });
    }

    const { placa, modelo, cor } = req.body;

    if (![placa, modelo, cor].every(
        (campo) => typeof campo === "string" && campo.trim()
    )) {
        return res.status(400).json({
            msg: "Informe placa, modelo e cor válidos"
        });
    }

    const novaPlaca = placa.trim().toUpperCase();

    const placaExiste = VEICULOS.some(
        (v) => v.placa === novaPlaca && v.id !== id
    );

    if (placaExiste) {
        return res.status(409).json({
            msg: "Placa já cadastrada"
        });
    }

    veiculo.placa = novaPlaca;
    veiculo.modelo = modelo.trim();
    veiculo.cor = cor.trim();

    return res.status(200).json({
        msg: "Veículo atualizado com sucesso",
        veiculo
    });

});

// Histórico de saídas
app.get("/historico", (req, res) => {

    return res.status(200).json({
        total: HISTORICO.length,
        historico: HISTORICO
    });

});

// Faturamento
app.get("/faturamento", (req, res) => {

    const faturamento = HISTORICO.reduce(
        (total, item) => total + item.valorPago,
        0
    );

    return res.status(200).json({
        veiculosEstacionados: VEICULOS.length,
        vagasDisponiveis: CAPACIDADE - VEICULOS.length,
        saidasRealizadas: HISTORICO.length,
        faturamento: Number(faturamento.toFixed(2))
    });

});

// Iniciar servidor
app.listen(PORT, () => {

    console.log(
        `Servidor rodando em http://localhost:${PORT}`
    );

});

