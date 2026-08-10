#!/usr/bin/env python3
"""Gera ficha tecnica FACTUAL (sem alegacao terapeutica) para produtos sem descricao.
Deriva os dados do proprio nome do produto. Nao inventa indicacao, posologia nem beneficio:
boa parte do catalogo e medicamento tarjado / substancia controlada, cuja propaganda tem
regra propria e precisa de texto aprovado pelo cliente.
"""
import os
import re

import requests

UNID = {
    "VIALS": "vial(is)", "VIAL": "vial(is)", "PEN": "caneta(s)",
    "CAPSULE": "cápsulas", "CAPS": "cápsulas", "PUFFS": "puffs", "PCS": "peças",
}


def parse(name):
    d = {}
    m = re.search(r"\(([^)]+)\)", name)
    if m:
        d["composicao"] = m.group(1).strip().title()
    m = re.search(r"(\d+[.,]?\d*)\s*(MG|MCG|UI|IU)\b", name, re.I)
    if m:
        d["concentracao"] = f"{m.group(1).replace('.', ',')} {m.group(2).upper().replace('IU', 'UI')}"
    m = re.search(r"(\d+[.,]?\d*)\s*(ML|L)\b", name, re.I)
    if m:
        d["volume"] = f"{m.group(1).replace('.', ',')} {m.group(2).upper()}"
    m = re.search(r"(\d+)\s*(VIALS|VIAL|PEN|CAPSULE|CAPS|PUFFS|PCS)", name, re.I)
    if m:
        d["apresentacao"] = f"{int(m.group(1))} {UNID.get(m.group(2).upper(), m.group(2).lower())}"
    if re.search(r"\bEDP\b", name, re.I):
        d["tipo"] = "Eau de Parfum"
    return d


def build(name, brand):
    p = parse(name)
    ficha = []
    if brand and brand != "GENÉRICO":
        ficha.append(f"- **Marca:** {brand}")
    if p.get("composicao"):
        ficha.append(f"- **Composição:** {p['composicao']}")
    if p.get("concentracao"):
        ficha.append(f"- **Concentração:** {p['concentracao']}")
    if p.get("volume"):
        ficha.append(f"- **Volume:** {p['volume']}")
    if p.get("apresentacao"):
        ficha.append(f"- **Apresentação:** {p['apresentacao']}")
    if p.get("tipo"):
        ficha.append(f"- **Tipo:** {p['tipo']}")

    linhas = [f"**{name}**", ""]
    if ficha:
        linhas += ["## Ficha técnica", ""] + ficha + [""]
    linhas += [
        "## Condições de venda",
        "",
        "- Produto importado, disponível para atacado e varejo",
        "- Pagamento via PIX · retirada na loja em Ciudad del Este, Paraguai",
        "- Estoque sujeito a confirmação no momento do pedido",
    ]
    return "\n".join(linhas)


def curta(name, brand):
    p = parse(name)
    partes = [brand] if brand and brand != "GENÉRICO" else []
    if p.get("composicao"):
        partes.append(p["composicao"])
    for k in ("concentracao", "volume", "apresentacao"):
        if p.get(k):
            partes.append(p[k])
    return " · ".join(partes)[:150] or name[:150]


def main():
    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    h = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}

    r = requests.get(
        f"{url}/rest/v1/products?select=id,name,brand&or=(descricao.is.null,descricao.eq.)&limit=1000",
        headers=h, timeout=30,
    )
    r.raise_for_status()
    prods = r.json()
    print(f"produtos sem descrição: {len(prods)}")

    for i, p in enumerate(prods, 1):
        payload = {
            "descricao": build(p["name"], p["brand"]),
            "descricao_curta": curta(p["name"], p["brand"]),
        }
        rr = requests.patch(
            f"{url}/rest/v1/products?id=eq.{p['id']}", headers=h, json=payload, timeout=30
        )
        if not rr.ok:
            print("ERRO", p["id"], rr.status_code, rr.text[:200])
            rr.raise_for_status()
        if i % 40 == 0:
            print(f"  {i}/{len(prods)}")
    print("concluído.")


if __name__ == "__main__":
    main()
