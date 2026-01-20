import { Link, useNavigate } from 'react-router-dom';
import { QrCode, List } from 'lucide-react';
import Logo from '../assets/Logotipo sistemas .svg';

export default function OpcaoEntrada() {
  const navigate = useNavigate();

  const handleScanClick = () => {
    // Navigate to the Leitura page and trigger the scanner
    navigate('/leitura?scan=true');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-8 sm:pt-12 p-4">
      <div className="text-center mb-8 sm:mb-12">
        <div className="flex justify-center mb-2">
          <img src={Logo} alt="MeasureGo Logo" className="w-60 h-60 object-contain" />
        </div>
        <h2 className="text-4xl font-bold text-gray-800 mb-2">Iniciar Leitura</h2>
        <p className="text-lg text-gray-600">Como você prefere identificar o medidor?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Opção 1: Escanear QR Code */}
        <button
          onClick={handleScanClick}
          className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 hover:border-blue-500 hover:shadow-2xl transition-all transform hover:-translate-y-2 group text-center"
        >
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-4 rounded-full">
              <QrCode className="w-12 h-12 text-blue-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Escanear QR Code</h2>
          <p className="text-gray-600">Rápido e automático. Aponte a câmera para o código no medidor.</p>
        </button>

        {/* Opção 2: Seleção Manual */}
        <Link
          to="/leitura"
          className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 hover:border-teal-500 hover:shadow-2xl transition-all transform hover:-translate-y-2 group text-center block"
        >
          <div className="flex justify-center mb-4">
            <div className="bg-teal-100 p-4 rounded-full">
              <List className="w-12 h-12 text-teal-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Seleção Manual</h2>
          <p className="text-gray-600">Escolha a unidade, andar e medidor a partir das listas.</p>
        </Link>
      </div>
    </div>
  );
}
