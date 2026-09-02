'use client'

export default function PrintButton() {
  return (
    <div className="no-print" style={{ marginTop: 32, textAlign: 'center' }}>
      <button onClick={() => window.print()} className="btn">Imprimir / Salvar PDF</button>
    </div>
  )
}
