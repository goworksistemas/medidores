import { Zap } from 'lucide-react'

export default function RaiosAnimation() {
  // Cria 12 colunas de raios caindo
  const columns = Array.from({ length: 20 }, (_, i) => i)

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {columns.map((col) => (
        <div
          key={col}
          className="absolute top-0 animate-fall-lightning opacity-70"
          style={{
            left: `${(col / 12) * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${3.5 + Math.random() * 2.5}s`
          }}
        >
          <Zap 
            size={18} 
            className="text-white-300"
            fill="currentColor"
          />
        </div>
      ))}
      
      <style jsx>{`
        @keyframes fall-lightning {
          0% {
            transform: translateY(-20px);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          50% {
            opacity: 0.4;
          }
          60% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.3;
          }
          100% {
            transform: translateY(100vh);
            opacity: 0;
          }
        }
        
        .animate-fall-lightning {
          animation: fall-lightning 3s linear infinite;
        }
      `}</style>
    </div>
  )
}
