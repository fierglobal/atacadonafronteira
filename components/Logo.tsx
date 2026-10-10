import Image from 'next/image'

const GOLD_TEXT = '#9D7133'
const GOLD = '#D6A865'

// A arte oficial é empilhada (ponte sobre o wordmark, ~4:3). Num header de 64px
// ela renderizaria a ~57px de largura e o texto sumiria, então aqui a ponte vem
// da imagem e o wordmark é texto — nítido em qualquer tamanho e recolorível.
// A arte da ponte em si (logo-ponte.png/-dark.png) ainda é a original roxa —
// só o wordmark migrou pro dourado (comunicação visual "branco e dourado",
// 09/10/2026); recolorir a ponte é tarefa separada de geração de imagem.
export default function Logo({ size = 30, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.26) }}>
      <Image src={dark ? '/logo-ponte-dark.png' : '/logo-ponte.png'} alt="" width={Math.round(size * 2.03)} height={size} priority
        style={{ width: Math.round(size * 2.03), height: size, objectFit: 'contain' }} />
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
