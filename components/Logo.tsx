import Image from 'next/image'

const ROXO = '#420E76'
const AMARELO = '#F6BD0C'

// A arte oficial é empilhada (ponte sobre o wordmark, ~4:3). Num header de 64px
// ela renderizaria a ~57px de largura e o texto sumiria, então aqui a ponte vem
// da imagem e o wordmark é texto — nítido em qualquer tamanho e recolorível.
// Em fundo escuro o roxo #420E76 da ponte some contra o preto, por isso a
// variante dark tem o roxo clareado para #A965ED.
export default function Logo({ size = 30, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.26) }}>
      <Image src={dark ? '/logo-ponte-dark.png' : '/logo-ponte.png'} alt="" width={Math.round(size * 2.03)} height={size} priority
        style={{ width: Math.round(size * 2.03), height: size, objectFit: 'contain' }} />
      <span style={{ lineHeight: 1, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'block', fontSize: size * 0.52, fontWeight: 800, letterSpacing: size * 0.028, color: dark ? '#ffffff' : ROXO }}>
          ATACADO
        </span>
        <span style={{ display: 'block', fontSize: size * 0.27, fontWeight: 700, letterSpacing: size * 0.083, color: AMARELO, marginTop: size * 0.12 }}>
          NA FRONTEIRA
        </span>
      </span>
    </span>
  )
}
