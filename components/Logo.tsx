import Image from 'next/image'

const GOLD_TEXT = '#9D7133'
const GOLD = '#D6A865'

// Emblema oficial (circular, dourado, fundo transparente — recebido e
// recortado em 11/10/2026, substitui a ponte roxa antiga que ainda estava
// pendente de recolorir). É quadrado (1:1), não a ponte 4:3 de antes — o
// wordmark continua sendo TEXTO ao lado, não a imagem: num header de ~30-40px
// o emblema sozinho vira só um selo reconhecível (círculo+bandeiras), o nome
// por extenso só fica legível em texto renderizado por código.
export default function Logo({ size = 30, dark = false }: { size?: number; dark?: boolean }) {
  const emblemaSize = Math.round(size * 1.25)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.22) }}>
      <Image src="/logo-emblema.png" alt="" width={emblemaSize} height={emblemaSize} priority
        style={{ width: emblemaSize, height: emblemaSize, objectFit: 'contain', flexShrink: 0 }} />
      <span style={{ lineHeight: 1, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'block', fontSize: size * 0.52, fontWeight: 800, letterSpacing: size * 0.028, color: dark ? '#ffffff' : GOLD_TEXT }}>
          ATACADO
        </span>
        <span style={{ display: 'block', fontSize: size * 0.27, fontWeight: 700, letterSpacing: size * 0.083, color: GOLD, marginTop: size * 0.12 }}>
          NA FRONTEIRA
        </span>
      </span>
    </span>
  )
}
