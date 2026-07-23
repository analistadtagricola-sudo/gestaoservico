import React, { useState } from 'react';
import { 
  Sparkles, Download, Maximize2, Copy, Check, RefreshCw, Image as ImageIcon, 
  Layers, Frame as AspectRatioIcon, Zap, Clock, AlertCircle, X
} from 'lucide-react';
import { GeneratedImage, ImageModel, ImageResolution, AspectRatio } from '../types';

export const ImageGenView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedResolution, setSelectedResolution] = useState<ImageResolution>('2K');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('1:1');
  const [selectedModel, setSelectedModel] = useState<ImageModel>('gemini-3-pro-image');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const promptPresets = [
    'Retrato fotográfico ultra-realista de um leão majestoso ao pôr do sol, iluminação dramática, detalhes 4K',
    'Cidade futurista estilo Cyberpunk à noite com néons refletindo na chuva, detalhes arquitetônicos ricos',
    'Pintura em aquarela suave de um jardim japonês com cerejeiras em flor e ponte de madeira',
    'Renderização 3D isométrica minimalista de um escritório tecnológico aconchegante com plantas',
    'Ilustração conceitual de astronauta flutuando em galáxia espiral colorida, estelar e mágica',
  ];

  const handleGenerateImage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setErrorText(null);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model: selectedModel === 'gemini-3-pro-image' ? 'gemini-3-pro-image-preview' : 'imagen-3.0-generate-002',
          resolution: selectedResolution,
          aspectRatio: selectedAspectRatio,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar imagem.');
      }

      const newImage: GeneratedImage = {
        id: `img-${Date.now()}`,
        prompt: prompt.trim(),
        imageUrl: data.imageUrl,
        model: selectedModel,
        resolution: selectedResolution,
        aspectRatio: selectedAspectRatio,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        latencyMs: data.latencyMs,
      };

      setImages(prev => [newImage, ...prev]);
      setPreviewImage(newImage);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'Ocorreu um erro ao gerar a imagem. Verifique suas credenciais do Gemini.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadImage = (img: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = img.imageUrl;
    link.download = `gemini-studio-${img.resolution}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900 border border-purple-500/30 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Geração de Imagens de Alta Qualidade
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Powered by <span className="font-semibold text-purple-300">gemini-3-pro-image-preview</span> com suporte a tamanhos <strong className="text-pink-300">1K, 2K e 4K</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Control Panel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Form Side Controls */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            
            <form onSubmit={handleGenerateImage} className="space-y-6">
              
              {/* Prompt Textarea */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Descrição da Imagem (Prompt)
                </label>
                <textarea
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Descreva em detalhes o que você deseja criar... (ex: 'Um dragão cristalino sobre uma montanha nevada sob luar celestial')"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors resize-none"
                />
              </div>

              {/* Presets */}
              <div>
                <span className="block text-xs font-medium text-slate-400 mb-2">
                  Ideias de Prompts Rápidos:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {promptPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPrompt(preset)}
                      className="text-[11px] bg-slate-950 hover:bg-purple-950/50 text-slate-300 hover:text-purple-200 border border-slate-800 hover:border-purple-500/40 px-2.5 py-1 rounded-lg transition-all text-left"
                    >
                      {preset.substring(0, 38)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution Picker (1K, 2K, 4K) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                  <span>Resolução da Imagem (Tamanho)</span>
                  <span className="text-[10px] text-pink-400 font-normal">Requisito do Sistema</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['1K', '2K', '4K'] as ImageResolution[]).map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setSelectedResolution(res)}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                        selectedResolution === res
                          ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <span className="text-sm">{res}</span>
                      <span className="text-[9px] font-normal opacity-80">
                        {res === '1K' ? '1024 px' : res === '2K' ? '2048 px' : '3840 px Ultra'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Proporção (Aspect Ratio)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {(['1:1', '16:9', '9:16', '4:3', '3:4'] as AspectRatio[]).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setSelectedAspectRatio(ratio)}
                      className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                        selectedAspectRatio === ratio
                          ? 'bg-indigo-600 border-indigo-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Gerando Imagem {selectedResolution}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>Gerar Imagem ({selectedResolution})</span>
                  </>
                )}
              </button>

              {/* Error Message */}
              {errorText && (
                <div className="bg-red-950/60 border border-red-800 rounded-xl p-3 text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorText}</span>
                </div>
              )}
            </form>
          </div>

          {/* Gallery / Preview Display Side */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Active Preview Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[420px] flex flex-col justify-center items-center relative overflow-hidden">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin"></div>
                    <Sparkles className="w-6 h-6 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-200">Gerando sua arte em {selectedResolution}...</h4>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      O modelo <code className="text-purple-300">gemini-3-pro-image-preview</code> está renderizando os detalhes solicitados.
                    </p>
                  </div>
                </div>
              ) : previewImage ? (
                <div className="w-full space-y-4">
                  <div className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex justify-center items-center max-h-[500px]">
                    <img
                      src={previewImage.imageUrl}
                      alt={previewImage.prompt}
                      className="max-h-[500px] w-auto object-contain rounded-lg shadow-2xl"
                    />

                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 backdrop-blur p-1.5 rounded-xl border border-slate-700">
                      <button
                        onClick={() => handleDownloadImage(previewImage)}
                        className="p-2 text-slate-200 hover:text-white bg-slate-800 rounded-lg hover:bg-indigo-600 transition-colors"
                        title="Download imagem"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata Info */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-md">
                        {previewImage.resolution}
                      </span>
                      <span>Proporção: {previewImage.aspectRatio}</span>
                      <span className="text-slate-600">•</span>
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <Zap className="w-3 h-3" />
                        {previewImage.latencyMs}ms
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopyPrompt(previewImage.id, previewImage.prompt)}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      {copiedId === previewImage.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Prompt</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 text-slate-500 space-y-3">
                  <ImageIcon className="w-16 h-16 text-slate-700 mx-auto" />
                  <p className="text-sm">
                    Preencha a descrição ao lado e clique em <strong>Gerar Imagem</strong> para visualizar o resultado.
                  </p>
                </div>
              )}
            </div>

            {/* Gallery Grid */}
            {images.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Galeria de Imagens Criadas ({images.length})</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      onClick={() => setPreviewImage(img)}
                      className={`relative group rounded-xl overflow-hidden border cursor-pointer transition-all aspect-square bg-slate-900 ${
                        previewImage?.id === img.id
                          ? 'border-purple-500 ring-2 ring-purple-500/30'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <img
                        src={img.imageUrl}
                        alt={img.prompt}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                        <span className="text-[10px] font-bold text-pink-300 bg-slate-900/90 px-1.5 py-0.5 rounded w-fit">
                          {img.resolution}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
