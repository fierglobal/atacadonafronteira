// Mora separado de lib/categorias.ts de propósito: aquele importa supabaseAdmin
// (service role) e não pode ser importado por componente client. O menu mobile é
// client e precisa do slug — se ele importasse de lá, a chave de serviço iria
// junto para o bundle do navegador.
export function slugify(nome: string): string {
  return nome
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
