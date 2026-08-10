#!/usr/bin/env python3
"""Importa catalogo completo de atacadoparaguai.com.py (WooCommerce Store API)
e substitui a tabela products do Supabase (projeto xjmapfpfgwoivlsalltb).
"""
import json
import os
import re
import time
import urllib.request

import requests

SOURCE = "https://atacadoparaguai.com.py/wp-json/wc/store/v1/products"

CATEGORIAS = {
    "saude": "b312ddca-570e-491d-a603-458b5640d16e",
    "peptideos": "8963c615-70d1-4345-9557-cedd01d438a5",
    "emagrecimento": "1ce16edd-13a1-430d-8880-8ab3bc33d15c",
    "hormonio": "6a22c104-fe8f-46d5-9566-2f038dbc5f17",
    "perfumes": "6b4952ac-e491-413b-8d29-742f78e8686c",
    "pods": "301ee6b0-b559-43cf-a959-2bffd63bfc07",
    "acessorios": "6934f25c-a6db-47fd-987f-8dd8b53c62a7",
}

EMAGRECIMENTO_KW = [
    "SEMAGLUTIDA", "OZEMPIC", "TIRZEPATIDA", "MOUNJARO", "RETATRUTIDE",
    "SLIMEX", "SAXENDA", "LIRAGLUTIDA", "TIRZEC", "WEGOVY",
]
HORMONIO_KW = [
    "TESTOSTERONA", "ENANTHATE", "ENANTATO", "DECANOATO", "TESTOBOLIN",
    "TRENBOLONA", "STANOZOLOL", "OXANDROLONA", "PRIMOBOLAN", "SUSTANON",
    "DECA-DURABOLIN", "DECA DURABOLIN", "BOLDENONA", "NANDROLONA",
    "MASTERON", "DROSTANOLONE", "LANDERLAN",
]
POD_CAT_NAMES = {"Pods", "Descartável", "Pod system", "Pod/Mod", "Vape", "Nic Salt"}
GENERIC_BRAND_WORDS = {"EDP", "BODY", "PERFUME", "SPLASH", "COLONIA", "KIT"}


def fetch_all_products():
    all_products = []
    page = 1
    while True:
        url = f"{SOURCE}?per_page=100&page={page}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read())
        if not data:
            break
        all_products.extend(data)
        if len(data) < 100:
            break
        page += 1
        time.sleep(0.2)
    return all_products


def detect_categoria(p):
    cat_names = {c["name"] for c in (p.get("categories") or [])}
    name_up = p["name"].upper()

    if "Perfumes" in cat_names:
        return CATEGORIAS["perfumes"]
    if cat_names & POD_CAT_NAMES:
        return CATEGORIAS["pods"]
    if "Acessórios" in cat_names or "Eletrônicos" in cat_names:
        return CATEGORIAS["acessorios"]

    if any(kw in name_up for kw in EMAGRECIMENTO_KW):
        return CATEGORIAS["emagrecimento"]
    if any(kw in name_up for kw in HORMONIO_KW):
        return CATEGORIAS["hormonio"]
    if "Peptídeos" in cat_names:
        return CATEGORIAS["peptideos"]
    if "PERFUM" in name_up or "BODY SPLASH" in name_up or "EDP " in name_up:
        return CATEGORIAS["perfumes"]
    if "POD" in name_up.split() or "VAPE" in name_up:
        return CATEGORIAS["pods"]
    # fallback: maioria dos itens sem categoria no site fonte sao peptideos/farmaceuticos
    return CATEGORIAS["peptideos"]


BRAND_ALIASES = {
    "BIOGENISES": "BIOGENESIS",
    "OXYGEN KW PHAMA": "OXYGEN",
    "THERA GENETICS": "THERA",
    "PODS": "POD",
}

# O site fonte deixa `brands` vazio na maioria dos itens. Sem isso a 1a palavra do
# nome vira "marca" e gera lixo (POD, AL, PHARMA, AGUA, 04...). Estas regras casam
# o nome do produto com a marca real; a primeira que bater vence.
BRAND_BY_NAME = [
    ("JUUL", "JUUL"),
    ("LATTAFA", "LATTAFA"),
    ("AL HARAMAIN", "AL HARAMAIN"),
    ("POD ELFBAR", "ELFBAR"),
    ("POD IGNITE", "IGNITE"),
    ("POD LOST MARY", "LOST MARY"),
    ("POD NIKBAR", "NIKBAR"),
    ("POD OXBAR", "OXBAR"),
    ("POD SYSTEM VAPORESSO", "VAPORESSO"),
    ("POD THE BLACK SHEEP", "THE BLACK SHEEP"),
    ("CARTUCHO LIFE POD", "LIFE POD"),
    ("CARTUCHO VOOPOO", "VOOPOO"),
    ("COIL XROS", "VAPORESSO"),
    ("PHARMA ", "PHARMACOM"),
    ("AGUA BACTERIOSTATICA", "GENÉRICO"),
    ("VENTILADOR HAYATTECH", "HAYATTECH"),
    ("VENTILADOR", "GENÉRICO"),
    ("DRAGON ELITE", "DRAGON ELITE"),
    ("LANDERFIT", "LANDERLAN"),
    ("ORFOGLIP", "ETICOS"),
]

# Palavras que nunca são marca — se a heurística cair numa delas, marca fica genérica.
NOT_A_BRAND = {
    "POD", "PODS", "AL", "PHARMA", "AGUA", "CARTUCHO", "COIL", "VENTILADOR",
    "KIT", "LINE", "04", "02", "03",
}


def detect_brand(p):
    name_up = p["name"].upper()
    for needle, brand in BRAND_BY_NAME:
        if needle in name_up:
            return brand

    brands = p.get("brands") or []
    if brands:
        name = brands[0]["name"].strip().upper()
    else:
        words = re.sub(r"[^\w\s-]", " ", p["name"]).split()
        if not words:
            return "GENÉRICO"
        first = words[0].upper()
        name = words[1].upper() if first in GENERIC_BRAND_WORDS and len(words) > 1 else first
        if name in NOT_A_BRAND:
            return "GENÉRICO"
    return BRAND_ALIASES.get(name, name)


def clean_name(name):
    return (
        name.replace("&#8211;", "-")
        .replace("&#8217;", "'")
        .replace("&amp;", "&")
        .strip()
    )


def to_row(p):
    price = p.get("prices", {})
    minor = int(price.get("currency_minor_unit", 2))
    div = 10 ** minor
    regular = price.get("regular_price")
    sale = price.get("sale_price")
    usd_price = round(int(regular) / div, 2) if regular else 0
    usd_price_promo = (
        round(int(sale) / div, 2)
        if p.get("on_sale") and sale and sale != regular
        else None
    )
    images = [img["src"] for img in (p.get("images") or []) if img.get("src")]
    short_desc = re.sub("<[^<]+?>", "", p.get("short_description") or "").strip()
    return {
        "name": clean_name(p["name"]),
        "brand": detect_brand(p),
        "usd_price": usd_price,
        "usd_price_promo": usd_price_promo,
        "img_url": images[0] if images else None,
        "imagens": images,
        "descricao": short_desc,
        "descricao_curta": short_desc[:150] if short_desc else None,
        "sku": p.get("sku") or f"WC{p['id']}",
        "slug": p.get("slug"),
        "categoria_id": detect_categoria(p),
        "ativo": bool(p.get("is_in_stock")),
        "estoque": 999 if p.get("is_in_stock") else 0,
        "custom_fields": {},
    }


def main():
    supabase_url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    service_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    print("Buscando produtos de atacadoparaguai.com.py ...")
    products = fetch_all_products()
    print(f"Total encontrado: {len(products)}")

    rows = [to_row(p) for p in products]

    print("Apagando produtos antigos ...")
    r = requests.delete(
        f"{supabase_url}/rest/v1/products?id=not.is.null", headers=headers, timeout=30
    )
    r.raise_for_status()

    print("Inserindo produtos novos em lotes de 40 ...")
    for i in range(0, len(rows), 40):
        batch = rows[i : i + 40]
        r = requests.post(
            f"{supabase_url}/rest/v1/products", headers=headers, json=batch, timeout=30
        )
        if not r.ok:
            print("ERRO no lote", i, r.status_code, r.text[:500])
            r.raise_for_status()
        print(f"  lote {i}-{i+len(batch)} ok")

    print("Concluido.")


if __name__ == "__main__":
    main()
