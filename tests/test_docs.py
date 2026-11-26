import json
from pathlib import Path

import pytest


FRONT = Path(__file__).resolve().parents[1] / "front"
DADOS = json.loads((FRONT / "docs-dados.json").read_text(encoding="utf-8"))


def test_todas_as_questoes_tem_resposta_inicial_editavel():
    questoes = [questao for aula in DADOS["aulas"] for questao in aula["questoes"]]
    assert len(questoes) == 115
    assert all(isinstance(q.get("resposta_inicial"), str) and len(q["resposta_inicial"].strip()) >= 15 for q in questoes)

# Subitens identificados nos diagnósticos dos HTMLs oficiais, commit registrado no caderno.
SUBITENS_FONTE = {
    10: {13: "abc", 17: "abc", 23: "ab", 29: "abcd"},
    11: {9: "abc", 17: "abc", 22: "ab", 27: "abc"},
    12: {9: "abc", 15: "abcd", 19: "abcd", 23: "abcd", 27: "abc"},
    13: {9: "abc", 15: "abcd", 19: "abcd", 28: "abcd"},
}


@pytest.mark.parametrize("aula", DADOS["aulas"], ids=lambda aula: str(aula["numero"]))
def test_docs_cobre_subitens_da_fonte(aula):
    encontrados = {(questao["slide"], questao["item"]) for questao in aula["questoes"]}
    for slide, letras in SUBITENS_FONTE.get(aula["numero"], {}).items():
        for letra in letras:
            assert (slide, letra) in encontrados
    if aula["numero"] == 14:
        assert set(range(12, 22)).issubset({questao["slide"] for questao in aula["questoes"]})


def test_docs_ids_estaveis_unicos_e_referencias():
    questoes = [questao for aula in DADOS["aulas"] for questao in aula["questoes"]]
    assert len({questao["id"] for questao in questoes}) == len(questoes)
    assert all(questao["enunciado"].strip() and questao["referencia"].strip() for questao in questoes)
    assert len(DADOS["sha"]) == 40
    assert sum(aula["slides"] for aula in DADOS["aulas"]) == 269


def test_docs_nao_embute_dados_pessoais_ou_credenciais():
    for nome in ("docs.html", "docs.js", "docs-dados.json"):
        texto = (FRONT / nome).read_text(encoding="utf-8")
        assert "@gmail.com" not in texto
        assert "arn:aws:" not in texto
        assert "x-api-key" not in texto
    codigo = (FRONT / "docs.js").read_text(encoding="utf-8")
    assert "innerHTML" not in codigo
