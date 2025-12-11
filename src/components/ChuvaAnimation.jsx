import { Droplet } from 'lucide-react'

export default function ChuvaAnimation() {
  // Cria 15 colunas de gotas caindo
  const columns = Array.from({ length: 20 }, (_, i) => i)

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {columns.map((col) => (
        <div
          key={col}
          className="absolute top-0 animate-fall opacity-60"
          style={{
            left: `${(col / 15) * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${3 + Math.random() * 2}s`
          }}
        >
          <Droplet 
            size={16} 
            className="text-cyan-300"
            fill="currentColor"
          />
        </div>
      ))}
      
      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-20px);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.3;
          }
          100% {
            transform: translateY(100vh);
            opacity: 0;
          }
        }
        
        .animate-fall {
          animation: fall 4s linear infinite;
        }
      `}</style>
    </div>
  )
}
