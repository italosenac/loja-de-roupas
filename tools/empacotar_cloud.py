"""Monta o pacote das Lambdas sem incluir banco, credenciais ou dependências locais."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


def main():
    destino = Path(".backup-aws/2026-11-26/cloud-deploy.zip")
    arquivos = list(Path("cloud").glob("*.py"))
    arquivos += [Path("loja") / nome for nome in
                 ("__init__.py", "calculos.py", "carrinho.py", "produto.py", "promocao.py")]
    with ZipFile(destino, "w", ZIP_DEFLATED) as pacote:
        for arquivo in arquivos:
            pacote.write(arquivo, arquivo.as_posix())
    print(destino, destino.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
