#!/usr/bin/env python3
"""Baixa as imagens de produto hospedadas em atacadoparaguai.com.py (dominio do
cliente antigo) e republica no Supabase Storage (bucket `produtos`), atualizando
products.img_url e products.imagens. Evita perder o catalogo inteiro se o dominio
de origem sair do ar. Idempotente: pula o que ja aponta pro Storage.
"""
import os
import re
import sys
import time

import requests

BUCKET = "produtos"
PREFIX = "catalogo"


def tentar(fn, tentativas=3, espera=3):
    """Storage do Supabase estoura read timeout com alguma frequência; sem retry
    uma falha isolada derruba a migração inteira."""
    ultimo = None
    for n in range(tentativas):
        try:
            return fn()
        except Exception as e:  # noqa: BLE001
            ultimo = e
            if n < tentativas - 1:
                time.sleep(espera * (n + 1))
    raise ultimo


def slugify(s):
    s = re.sub(r"[^\w.-]+", "-", s)
    return re.sub(r"-{2,}", "-", s).strip("-").lower()[:120]


def payload_de(novas):
    return {"img_url": novas[0], "imagens": novas}


def main():
    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    h = {"apikey": key, "Authorization": f"Bearer {key}"}
    hj = {**h, "Content-Type": "application/json"}
    base_pub = f"{url}/storage/v1/object/public/{BUCKET}"

    r = requests.get(
        f"{url}/rest/v1/products?select=id,img_url,imagens&limit=1000", headers=h, timeout=30
    )
    r.raise_for_status()
    prods = r.json()

    migrados = pulados = falhas = 0
    for i, p in enumerate(prods, 1):
        originais = [u for u in ([p.get("img_url")] + (p.get("imagens") or [])) if u]
        if not originais:
            pulados += 1
            continue
        if all(url in u for u in originais):
            pulados += 1
            continue

        novas = []
        for u in originais:
            if url in u:
                novas.append(u)
                continue
            try:
                img = tentar(lambda: requests.get(
                    u, timeout=45, headers={"User-Agent": "Mozilla/5.0"}))
                img.raise_for_status()
            except Exception as e:  # noqa: BLE001
                print(f"  ! download falhou {u[:70]}: {e}", flush=True)
                novas.append(u)
                falhas += 1
                continue
            nome = slugify(u.rsplit("/", 1)[-1])
            path = f"{PREFIX}/{p['id']}/{nome}"
            try:
                up = tentar(lambda: requests.post(
                    f"{url}/storage/v1/object/{BUCKET}/{path}",
                    headers={**h, "Content-Type": img.headers.get("Content-Type", "image/webp"),
                             "x-upsert": "true"},
                    data=img.content, timeout=90,
                ))
            except Exception as e:  # noqa: BLE001
                print(f"  ! upload erro {path}: {e}", flush=True)
                novas.append(u)
                falhas += 1
                continue
            if not up.ok:
                print(f"  ! upload falhou {path}: {up.status_code} {up.text[:120]}", flush=True)
                novas.append(u)
                falhas += 1
                continue
            novas.append(f"{base_pub}/{path}")

        try:
            pr = tentar(lambda: requests.patch(
                f"{url}/rest/v1/products?id=eq.{p['id']}", headers=hj, json=payload_de(novas),
                timeout=30))
        except Exception as e:  # noqa: BLE001
            print(f"  ! patch erro {p['id']}: {e}", flush=True)
            falhas += 1
            continue
        if not pr.ok:
            print(f"  ! patch falhou {p['id']}: {pr.text[:150]}", flush=True)
            falhas += 1
            continue
        migrados += 1
        if i % 20 == 0:
            print(f"  {i}/{len(prods)} (migrados={migrados} falhas={falhas})", flush=True)

    print(f"FIM: migrados={migrados} pulados={pulados} falhas={falhas}")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
